export type GitLabProject = {
  id: number;
  name: string;
  path_with_namespace: string;
  web_url: string;
};

export type GitLabIssue = {
  id: number;
  iid: number;
  title: string;
  description: string | null;
  web_url: string;
};

