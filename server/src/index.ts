import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import { ZodError } from 'zod';
import { registerConnectionRoutes } from './routes/connections';
import { registerTrelloRoutes } from './routes/trello';
import { registerGitLabRoutes } from './routes/gitlab';
import { registerRuleRoutes } from './routes/rules';
import { registerSyncRoutes } from './routes/sync';

const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? '127.0.0.1';

async function main() {
  const app = Fastify({
    logger: true,
  });

  await app.register(sensible);
  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof ZodError) {
      return reply.status(400).send({
        error: 'ValidationError',
        issues: err.issues,
      });
    }
    return reply.send(err);
  });

  app.get('/api/health', async () => {
    return { ok: true };
  });

  await registerConnectionRoutes(app);
  await registerTrelloRoutes(app);
  await registerGitLabRoutes(app);
  await registerRuleRoutes(app);
  await registerSyncRoutes(app);

  await app.listen({ port: PORT, host: HOST });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

