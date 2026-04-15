import { jsonFetch } from '../http';
import type { TrelloAttachment, TrelloBoard, TrelloCard, TrelloChecklist, TrelloList } from './types';

export type TrelloAuth = {
  apiKey: string;
  token: string;
};

export class TrelloClient {
  private readonly baseUrl = 'https://api.trello.com/1';

  constructor(private readonly auth: TrelloAuth) {}

  private withAuth(query?: Record<string, string | number | boolean | undefined>) {
    return {
      key: this.auth.apiKey,
      token: this.auth.token,
      ...query,
    };
  }

  async testAuth() {
    const { data } = await jsonFetch<{ id: string; fullName: string; username: string }>({
      url: `${this.baseUrl}/members/me`,
      query: this.withAuth(),
    });
    return data;
  }

  async listBoards() {
    const { data } = await jsonFetch<TrelloBoard[]>({
      url: `${this.baseUrl}/members/me/boards`,
      query: this.withAuth({
        fields: 'name,url,closed',
        filter: 'open',
      }),
    });
    return data;
  }

  async listLists(boardId: string) {
    const { data } = await jsonFetch<TrelloList[]>({
      url: `${this.baseUrl}/boards/${boardId}/lists`,
      query: this.withAuth({
        fields: 'name,closed',
        filter: 'open',
      }),
    });
    return data;
  }

  async listCardsInList(listId: string) {
    const { data } = await jsonFetch<TrelloCard[]>({
      url: `${this.baseUrl}/lists/${listId}/cards`,
      query: this.withAuth({
        fields: 'name,desc,idList,url,dateLastActivity,labels',
        label_fields: 'name,color',
        attachments: 'true',
        attachment_fields: 'name,url',
        stickers: 'false',
      }),
    });
    return data;
  }

  async getCardChecklists(cardId: string) {
    const { data } = await jsonFetch<TrelloChecklist[]>({
      url: `${this.baseUrl}/cards/${cardId}/checklists`,
      query: this.withAuth({
        fields: 'name',
        checkItems: 'all',
        checkItem_fields: 'name,state',
      }),
    });
    return data;
  }

  async getCardAttachments(cardId: string) {
    const { data } = await jsonFetch<TrelloAttachment[]>({
      url: `${this.baseUrl}/cards/${cardId}/attachments`,
      query: this.withAuth({
        fields: 'name,url',
      }),
    });
    return data;
  }
}

