import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, type ConnectionSummary } from '../api';

type Step = 'connections' | 'trello' | 'gitlab' | 'mapping' | 'review';
type AuthMode = 'saved' | 'inline';

function trelloAuthPayload(
  mode: AuthMode,
  connectionId: string,
  apiKey: string,
  token: string,
): { connectionId: string } | { apiKey: string; token: string } | null {
  if (mode === 'saved') {
    if (!connectionId) return null;
    return { connectionId };
  }
  if (!apiKey.trim() || !token.trim()) return null;
  return { apiKey: apiKey.trim(), token: token.trim() };
}

function gitlabAuthPayload(
  mode: AuthMode,
  connectionId: string,
  baseUrl: string,
  token: string,
): { connectionId: string } | { baseUrl: string; token: string } | null {
  if (mode === 'saved') {
    if (!connectionId) return null;
    return { connectionId };
  }
  if (!baseUrl.trim() || !token.trim()) return null;
  return { baseUrl: baseUrl.trim(), token: token.trim() };
}

export function RuleWizardPage() {
  const nav = useNavigate();
  const [step, setStep] = useState<Step>('connections');

  const [connections, setConnections] = useState<ConnectionSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [trelloAuthMode, setTrelloAuthMode] = useState<AuthMode>('inline');
  const [gitlabAuthMode, setGitlabAuthMode] = useState<AuthMode>('inline');

  const [trelloConnectionId, setTrelloConnectionId] = useState<string>('');
  const [trelloApiKey, setTrelloApiKey] = useState('');
  const [trelloToken, setTrelloToken] = useState('');
  const [saveTrelloName, setSaveTrelloName] = useState('');

  const [gitlabConnectionId, setGitlabConnectionId] = useState<string>('');
  const [gitlabBaseUrl, setGitlabBaseUrl] = useState('https://gitlab.com');
  const [gitlabToken, setGitlabToken] = useState('');
  const [saveGitlabName, setSaveGitlabName] = useState('');

  const [authStatus, setAuthStatus] = useState<string | null>(null);

  const [name, setName] = useState('Trello → GitLab');

  const [trelloBoardId, setTrelloBoardId] = useState<string>('');
  const [trelloBoards, setTrelloBoards] = useState<{ id: string; name: string }[]>([]);
  const [trelloListIds, setTrelloListIds] = useState<string[]>([]);
  const [trelloLists, setTrelloLists] = useState<{ id: string; name: string }[]>([]);

  const [gitlabSearch, setGitlabSearch] = useState('');
  const [gitlabProjects, setGitlabProjects] = useState<{ id: number; name: string; path_with_namespace: string }[]>([]);
  const [gitlabProjectId, setGitlabProjectId] = useState<number | null>(null);
  const [gitlabProjectPath, setGitlabProjectPath] = useState<string | null>(null);
  const [gitlabDefaultLabels, setGitlabDefaultLabels] = useState<string>('from-trello');

  const [titleTemplate, setTitleTemplate] = useState('{{card.name}}');
  const [descriptionTemplate, setDescriptionTemplate] = useState(
    ['{{card.desc}}', '', '---', 'Trello: {{card.url}}'].join('\n'),
  );
  const [includeTrelloLabels, setIncludeTrelloLabels] = useState(true);
  const [fixedLabels, setFixedLabels] = useState('from-trello');

  const trelloConnections = useMemo(
    () => (connections ?? []).filter((c) => c.type === 'trello'),
    [connections],
  );
  const gitlabConnections = useMemo(
    () => (connections ?? []).filter((c) => c.type === 'gitlab'),
    [connections],
  );

  const trelloPayload = useMemo(
    () => trelloAuthPayload(trelloAuthMode, trelloConnectionId, trelloApiKey, trelloToken),
    [trelloAuthMode, trelloConnectionId, trelloApiKey, trelloToken],
  );
  const gitlabPayload = useMemo(
    () => gitlabAuthPayload(gitlabAuthMode, gitlabConnectionId, gitlabBaseUrl, gitlabToken),
    [gitlabAuthMode, gitlabConnectionId, gitlabBaseUrl, gitlabToken],
  );

  useEffect(() => {
    (async () => {
      try {
        setConnections(await api.listConnections());
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : 'Failed to load connections');
        setConnections([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (trelloAuthMode === 'saved' && trelloConnections.length > 0 && !trelloConnectionId) {
      setTrelloConnectionId(trelloConnections[0].id);
    }
  }, [trelloAuthMode, trelloConnections, trelloConnectionId]);

  useEffect(() => {
    if (gitlabAuthMode === 'saved' && gitlabConnections.length > 0 && !gitlabConnectionId) {
      setGitlabConnectionId(gitlabConnections[0].id);
    }
  }, [gitlabAuthMode, gitlabConnections, gitlabConnectionId]);

  useEffect(() => {
    if (step !== 'trello' || !trelloPayload) {
      if (step !== 'trello') return;
      setTrelloBoards([]);
      return;
    }
    (async () => {
      try {
        const boards = await api.trelloBoardsAuth(trelloPayload);
        setTrelloBoards(boards);
      } catch {
        setTrelloBoards([]);
      }
    })();
  }, [step, trelloPayload]);

  useEffect(() => {
    if (step !== 'trello' || !trelloBoardId || !trelloPayload) {
      if (step !== 'trello') return;
      setTrelloLists([]);
      return;
    }
    (async () => {
      try {
        const lists = await api.trelloListsAuth(trelloBoardId, trelloPayload);
        setTrelloLists(lists);
        setTrelloListIds((cur) => cur.filter((id) => lists.some((l) => l.id === id)));
      } catch {
        setTrelloLists([]);
      }
    })();
  }, [step, trelloBoardId, trelloPayload]);

  const connectionsStepOk = Boolean(trelloPayload && gitlabPayload);

  const canContinue = (() => {
    if (step === 'connections') return connectionsStepOk;
    if (step === 'trello') return Boolean(trelloPayload && trelloBoardId && trelloListIds.length > 0);
    if (step === 'gitlab') return Boolean(gitlabPayload && gitlabProjectId);
    if (step === 'mapping') return Boolean(titleTemplate.trim() && descriptionTemplate.trim());
    if (step === 'review') return true;
    return false;
  })();

  async function save() {
    if (!gitlabProjectId || !trelloPayload || !gitlabPayload) return;
    const fixed = splitCsv(fixedLabels);
    const defaults = splitCsv(gitlabDefaultLabels);

    let tid = trelloConnectionId;
    if (!tid) {
      if (trelloAuthMode !== 'inline') {
        alert('Select a Trello connection or use inline credentials.');
        return;
      }
      const r = await api.createTrelloConnection({
        name: `Trello — ${name}`,
        apiKey: trelloApiKey.trim(),
        token: trelloToken.trim(),
      });
      tid = r.id;
    }

    let gid = gitlabConnectionId;
    if (!gid) {
      if (gitlabAuthMode !== 'inline') {
        alert('Select a GitLab connection or use inline credentials.');
        return;
      }
      const r = await api.createGitLabConnection({
        name: `GitLab — ${name}`,
        baseUrl: gitlabBaseUrl.trim(),
        token: gitlabToken.trim(),
      });
      gid = r.id;
    }

    if (!tid || !gid) {
      alert('Could not resolve Trello or GitLab connection. Check credentials.');
      return;
    }

    const res = await api.createRule({
      name,
      trelloConnectionId: tid,
      trelloBoardId,
      trelloListIds,
      gitlabConnectionId: gid,
      gitlabProjectId,
      gitlabProjectPath: gitlabProjectPath ?? undefined,
      gitlabDefaultLabels: defaults,
      titleTemplate,
      descriptionTemplate,
      includeTrelloLabels,
      fixedLabels: fixed,
    });

    nav(`/rules/${encodeURIComponent(res.id)}`);
  }

  return (
    <div className="page">
      <div className="pageHeader">
        <div className="row spaceBetween">
          <div>
            <h1>New rule</h1>
            <p className="muted">Use saved connections or paste credentials here—no need to visit Connections first.</p>
          </div>
          <Link className="btn" to="/rules">
            Back
          </Link>
        </div>
      </div>

      {loadError ? (
        <div className="card danger">
          <div className="cardTitle">Couldn’t load saved connections</div>
          <div className="cardBody">
            {loadError} You can still use <strong>inline credentials</strong> below.
          </div>
        </div>
      ) : null}

      <div className="wizard">
        <WizardSteps step={step} setStep={setStep} />

        <section className="card">
          <div className="cardTitle">Rule settings</div>
          <div className="cardBody stack">
            {step === 'connections' ? (
              <>
                <div className="muted">
                  Choose a saved profile or enter API keys. Optionally save inline credentials for reuse. Manage all profiles
                  anytime on <Link to="/connections">Connections</Link>.
                </div>

                <div className="grid2">
                  <div className="stack">
                    <div className="subTitle">Trello</div>
                    <div className="row" style={{ flexWrap: 'wrap', gap: 12 }}>
                      <label className="check">
                        <input
                          type="radio"
                          name="trelloAuth"
                          checked={trelloAuthMode === 'saved'}
                          onChange={() => {
                            setTrelloAuthMode('saved');
                            setAuthStatus(null);
                          }}
                        />
                        <span>Saved profile</span>
                      </label>
                      <label className="check">
                        <input
                          type="radio"
                          name="trelloAuth"
                          checked={trelloAuthMode === 'inline'}
                          onChange={() => {
                            setTrelloAuthMode('inline');
                            setTrelloConnectionId('');
                            setAuthStatus(null);
                          }}
                        />
                        <span>Inline credentials</span>
                      </label>
                    </div>
                    {trelloAuthMode === 'saved' ? (
                      <label className="field">
                        <div className="label">Connection</div>
                        <select value={trelloConnectionId} onChange={(e) => setTrelloConnectionId(e.target.value)}>
                          <option value="">Select…</option>
                          {trelloConnections.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        {trelloConnections.length === 0 ? (
                          <div className="muted" style={{ marginTop: 8 }}>
                            No saved profiles—switch to inline or add one on Connections.
                          </div>
                        ) : null}
                      </label>
                    ) : (
                      <>
                        <label className="field">
                          <div className="label">API key</div>
                          <input value={trelloApiKey} onChange={(e) => setTrelloApiKey(e.target.value)} autoComplete="off" />
                        </label>
                        <label className="field">
                          <div className="label">Token</div>
                          <input value={trelloToken} onChange={(e) => setTrelloToken(e.target.value)} autoComplete="off" />
                        </label>
                        <div className="row" style={{ flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn"
                            disabled={!trelloApiKey.trim() || !trelloToken.trim()}
                            onClick={async () => {
                              try {
                                await api.testTrelloConnection({
                                  apiKey: trelloApiKey.trim(),
                                  token: trelloToken.trim(),
                                });
                                setAuthStatus('Trello: OK');
                              } catch (e) {
                                setAuthStatus(e instanceof Error ? e.message : 'Trello test failed');
                              }
                            }}
                          >
                            Test Trello
                          </button>
                        </div>
                        <div className="field">
                          <div className="label">Save as profile (optional)</div>
                          <div className="row">
                            <input
                              placeholder="Profile name"
                              value={saveTrelloName}
                              onChange={(e) => setSaveTrelloName(e.target.value)}
                            />
                            <button
                              type="button"
                              className="btn primary"
                              disabled={!trelloApiKey.trim() || !trelloToken.trim()}
                              onClick={async () => {
                                try {
                                  const n = saveTrelloName.trim() || `Trello (${name})`;
                                  const r = await api.createTrelloConnection({
                                    name: n,
                                    apiKey: trelloApiKey.trim(),
                                    token: trelloToken.trim(),
                                  });
                                  setTrelloConnectionId(r.id);
                                  setConnections(await api.listConnections());
                                  setAuthStatus(`Saved Trello profile: ${n}`);
                                } catch (e) {
                                  setAuthStatus(e instanceof Error ? e.message : 'Save failed');
                                }
                              }}
                            >
                              Save profile
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="stack">
                    <div className="subTitle">GitLab</div>
                    <div className="row" style={{ flexWrap: 'wrap', gap: 12 }}>
                      <label className="check">
                        <input
                          type="radio"
                          name="gitlabAuth"
                          checked={gitlabAuthMode === 'saved'}
                          onChange={() => {
                            setGitlabAuthMode('saved');
                            setAuthStatus(null);
                          }}
                        />
                        <span>Saved profile</span>
                      </label>
                      <label className="check">
                        <input
                          type="radio"
                          name="gitlabAuth"
                          checked={gitlabAuthMode === 'inline'}
                          onChange={() => {
                            setGitlabAuthMode('inline');
                            setGitlabConnectionId('');
                            setAuthStatus(null);
                          }}
                        />
                        <span>Inline credentials</span>
                      </label>
                    </div>
                    {gitlabAuthMode === 'saved' ? (
                      <label className="field">
                        <div className="label">Connection</div>
                        <select value={gitlabConnectionId} onChange={(e) => setGitlabConnectionId(e.target.value)}>
                          <option value="">Select…</option>
                          {gitlabConnections.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.baseUrl})
                            </option>
                          ))}
                        </select>
                        {gitlabConnections.length === 0 ? (
                          <div className="muted" style={{ marginTop: 8 }}>
                            No saved profiles—switch to inline or add one on Connections.
                          </div>
                        ) : null}
                      </label>
                    ) : (
                      <>
                        <label className="field">
                          <div className="label">Base URL</div>
                          <input value={gitlabBaseUrl} onChange={(e) => setGitlabBaseUrl(e.target.value)} />
                        </label>
                        <label className="field">
                          <div className="label">Personal access token</div>
                          <input value={gitlabToken} onChange={(e) => setGitlabToken(e.target.value)} autoComplete="off" />
                        </label>
                        <div className="row" style={{ flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn"
                            disabled={!gitlabBaseUrl.trim() || !gitlabToken.trim()}
                            onClick={async () => {
                              try {
                                await api.testGitLabConnection({
                                  baseUrl: gitlabBaseUrl.trim(),
                                  token: gitlabToken.trim(),
                                });
                                setAuthStatus('GitLab: OK');
                              } catch (e) {
                                setAuthStatus(e instanceof Error ? e.message : 'GitLab test failed');
                              }
                            }}
                          >
                            Test GitLab
                          </button>
                        </div>
                        <div className="field">
                          <div className="label">Save as profile (optional)</div>
                          <div className="row">
                            <input
                              placeholder="Profile name"
                              value={saveGitlabName}
                              onChange={(e) => setSaveGitlabName(e.target.value)}
                            />
                            <button
                              type="button"
                              className="btn primary"
                              disabled={!gitlabBaseUrl.trim() || !gitlabToken.trim()}
                              onClick={async () => {
                                try {
                                  const n = saveGitlabName.trim() || `GitLab (${name})`;
                                  const r = await api.createGitLabConnection({
                                    name: n,
                                    baseUrl: gitlabBaseUrl.trim(),
                                    token: gitlabToken.trim(),
                                  });
                                  setGitlabConnectionId(r.id);
                                  setConnections(await api.listConnections());
                                  setAuthStatus(`Saved GitLab profile: ${n}`);
                                } catch (e) {
                                  setAuthStatus(e instanceof Error ? e.message : 'Save failed');
                                }
                              }}
                            >
                              Save profile
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                {authStatus ? <div className="muted">{authStatus}</div> : null}
              </>
            ) : null}

            {step === 'trello' ? (
              <>
                <label className="field">
                  <div className="label">Rule name</div>
                  <input value={name} onChange={(e) => setName(e.target.value)} />
                </label>
                {!trelloPayload ? (
                  <div className="muted">Go back to Connect and enter Trello credentials or pick a saved profile.</div>
                ) : null}
                <label className="field">
                  <div className="label">Board</div>
                  <select
                    value={trelloBoardId}
                    onChange={(e) => {
                      setTrelloBoardId(e.target.value);
                      setTrelloListIds([]);
                    }}
                    disabled={!trelloPayload}
                  >
                    <option value="">Select…</option>
                    {trelloBoards.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="field">
                  <div className="label">List(s)</div>
                  <div className="checkGrid">
                    {trelloLists.map((l) => (
                      <label key={l.id} className="check">
                        <input
                          type="checkbox"
                          checked={trelloListIds.includes(l.id)}
                          onChange={(e) => {
                            setTrelloListIds((cur) => {
                              if (e.target.checked) return Array.from(new Set([...cur, l.id]));
                              return cur.filter((x) => x !== l.id);
                            });
                          }}
                        />
                        <span>{l.name}</span>
                      </label>
                    ))}
                    {trelloPayload && trelloBoardId && trelloLists.length === 0 ? (
                      <div className="muted">No lists found.</div>
                    ) : null}
                  </div>
                </div>
              </>
            ) : null}

            {step === 'gitlab' ? (
              <>
                {!gitlabPayload ? (
                  <div className="muted">Go back to Connect and enter GitLab credentials or pick a saved profile.</div>
                ) : null}
                <div className="field">
                  <div className="label">Project search</div>
                  <div className="row">
                    <input
                      value={gitlabSearch}
                      onChange={(e) => setGitlabSearch(e.target.value)}
                      placeholder="Search projects by name/path"
                      disabled={!gitlabPayload}
                    />
                    <button
                      type="button"
                      className="btn"
                      disabled={!gitlabPayload || gitlabSearch.trim().length < 2}
                      onClick={async () => {
                        if (!gitlabPayload) return;
                        const search = gitlabSearch.trim();
                        const items =
                          'connectionId' in gitlabPayload
                            ? await api.gitlabProjectsAuth({ connectionId: gitlabPayload.connectionId, search })
                            : await api.gitlabProjectsAuth({
                                baseUrl: gitlabPayload.baseUrl,
                                token: gitlabPayload.token,
                                search,
                              });
                        setGitlabProjects(items);
                      }}
                    >
                      Search
                    </button>
                  </div>
                </div>

                <label className="field">
                  <div className="label">Project</div>
                  <select
                    value={gitlabProjectId ?? ''}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      const p = gitlabProjects.find((x) => x.id === id);
                      setGitlabProjectId(id);
                      setGitlabProjectPath(p?.path_with_namespace ?? null);
                    }}
                  >
                    <option value="">Select…</option>
                    {gitlabProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.path_with_namespace}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <div className="label">Default GitLab labels (comma-separated)</div>
                  <input value={gitlabDefaultLabels} onChange={(e) => setGitlabDefaultLabels(e.target.value)} />
                </label>
              </>
            ) : null}

            {step === 'mapping' ? (
              <>
                <label className="field">
                  <div className="label">Issue title template</div>
                  <input value={titleTemplate} onChange={(e) => setTitleTemplate(e.target.value)} />
                </label>
                <label className="field">
                  <div className="label">Issue description template</div>
                  <textarea
                    value={descriptionTemplate}
                    onChange={(e) => setDescriptionTemplate(e.target.value)}
                    rows={10}
                  />
                </label>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={includeTrelloLabels}
                    onChange={(e) => setIncludeTrelloLabels(e.target.checked)}
                  />
                  <span>Include Trello labels as GitLab labels</span>
                </label>
                <label className="field">
                  <div className="label">Fixed GitLab labels (comma-separated)</div>
                  <input value={fixedLabels} onChange={(e) => setFixedLabels(e.target.value)} />
                </label>
                <div className="muted">
                  Supported placeholders: <code>{'{{card.name}}'}</code>, <code>{'{{card.desc}}'}</code>,{' '}
                  <code>{'{{card.url}}'}</code>.
                </div>
              </>
            ) : null}

            {step === 'review' ? (
              <div className="stack">
                <div className="subTitle">Review</div>
                <ul className="list">
                  <li className="listItem">
                    <div className="listMain">Name</div>
                    <div className="listMeta">{name}</div>
                  </li>
                  <li className="listItem">
                    <div className="listMain">Trello</div>
                    <div className="listMeta">
                      board {trelloBoardId} • lists {trelloListIds.length}
                    </div>
                  </li>
                  <li className="listItem">
                    <div className="listMain">GitLab</div>
                    <div className="listMeta">{gitlabProjectPath ?? gitlabProjectId ?? '—'}</div>
                  </li>
                  <li className="listItem">
                    <div className="listMain">Labels</div>
                    <div className="listMeta">
                      fixed: {splitCsv(fixedLabels).join(', ') || '—'} • defaults:{' '}
                      {splitCsv(gitlabDefaultLabels).join(', ') || '—'}
                    </div>
                  </li>
                </ul>
              </div>
            ) : null}

            <div className="row spaceBetween">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  const order: Step[] = ['connections', 'trello', 'gitlab', 'mapping', 'review'];
                  const idx = order.indexOf(step);
                  setStep(order[Math.max(0, idx - 1)]);
                }}
                disabled={step === 'connections'}
              >
                Back
              </button>
              {step === 'review' ? (
                <button type="button" className="btn primary" disabled={!canContinue} onClick={() => void save()}>
                  Create rule
                </button>
              ) : (
                <button
                  type="button"
                  className="btn primary"
                  disabled={!canContinue}
                  onClick={() => {
                    const order: Step[] = ['connections', 'trello', 'gitlab', 'mapping', 'review'];
                    const idx = order.indexOf(step);
                    setStep(order[Math.min(order.length - 1, idx + 1)]);
                  }}
                >
                  Continue
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function WizardSteps({ step, setStep }: { step: Step; setStep: (s: Step) => void }) {
  const items: { id: Step; label: string }[] = [
    { id: 'connections', label: 'Connect' },
    { id: 'trello', label: 'Trello' },
    { id: 'gitlab', label: 'GitLab' },
    { id: 'mapping', label: 'Mapping' },
    { id: 'review', label: 'Review' },
  ];

  return (
    <ol className="stepper">
      {items.map((it, idx) => (
        <li key={it.id}>
          <button
            className={it.id === step ? 'step active' : 'step'}
            onClick={() => setStep(it.id)}
            type="button"
          >
            <span className="stepIndex">{idx + 1}</span>
            <span>{it.label}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}

function splitCsv(s: string) {
  return s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}
