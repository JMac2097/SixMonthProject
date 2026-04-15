import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../db';
import { TrelloClient } from '../integrations/trello/client';
import { GitLabClient } from '../integrations/gitlab/client';
import type { TrelloCard } from '../integrations/trello/types';
import { renderTemplate } from '../sync/templates';

type PreviewItem = {
  trelloCardId: string;
  trelloCardName: string;
  trelloCardUrl: string;
  action: 'create' | 'skip';
  reason?: string;
  issue: { title: string; description: string; labels: string[] };
};

function uniq(strings: string[]) {
  return Array.from(new Set(strings.filter(Boolean)));
}

function issueFromCard(args: {
  card: TrelloCard;
  titleTemplate: string;
  descriptionTemplate: string;
  includeTrelloLabels: boolean;
  fixedLabels: string[];
  defaultLabels: string[];
}) {
  const title = renderTemplate(args.titleTemplate, { card: args.card });
  const description = renderTemplate(args.descriptionTemplate, { card: args.card });
  const trelloLabels = args.includeTrelloLabels ? (args.card.labels ?? []).map((l) => l.name).filter(Boolean) : [];
  const labels = uniq([...args.fixedLabels, ...args.defaultLabels, ...trelloLabels]);
  return { title, description, labels };
}

async function fetchRuleCards(rule: {
  trelloConnectionId: string;
  trelloListIds: string[];
  trelloLabelIds: string[] | null;
}) {
  const creds = await prisma.connectionProfile.findUnique({ where: { id: rule.trelloConnectionId } });
  if (!creds || creds.type !== 'trello') throw new Error('Trello connection not found');
  const trello = new TrelloClient(creds.credentials as any);

  const all: TrelloCard[] = [];
  for (const listId of rule.trelloListIds) {
    const cards = await trello.listCardsInList(listId);
    all.push(...cards);
  }

  if (rule.trelloLabelIds && rule.trelloLabelIds.length > 0) {
    const labelSet = new Set(rule.trelloLabelIds);
    return all.filter((c) => (c.labels ?? []).some((l) => labelSet.has(l.id)));
  }

  return all;
}

