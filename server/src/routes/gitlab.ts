import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { GitLabClient } from '../integrations/gitlab/client';

const GitLabProjectsBody = z.union([
  z.object({
    connectionId: z.string().min(1),
    search: z.string().min(1),
  }),
  z.object({
    baseUrl: z.string().url(),
    token: z.string().min(1),
    search: z.string().min(1),
  }),
]);

async function resolveGitLabCreds(
  app: FastifyInstance,
  body: z.infer<typeof GitLabProjectsBody>,
): Promise<{ baseUrl: string; token: string }> {
  if ('connectionId' in body) {
    return app.getGitLabCredentials(body.connectionId);
  }
  return { baseUrl: body.baseUrl, token: body.token };
}

export async function registerGitLabRoutes(app: FastifyInstance) {
  app.get('/api/gitlab/projects', async (req) => {
    const query = z
      .object({
        connectionId: z.string().min(1),
        search: z.string().min(1),
      })
      .parse(req.query);

    const creds = await app.getGitLabCredentials(query.connectionId);
    const projects = await new GitLabClient(creds).searchProjects(query.search, 50);

    return projects.map((p) => ({
      id: p.id,
      name: p.name,
      path_with_namespace: p.path_with_namespace,
      web_url: p.web_url,
    }));
  });

  app.post('/api/gitlab/projects', async (req) => {
    const body = GitLabProjectsBody.parse(req.body);
    const creds = await resolveGitLabCreds(app, body);
    const projects = await new GitLabClient(creds).searchProjects(body.search, 50);
    return projects.map((p) => ({
      id: p.id,
      name: p.name,
      path_with_namespace: p.path_with_namespace,
      web_url: p.web_url,
    }));
  });
}

