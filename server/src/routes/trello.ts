import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { TrelloClient } from '../integrations/trello/client';

const TrelloAuthBody = z.union([
  z.object({ connectionId: z.string().min(1) }),
  z.object({ apiKey: z.string().min(1), token: z.string().min(1) }),
]);

async function resolveTrelloCreds(
  app: FastifyInstance,
  body: z.infer<typeof TrelloAuthBody>,
): Promise<{ apiKey: string; token: string }> {
  if ('connectionId' in body) {
    return app.getTrelloCredentials(body.connectionId);
  }
  return { apiKey: body.apiKey, token: body.token };
}

export async function registerTrelloRoutes(app: FastifyInstance) {
  app.get('/api/trello/boards', async (req) => {
    const query = z
      .object({
        connectionId: z.string().min(1),
      })
      .parse(req.query);

    const creds = await app.getTrelloCredentials(query.connectionId);
    const boards = await new TrelloClient(creds).listBoards();
    return boards.map((b) => ({ id: b.id, name: b.name }));
  });

  app.post('/api/trello/boards', async (req) => {
    const body = TrelloAuthBody.parse(req.body);
    const creds = await resolveTrelloCreds(app, body);
    const boards = await new TrelloClient(creds).listBoards();
    return boards.map((b) => ({ id: b.id, name: b.name }));
  });

  app.get('/api/trello/boards/:boardId/lists', async (req) => {
    const params = z.object({ boardId: z.string().min(1) }).parse(req.params);
    const query = z.object({ connectionId: z.string().min(1) }).parse(req.query);

    const creds = await app.getTrelloCredentials(query.connectionId);
    const lists = await new TrelloClient(creds).listLists(params.boardId);
    return lists.map((l) => ({ id: l.id, name: l.name }));
  });

  app.post('/api/trello/boards/:boardId/lists', async (req) => {
    const params = z.object({ boardId: z.string().min(1) }).parse(req.params);
    const body = TrelloAuthBody.parse(req.body);
    const creds = await resolveTrelloCreds(app, body);
    const lists = await new TrelloClient(creds).listLists(params.boardId);
    return lists.map((l) => ({ id: l.id, name: l.name }));
  });
}

