import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type RuleSummary } from '../api';

export function RulesPage() {
  const [rules, setRules] = useState<RuleSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setRules(await api.listRules());
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load rules');
        setRules([]);
      }
    })();
  }, []);

  return (
    <div className="page">
      <div className="pageHeader">
        <div className="row spaceBetween">
          <div>
            <h1>Rules</h1>
            <p className="muted">Define what Trello cards should become GitLab issues, then run a manual sync.</p>
          </div>
          <Link className="btn primary" to="/rules/new">
            New rule
          </Link>
        </div>
      </div>

      {error ? (
        <div className="card danger">
          <div className="cardTitle">Couldn’t load rules</div>
          <div className="cardBody">{error}</div>
        </div>
      ) : null}

      <section className="card">
        <div className="cardTitle">Saved rules</div>
        <div className="cardBody">
          {rules === null ? (
            <div className="muted">Loading…</div>
          ) : rules.length === 0 ? (
            <div className="muted">
              No rules yet. Create one with <Link to="/rules/new">New rule</Link>.
            </div>
          ) : (
            <ul className="list">
              {rules.map((r) => (
                <li key={r.id} className="listItem">
                  <div className="listMain">
                    <Link to={`/rules/${encodeURIComponent(r.id)}`}>{r.name}</Link>
                  </div>
                  <div className="listMeta">
                    GitLab project {r.gitlabProjectPath ?? `#${r.gitlabProjectId}`} • Updated{' '}
                    {new Date(r.updatedAt).toLocaleString()}
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

