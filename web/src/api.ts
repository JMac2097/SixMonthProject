export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed: ${res.status}`);
  }

  return (await res.json()) as T;
}

export type ConnectionSummary = {
  id: string;
  type: 'trello' | 'gitlab';
  name: string;
  baseUrl?: string | null;
  createdAt: string;
};

export type RuleSummary = {
  id: string;
  name: string;
  trelloBoardId: string;
  trelloListIds: string[];
  gitlabProjectId: number;
  gitlabProjectPath?: string | null;
  updatedAt: string;
};

export type RuleDetail = RuleSummary & {
  trelloConnectionId: string;
  gitlabConnectionId: string;
  gitlabDefaultLabels: string[];
  titleTemplate: string;
  descriptionTemplate: string;
  includeTrelloLabels: boolean;
  fixedLabels: string[];
};

export type RunSummary = {
  id: string;
  status: 'running' | 'succeeded' | 'failed';
  startedAt: string;
  finishedAt?: string | null;
  counts?: { created: number; skipped: number; failed: number };
};

export type PreviewItem = {
  trelloCardId: string;
  trelloCardName: string;
  trelloCardUrl: string;
  action: 'create' | 'skip';
  reason?: string;
  issue: { title: string; description: string; labels: string[] };
};

export const api = {
  async listConnections(): Promise<ConnectionSummary[]> {
    return request('/api/connections');
  },
  async createTrelloConnection(args: { name: string; apiKey: string; token: string }) {
    return request<{ id: string }>('/api/connections/trello', { method: 'POST', body: JSON.stringify(args) });
  },
  async createGitLabConnection(args: { name: string; baseUrl: string; token: string }) {
    return request<{ id: string }>('/api/connections/gitlab', { method: 'POST', body: JSON.stringify(args) });
  },
  async testTrelloConnection(args: { apiKey: string; token: string }) {
    return request<{ username: string; fullName: string }>('/api/connections/trello/test', {
      method: 'POST',
      body: JSON.stringify(args),
    });
  },
  async testGitLabConnection(args: { baseUrl: string; token: string }) {
    return request<{ username: string; name: string }>('/api/connections/gitlab/test', {
      method: 'POST',
      body: JSON.stringify(args),
    });
  },
  async listRules(): Promise<RuleSummary[]> {
    return request('/api/rules');
  },
  async createRule(args: {
    name: string;
    trelloConnectionId: string;
    trelloBoardId: string;
    trelloListIds: string[];
    trelloLabelIds?: string[];
    gitlabConnectionId: string;
    gitlabProjectId: number;
    gitlabProjectPath?: string;
    gitlabDefaultLabels: string[];
    titleTemplate: string;
    descriptionTemplate: string;
    includeTrelloLabels: boolean;
    fixedLabels: string[];
  }) {
    return request<{ id: string }>('/api/rules', { method: 'POST', body: JSON.stringify(args) });
  },
  async getRule(ruleId: string) {
    return request<RuleDetail>(`/api/rules/${encodeURIComponent(ruleId)}`);
  },
  async trelloBoards(trelloConnectionId: string) {
    return request<{ id: string; name: string }[]>(`/api/trello/boards?connectionId=${encodeURIComponent(trelloConnectionId)}`);
  },
  /** Boards using saved profile or inline API key + token (no profile required). */
  async trelloBoardsAuth(body: { connectionId: string } | { apiKey: string; token: string }) {
    return request<{ id: string; name: string }[]>('/api/trello/boards', { method: 'POST', body: JSON.stringify(body) });
  },
  async trelloLists(trelloConnectionId: string, boardId: string) {
    return request<{ id: string; name: string }[]>(
      `/api/trello/boards/${encodeURIComponent(boardId)}/lists?connectionId=${encodeURIComponent(trelloConnectionId)}`,
    );
  },
  /** Lists using saved profile or inline credentials. */
  async trelloListsAuth(
    boardId: string,
    body: { connectionId: string } | { apiKey: string; token: string },
  ) {
    return request<{ id: string; name: string }[]>(`/api/trello/boards/${encodeURIComponent(boardId)}/lists`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
  async gitlabProjects(gitlabConnectionId: string, search: string) {
    return request<{ id: number; path_with_namespace: string; web_url: string; name: string }[]>(
      `/api/gitlab/projects?connectionId=${encodeURIComponent(gitlabConnectionId)}&search=${encodeURIComponent(search)}`,
    );
  },
  /** Project search using saved profile or inline base URL + token. */
  async gitlabProjectsAuth(
    body:
      | { connectionId: string; search: string }
      | { baseUrl: string; token: string; search: string },
  ) {
    return request<{ id: number; path_with_namespace: string; web_url: string; name: string }[]>('/api/gitlab/projects', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
  async previewRule(ruleId: string) {
    return request<{ items: PreviewItem[] }>(`/api/rules/${encodeURIComponent(ruleId)}/preview`, { method: 'POST' });
  },
  async syncRule(ruleId: string, includeCardIds?: string[]) {
    return request(`/api/rules/${encodeURIComponent(ruleId)}/sync`, {
      method: 'POST',
      body: JSON.stringify({ includeCardIds }),
    });
  },
  async listRuleRuns(ruleId: string) {
    return request<RunSummary[]>(`/api/rules/${encodeURIComponent(ruleId)}/runs`);
  },
  async getRun(runId: string) {
    return request(`/api/runs/${encodeURIComponent(runId)}`);
  },
};

