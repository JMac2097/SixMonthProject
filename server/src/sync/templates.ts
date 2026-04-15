import type { TrelloCard, TrelloChecklist } from '../integrations/trello/types';

export type RenderContext = {
  card: TrelloCard;
  checklists?: TrelloChecklist[];
};

export function renderTemplate(template: string, ctx: RenderContext): string {
  return template
    .replaceAll('{{card.name}}', ctx.card.name)
    .replaceAll('{{card.desc}}', ctx.card.desc ?? '')
    .replaceAll('{{card.url}}', ctx.card.url);
}

export function summarizeChecklists(checklists: TrelloChecklist[]) {
  const lines: string[] = [];
  for (const cl of checklists) {
    const done = cl.checkItems.filter((i) => i.state === 'complete').length;
    const total = cl.checkItems.length;
    lines.push(`- ${cl.name}: ${done}/${total}`);
  }
  return lines.join('\n');
}