export async function registerSyncRoutes(app: FastifyInstance) {
  app.post('/api/rules/:ruleId/preview', async (req) => {
    const params = z.object({ ruleId: z.string().min(1) }).parse(req.params);
    const rule = await prisma.rule.findUnique({ where: { id: params.ruleId } });
    if (!rule) throw app.httpErrors.notFound('Rule not found');

    const cards = await fetchRuleCards({
      trelloConnectionId: rule.trelloConnectionId,
      trelloListIds: rule.trelloListIds as unknown as string[],
      trelloLabelIds: (rule.trelloLabelIds as unknown as string[] | null) ?? null,
    });

    const items: PreviewItem[] = [];
    for (const card of cards) {
      const existing = await prisma.cardIssueLink.findFirst({
        where: {
          trelloCardId: card.id,
          gitlabConnectionId: rule.gitlabConnectionId,
          gitlabProjectId: rule.gitlabProjectId,
        },
      });

      const issue = issueFromCard({
        card,
        titleTemplate: rule.titleTemplate,
        descriptionTemplate: rule.descriptionTemplate,
        includeTrelloLabels: rule.includeTrelloLabels,
        fixedLabels: rule.fixedLabels as unknown as string[],
        defaultLabels: rule.gitlabDefaultLabels as unknown as string[],
      });

      if (existing) {
        items.push({
          trelloCardId: card.id,
          trelloCardName: card.name,
          trelloCardUrl: card.url,
          action: 'skip',
          reason: `Already linked to ${existing.gitlabIssueUrl}`,
          issue,
        });
      } else {
        items.push({
          trelloCardId: card.id,
          trelloCardName: card.name,
          trelloCardUrl: card.url,
          action: 'create',
          issue,
        });
      }
    }

    items.sort((a, b) => a.trelloCardName.localeCompare(b.trelloCardName));
    return { items };
  });

  app.post('/api/rules/:ruleId/sync', async (req) => {
    const params = z.object({ ruleId: z.string().min(1) }).parse(req.params);
    const body = z
      .object({
        includeCardIds: z.array(z.string().min(1)).optional(),
      })
      .parse(req.body ?? {});

    const rule = await prisma.rule.findUnique({ where: { id: params.ruleId } });
    if (!rule) throw app.httpErrors.notFound('Rule not found');

    const run = await prisma.syncRun.create({
      data: {
        ruleId: rule.id,
        status: 'running',
      },
      select: { id: true },
    });

    const cards = await fetchRuleCards({
      trelloConnectionId: rule.trelloConnectionId,
      trelloListIds: rule.trelloListIds as unknown as string[],
      trelloLabelIds: (rule.trelloLabelIds as unknown as string[] | null) ?? null,
    });

    const cardMap = new Map(cards.map((c) => [c.id, c]));
    const selected: TrelloCard[] = body.includeCardIds
      ? body.includeCardIds
          .map((id) => cardMap.get(id))
          .filter((c): c is TrelloCard => Boolean(c))
      : cards;

    const gitlabCreds = await app.getGitLabCredentials(rule.gitlabConnectionId);
    const gitlab = new GitLabClient(gitlabCreds);

    let failedCount = 0;

    for (const card of selected) {
      const existing = await prisma.cardIssueLink.findFirst({
        where: {
          trelloCardId: card.id,
          gitlabConnectionId: rule.gitlabConnectionId,
          gitlabProjectId: rule.gitlabProjectId,
        },
      });

      if (existing) {
        await prisma.syncItem.create({
          data: {
            syncRunId: run.id,
            trelloCardId: card.id,
            action: 'skipped',
            gitlabIssueIid: existing.gitlabIssueIid,
            gitlabIssueUrl: existing.gitlabIssueUrl,
            error: null,
          },
        });
        continue;
      }

      const issue = issueFromCard({
        card,
        titleTemplate: rule.titleTemplate,
        descriptionTemplate: rule.descriptionTemplate,
        includeTrelloLabels: rule.includeTrelloLabels,
        fixedLabels: rule.fixedLabels as unknown as string[],
        defaultLabels: rule.gitlabDefaultLabels as unknown as string[],
      });

      try {
        const created = await gitlab.createIssue({
          projectId: rule.gitlabProjectId,
          title: issue.title,
          description: issue.description,
          labels: issue.labels,
        });

        await prisma.cardIssueLink.create({
          data: {
            trelloCardId: card.id,
            gitlabConnectionId: rule.gitlabConnectionId,
            gitlabProjectId: rule.gitlabProjectId,
            gitlabIssueIid: created.iid,
            gitlabIssueUrl: created.web_url,
          },
        });

        await prisma.syncItem.create({
          data: {
            syncRunId: run.id,
            trelloCardId: card.id,
            action: 'created',
            gitlabIssueIid: created.iid,
            gitlabIssueUrl: created.web_url,
            error: null,
          },
        });
      } catch (e) {
        failedCount++;
        await prisma.syncItem.create({
          data: {
            syncRunId: run.id,
            trelloCardId: card.id,
            action: 'failed',
            error: e instanceof Error ? e.message : 'Unknown error',
          },
        });
      }
    }

    await prisma.syncRun.update({
      where: { id: run.id },
      data: {
        status: failedCount > 0 ? 'failed' : 'succeeded',
        finishedAt: new Date(),
      },
    });

    return { runId: run.id };
  });

  app.get('/api/rules/:ruleId/runs', async (req) => {
    const params = z.object({ ruleId: z.string().min(1) }).parse(req.params);
    const runs = await prisma.syncRun.findMany({
      where: { ruleId: params.ruleId },
      orderBy: { startedAt: 'desc' },
      take: 50,
      include: { items: true },
    });

    return runs.map((r) => {
      const created = r.items.filter((i) => i.action === 'created').length;
      const skipped = r.items.filter((i) => i.action === 'skipped').length;
      const failed = r.items.filter((i) => i.action === 'failed').length;
      return {
        id: r.id,
        status: r.status,
        startedAt: r.startedAt.toISOString(),
        finishedAt: r.finishedAt?.toISOString() ?? null,
        counts: { created, skipped, failed },
      };
    });
  });

  app.get('/api/runs/:runId', async (req) => {
    const params = z.object({ runId: z.string().min(1) }).parse(req.params);
    const run = await prisma.syncRun.findUnique({
      where: { id: params.runId },
      include: { items: { orderBy: { createdAt: 'asc' } }, rule: true },
    });
    if (!run) throw app.httpErrors.notFound('Run not found');
    return {
      id: run.id,
      status: run.status,
      startedAt: run.startedAt.toISOString(),
      finishedAt: run.finishedAt?.toISOString() ?? null,
      rule: { id: run.rule.id, name: run.rule.name },
      items: run.items.map((i) => ({
        id: i.id,
        trelloCardId: i.trelloCardId,
        action: i.action,
        gitlabIssueIid: i.gitlabIssueIid,
        gitlabIssueUrl: i.gitlabIssueUrl,
        error: i.error,
        createdAt: i.createdAt.toISOString(),
      })),
    };
  });
}

