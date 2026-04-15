import { useEffect, useMemo, useState } from 'react';
import { api, type ConnectionSummary } from '../api';

type Status = { kind: 'idle' } | { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ok'; message: string };

export function ConnectionsPage() {
  const [connections, setConnections] = useState<ConnectionSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [trelloName, setTrelloName] = useState('Trello (Client)');
  const [trelloApiKey, setTrelloApiKey] = useState('');
  const [trelloToken, setTrelloToken] = useState('');
  const [trelloStatus, setTrelloStatus] = useState<Status>({ kind: 'idle' });

  const [gitlabName, setGitlabName] = useState('GitLab (Client)');
  const [gitlabBaseUrl, setGitlabBaseUrl] = useState('https://gitlab.com');
  const [gitlabToken, setGitlabToken] = useState('');
  const [gitlabStatus, setGitlabStatus] = useState<Status>({ kind: 'idle' });

  const grouped = useMemo(() => {
    const items = connections ?? [];
    return {
      trello: items.filter((c) => c.type === 'trello'),
      gitlab: items.filter((c) => c.type === 'gitlab'),
    };
  }, [connections]);

  async function reload() {
    setLoadError(null);
    try {
      setConnections(await api.listConnections());
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load connections');
      setConnections([]);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  return (
    <div className="page">
      <div className="pageHeader">
        <h1>Connections</h1>
        <p className="muted">Store Trello + GitLab credentials locally, then reuse them in rules.</p>
      </div>

      {loadError ? (
        <div className="card danger">
          <div className="cardTitle">Couldn’t load connections</div>
          <div className="cardBody">{loadError}</div>
        </div>
      ) : null}

      <div className="grid2">
        <section className="card">
          <div className="cardTitle">Add Trello connection</div>
          <div className="cardBody stack">
            <label className="field">
              <div className="label">Name</div>
              <input value={trelloName} onChange={(e) => setTrelloName(e.target.value)} />
            </label>
            <label className="field">
              <div className="label">API key</div>
              <input value={trelloApiKey} onChange={(e) => setTrelloApiKey(e.target.value)} placeholder="Trello API key" />
            </label>
            <label className="field">
              <div className="label">Token</div>
              <input value={trelloToken} onChange={(e) => setTrelloToken(e.target.value)} placeholder="Trello token" />
            </label>
            <div className="row">
              <button
                className="btn"
                onClick={async () => {
                  setTrelloStatus({ kind: 'loading' });
                  try {
                    const me = await api.testTrelloConnection({ apiKey: trelloApiKey, token: trelloToken });
                    setTrelloStatus({ kind: 'ok', message: `Authenticated as ${me.fullName} (@${me.username})` });
                  } catch (e) {
                    setTrelloStatus({ kind: 'error', message: e instanceof Error ? e.message : 'Test failed' });
                  }
                }}
              >
                Test
              </button>
              <button
                className="btn primary"
                onClick={async () => {
                  setTrelloStatus({ kind: 'loading' });
                  try {
                    await api.createTrelloConnection({ name: trelloName, apiKey: trelloApiKey, token: trelloToken });
                    setTrelloStatus({ kind: 'ok', message: 'Saved' });
                    await reload();
                  } catch (e) {
                    setTrelloStatus({ kind: 'error', message: e instanceof Error ? e.message : 'Save failed' });
                  }
                }}
              >
                Save
              </button>
            </div>
            <StatusLine status={trelloStatus} />
          </div>
        </section>

        <section className="card">
          <div className="cardTitle">Add GitLab connection</div>
          <div className="cardBody stack">
            <label className="field">
              <div className="label">Name</div>
              <input value={gitlabName} onChange={(e) => setGitlabName(e.target.value)} />
            </label>
            <label className="field">
              <div className="label">Base URL</div>
              <input value={gitlabBaseUrl} onChange={(e) => setGitlabBaseUrl(e.target.value)} placeholder="https://gitlab.com" />
            </label>
            <label className="field">
              <div className="label">Personal access token</div>
              <input value={gitlabToken} onChange={(e) => setGitlabToken(e.target.value)} placeholder="GitLab PAT" />
            </label>
            <div className="row">
              <button
                className="btn"
                onClick={async () => {
                  setGitlabStatus({ kind: 'loading' });
                  try {
                    const me = await api.testGitLabConnection({ baseUrl: gitlabBaseUrl, token: gitlabToken });
                    setGitlabStatus({ kind: 'ok', message: `Authenticated as ${me.name} (@${me.username})` });
                  } catch (e) {
                    setGitlabStatus({ kind: 'error', message: e instanceof Error ? e.message : 'Test failed' });
                  }
                }}
              >
                Test
              </button>
              <button
                className="btn primary"
                onClick={async () => {
                  setGitlabStatus({ kind: 'loading' });
                  try {
                    await api.createGitLabConnection({ name: gitlabName, baseUrl: gitlabBaseUrl, token: gitlabToken });
                    setGitlabStatus({ kind: 'ok', message: 'Saved' });
                    await reload();
                  } catch (e) {
                    setGitlabStatus({ kind: 'error', message: e instanceof Error ? e.message : 'Save failed' });
                  }
                }}
              >
                Save
              </button>
            </div>
            <StatusLine status={gitlabStatus} />
          </div>
        </section>
      </div>

      <section className="card">
        <div className="cardTitle">Saved connections</div>
        <div className="cardBody">
          {connections === null ? (
            <div className="muted">Loading…</div>
          ) : (
            <div className="grid2">
              <div>
                <div className="subTitle">Trello</div>
                {grouped.trello.length === 0 ? <div className="muted">None yet</div> : null}
                <ul className="list">
                  {grouped.trello.map((c) => (
                    <li key={c.id} className="listItem">
                      <div className="listMain">{c.name}</div>
                      <div className="listMeta">{new Date(c.createdAt).toLocaleString()}</div>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="subTitle">GitLab</div>
                {grouped.gitlab.length === 0 ? <div className="muted">None yet</div> : null}
                <ul className="list">
                  {grouped.gitlab.map((c) => (
                    <li key={c.id} className="listItem">
                      <div className="listMain">{c.name}</div>
                      <div className="listMeta">{c.baseUrl}</div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function StatusLine({ status }: { status: Status }) {
  if (status.kind === 'idle') return null;
  if (status.kind === 'loading') return <div className="muted">Working…</div>;
  if (status.kind === 'ok') return <div className="ok">{status.message}</div>;
  return <div className="error">{status.message}</div>;
}

