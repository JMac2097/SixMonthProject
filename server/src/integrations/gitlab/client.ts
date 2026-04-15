import { jsonFetch } from '../http';
import type { GitLabIssue, GitLabProject } from './types';

export type GitLabAuth = {
  baseUrl: string; // e.g. https://gitlab.com or https://gitlab.example.com
  token: string;
};

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, '');
}

export class GitLabClient {
  private readonly baseUrl: string;

  constructor(private readonly auth: GitLabAuth) {
    this.baseUrl = normalizeBaseUrl(auth.baseUrl);
  }

  private apiUrl(path: string) {
    return `${this.baseUrl}/api/v4${path}`;
  }

  private headers() {
    return {
      'private-token': this.auth.token,
    };
  }

  async testAuth() {
    const { data } = await jsonFetch<{ id: number; username: string; name: string }>({
      url: this.apiUrl('/user'),
      headers: this.headers(),
    });
    return data;
  }

  async searchProjects(search: string, limit = 50) {
    const { data } = await jsonFetch<GitLabProject[]>({
      url: this.apiUrl('/projects'),
      headers: this.headers(),
      query: {
        search,
        simple: true,
        per_page: limit,
      },
    });
    return data;
  }

  async createIssue(args: {
    projectId: number;
    title: string;
    description: string;
    labels?: string[];
  }): Promise<GitLabIssue> {
    const body: Record<string, string> = {
      title: args.title,
      description: args.description,
    };
    if (args.labels && args.labels.length > 0) {
      body.labels = args.labels.join(',');
    }

    const { data } = await jsonFetch<GitLabIssue>({
      url: this.apiUrl(`/projects/${encodeURIComponent(String(args.projectId))}/issues`),
      method: 'POST',
      headers: this.headers(),
      body,
    });
    return data;
  }
}

