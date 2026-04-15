export type TrelloBoard = {
  id: string;
  name: string;
  url?: string;
  closed?: boolean;
};

export type TrelloList = {
  id: string;
  name: string;
  closed?: boolean;
};

export type TrelloLabel = {
  id: string;
  name: string;
  color: string | null;
};

export type TrelloAttachment = {
  id: string;
  name: string;
  url: string;
};

export type TrelloChecklistItem = {
  id: string;
  name: string;
  state: 'complete' | 'incomplete';
};

export type TrelloChecklist = {
  id: string;
  name: string;
  checkItems: TrelloChecklistItem[];
};

export type TrelloCard = {
  id: string;
  name: string;
  desc: string;
  idList: string;
  url: string;
  dateLastActivity: string;
  labels: TrelloLabel[];
  attachments?: TrelloAttachment[];
};

