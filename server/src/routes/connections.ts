import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../db';
import { TrelloClient } from '../integrations/trello/client';
import { GitLabClient } from '../integrations/gitlab/client';

const TrelloCredentialsSchema = z.object({
  apiKey: z.string().min(1),
  token: z.string().min(1),
});

const GitLabCredentialsSchema = z.object({
  token: z.string().min(1),
});

export async function registerConnectionRoutes(app: FastifyInstance) {
  app.get('/api/connections', async () => {
    const items = await prisma.connectionProfile.findMany({ orderBy: { createdAt: 'desc' } });
    return items.map((c) => ({
      id: c.id,
      type: c.type,
      name: c.name,
      baseUrl: c.baseUrl,
      createdAt: c.createdAt.toISOString(),
    }));
  });

  app.post('/api/connections/trello/test', async (req) => {
    const body = TrelloCredentialsSchema.parse(req.body);
    const me = await new TrelloClient(body).testAuth();
    return { username: me.username, fullName: me.fullName };
  });

  app.post('/api/connections/gitlab/test', async (req) => {
    const body = z
      .object({
        baseUrl: z.string().url(),
        token: z.string().min(1),
      })
      .parse(req.body);
    const me = await new GitLabClient({ baseUrl: body.baseUrl, token: body.token }).testAuth();
    return { username: me.username, name: me.name };
  });

  app.post('/api/connections/trello', async (req) => {
    const body = z
      .object({
        name: z.string().min(1),
        apiKey: z.string().min(1),
        token: z.string().min(1),
      })
      .parse(req.body);

    const created = await prisma.connectionProfile.create({
      data: {
        type: 'trello',
        name: body.name,
        baseUrl: null,
        credentials: { apiKey: body.apiKey, token: body.token },
      },
      select: { id: true },
    });

    return created;
  });

  app.post('/api/connections/gitlab', async (req) => {
    const body = z
      .object({
        name: z.string().min(1),
        baseUrl: z.string().url(),
        token: z.string().min(1),
      })
      .parse(req.body);

    const created = await prisma.connectionProfile.create({
      data: {
        type: 'gitlab',
        name: body.name,
        baseUrl: body.baseUrl,
        credentials: { token: body.token },
      },
      select: { id: true },
    });

    return created;
  });

  app.decorate('getTrelloCredentials', async (connectionId: string) => {
    const c = await prisma.connectionProfile.findUnique({ where: { id: connectionId } });
    if (!c || c.type !== 'trello') throw app.httpErrors.notFound('Trello connection not found');
    return TrelloCredentialsSchema.parse(c.credentials);
  });

  app.decorate('getGitLabCredentials', async (connectionId: string) => {
    const c = await prisma.connectionProfile.findUnique({ where: { id: connectionId } });
    if (!c || c.type !== 'gitlab') throw app.httpErrors.notFound('GitLab connection not found');
    const creds = GitLabCredentialsSchema.parse(c.credentials);
    if (!c.baseUrl) throw app.httpErrors.badRequest('GitLab connection missing baseUrl');
    return { baseUrl: c.baseUrl, token: creds.token };
  });
}

declare module 'fastify' {
  interface FastifyInstance {
    getTrelloCredentials: (connectionId: string) => Promise<{ apiKey: string; token: string }>;
    getGitLabCredentials: (connectionId: string) => Promise<{ baseUrl: string; token: string }>;
  }
}

