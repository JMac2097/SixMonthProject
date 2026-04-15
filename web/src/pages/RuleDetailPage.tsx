import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, type PreviewItem, type RunSummary, type RuleDetail } from '../api';

export function RuleDetailPage() {
  const { ruleId } = useParams();
  const [rule, setRule] = useState<RuleDetail | null>(null);
  const [runs, setRuns] = useState<RunSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewItem[] | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ruleId) return;
    (async () => {
      try {
        setRule(await api.getRule(ruleId));
        setRuns(await api.listRuleRuns(ruleId));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load rule');
      }
    })();
  }, [ruleId]);

  return (
    <div className="page">
      <div className="pageHeader">
        <div className="row spaceBetween">
          <div>
            <h1>{rule?.name ?? 'Rule'}</h1>
            <p className="muted">Preview and manually sync Trello cards into GitLab issues.</p>
          </div>
          <Link className="btn" to="/rules">
            Back
          </Link>
        </div>
      </div>

      {error ? (
        <div className="card danger">
          <div className="cardTitle">Couldn’t load rule</div>
          <div className="cardBody">{error}</div>
        </div>
      ) : null}

      <div className="grid2">
        <section className="card">
          <div className="cardTitle">Actions</div>
          <div className="cardBody stack">
            <button
              className="btn"
              disabled={!ruleId || busy}
              onClick={async () => {
                if (!ruleId) return;
                try {
                  setBusy(true);
                  const res = await api.previewRule(ruleId);
                  setPreview(res.items);
                  const next: Record<string, boolean> = {};
                  for (const it of res.items) {
                    next[it.trelloCardId] = it.action === 'create';
                  }
                  setSelected(next);
                } catch (e) {
                  alert(e instanceof Error ? e.message : 'Preview failed');
                } finally {
                  setBusy(false);
                }
              }}
            >
              Preview
            </button>
            <button
              className="btn primary"
              disabled={!ruleId || busy}
              onClick={async () => {
                if (!ruleId) return;
                try {
                  setBusy(true);
                  const includeCardIds =
                    preview?.filter((p) => p.action === 'create' && selected[p.trelloCardId]).map((p) => p.trelloCardId) ??
                    undefined;
                  await api.syncRule(ruleId, includeCardIds);
                  setRuns(await api.listRuleRuns(ruleId));
                  alert('Sync complete. See run history below.');
                } catch (e) {
                  alert(e instanceof Error ? e.message : 'Sync failed');
                } finally {
                  setBusy(false);
                }
              }}
            >
              Sync now
            </button>
          </div>
        </section>

        <section className="card">
          <div className="cardTitle">Config</div>
          <div className="cardBody">
            {rule ? (
              <ul className="list">
                <li className="listItem">
                  <div className="listMain">Trello board</div>
                  <div className="listMeta">{rule.trelloBoardId}</div>
                </li>
                <li className="listItem">
                  <div className="listMain">Trello lists</div>
                  <div className="listMeta">{Array.isArray(rule.trelloListIds) ? rule.trelloListIds.length : '—'}</div>
                </li>
                <li className="listItem">
                  <div className="listMain">GitLab project</div>
                  <div className="listMeta">{rule.gitlabProjectPath ?? rule.gitlabProjectId}</div>
                </li>
              </ul>
            ) : (
              <div className="muted">Loading…</div>
            )}
          </div>
        </section>
      </div>

      {preview ? (
        <section className="card">
          <div className="cardTitle">Preview</div>
          <div className="cardBody">
            <div className="muted">
              Select which cards to create issues for. Skipped cards are already linked (idempotency).
            </div>
            <div style={{ height: 10 }} />
            <ul className="list">
              {preview.map((p) => (
                <li key={p.trelloCardId} className="listItem">
                  <div className="row spaceBetween" style={{ alignItems: 'flex-start' }}>
                    <label className="check">
                      <input
                        type="checkbox"
                        disabled={p.action !== 'create'}
                        checked={Boolean(selected[p.trelloCardId])}
                        onChange={(e) =>
                          setSelected((cur) => ({
                            ...cur,
                            [p.trelloCardId]: e.target.checked,
                          }))
                        }
                      />
                      <span>
                        <a href={p.trelloCardUrl} target="_blank" rel="noreferrer">
                          {p.trelloCardName}
                        </a>
                      </span>
                    </label>
                    <div className="listMeta">{p.action === 'skip' ? p.reason : 'Will create issue'}</div>
                  </div>
                  <div className="listMeta" style={{ marginTop: 8 }}>
                    <div>
                      <strong>Title</strong>: {p.issue.title}
                    </div>
                    <div>
                      <strong>Labels</strong>: {p.issue.labels.join(', ') || '—'}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <section className="card">
        <div className="cardTitle">Run history</div>
        <div className="cardBody">
          {runs === null ? (
            <div className="muted">Loading…</div>
          ) : runs.length === 0 ? (
            <div className="muted">No runs yet.</div>
          ) : (
            <ul className="list">
              {runs.map((r) => (
                <li key={r.id} className="listItem">
                  <div className="listMain">
                    {r.status} • {new Date(r.startedAt).toLocaleString()}
                  </div>
                  <div className="listMeta">
                    {r.counts ? `created ${r.counts.created}, skipped ${r.counts.skipped}, failed ${r.counts.failed}` : ''}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

