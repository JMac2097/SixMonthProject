import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../db';
import { Prisma } from '@prisma/client';

const RuleCreateSchema = z.object({
  name: z.string().min(1),
  trelloConnectionId: z.string().min(1),
  trelloBoardId: z.string().min(1),
  trelloListIds: z.array(z.string().min(1)).min(1),
  trelloLabelIds: z.array(z.string().min(1)).optional(),
  gitlabConnectionId: z.string().min(1),
  gitlabProjectId: z.number().int().positive(),
  gitlabProjectPath: z.string().min(1).optional(),
  gitlabDefaultLabels: z.array(z.string()).default([]),
  titleTemplate: z.string().min(1),
  descriptionTemplate: z.string().min(1),
  includeTrelloLabels: z.boolean().default(true),
  fixedLabels: z.array(z.string()).default([]),
});

export async function registerRuleRoutes(app: FastifyInstance) {
  app.get('/api/rules', async () => {
    const rules = await prisma.rule.findMany({ orderBy: { updatedAt: 'desc' } });
    return rules.map((r) => ({
      id: r.id,
      name: r.name,
      trelloBoardId: r.trelloBoardId,
      trelloListIds: r.trelloListIds as unknown as string[],
      gitlabProjectId: r.gitlabProjectId,
      gitlabProjectPath: r.gitlabProjectPath,
      updatedAt: r.updatedAt.toISOString(),
    }));
  });

  app.post('/api/rules', async (req) => {
    const body = RuleCreateSchema.parse(req.body);
    const created = await prisma.rule.create({
      data: {
        name: body.name,
        trelloConnectionId: body.trelloConnectionId,
        trelloBoardId: body.trelloBoardId,
        trelloListIds: body.trelloListIds,
        trelloLabelIds: body.trelloLabelIds ?? Prisma.JsonNull,
        gitlabConnectionId: body.gitlabConnectionId,
        gitlabProjectId: body.gitlabProjectId,
        gitlabProjectPath: body.gitlabProjectPath ?? null,
        gitlabDefaultLabels: body.gitlabDefaultLabels,
        titleTemplate: body.titleTemplate,
        descriptionTemplate: body.descriptionTemplate,
        includeTrelloLabels: body.includeTrelloLabels,
        fixedLabels: body.fixedLabels,
      },
      select: { id: true },
    });
    return created;
  });

  app.get('/api/rules/:ruleId', async (req) => {
    const params = z.object({ ruleId: z.string().min(1) }).parse(req.params);
    const rule = await prisma.rule.findUnique({ where: { id: params.ruleId } });
    if (!rule) throw app.httpErrors.notFound('Rule not found');
    return {
      id: rule.id,
      name: rule.name,
      trelloConnectionId: rule.trelloConnectionId,
      trelloBoardId: rule.trelloBoardId,
      trelloListIds: rule.trelloListIds as unknown as string[],
      trelloLabelIds: (rule.trelloLabelIds as unknown as string[] | null) ?? null,
      gitlabConnectionId: rule.gitlabConnectionId,
      gitlabProjectId: rule.gitlabProjectId,
      gitlabProjectPath: rule.gitlabProjectPath,
      gitlabDefaultLabels: rule.gitlabDefaultLabels as unknown as string[],
      titleTemplate: rule.titleTemplate,
      descriptionTemplate: rule.descriptionTemplate,
      includeTrelloLabels: rule.includeTrelloLabels,
      fixedLabels: rule.fixedLabels as unknown as string[],
      updatedAt: rule.updatedAt.toISOString(),
    };
  });
}

