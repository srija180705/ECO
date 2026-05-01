import { useEffect, useState } from 'react';
import { apiFetch } from '../api';
import './Rewards.css';

const API_BASE = '/api/rewards';

function requirementLabel(row) {
  if (row.kind === 'events') {
    const n = row.progressTarget ?? row.threshold;
    return `${n} attended event${n === 1 ? '' : 's'}`;
  }
  const pts = row.progressTarget ?? row.threshold;
  return `${pts} lifetime points`;
}

function Rewards({ userId, userPoints, attendedCount = 0, onBadgesUpdated }) {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const qs = userId ? `?userId=${encodeURIComponent(userId)}` : '';
        const res = await apiFetch(`${API_BASE}${qs}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.message || 'Failed to load achievements');
        }

        const list = Array.isArray(data.achievements) ? data.achievements : [];
        const badges = data.userBadges;

        if (!cancelled) {
          setAchievements(list);
          if (Array.isArray(badges) && onBadgesUpdated) {
            onBadgesUpdated(badges);
          }
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'Something went wrong');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [userId, userPoints, attendedCount]);

  if (loading) {
    return (
      <div className="rewards-page">
        <p className="rewards-status">Loading achievements…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rewards-page">
        <p className="rewards-status rewards-error">{error}</p>
      </div>
    );
  }

  if (achievements.length === 0) {
    return (
      <div className="rewards-page">
        <header className="rewards-header">
          <h2>Achievements</h2>
          <p>Earn badges for attending events and racking up volunteer points—nothing to buy.</p>
        </header>
        <p className="rewards-empty">
          No achievement definitions loaded yet. If you’re an admin, run{' '}
          <code className="rewards-code">POST /api/rewards/seed</code> once on the API.
        </p>
      </div>
    );
  }

  return (
    <div className="rewards-page">
      <header className="rewards-header">
        <h2>Achievements</h2>
        <p>Track your volunteering journey and unlock milestone badges.</p>
        <div className="rewards-stats-strip">
          <div className="rewards-stat">
            <span className="rewards-stat-label">Volunteer points</span>
            <strong className="rewards-stat-value">{userPoints}</strong>
          </div>
          <div className="rewards-stat">
            <span className="rewards-stat-label">Events attended</span>
            <strong className="rewards-stat-value">{attendedCount}</strong>
          </div>
          <div className="rewards-stat rewards-stat--badges">
            <span className="rewards-stat-label">Badges unlocked</span>
            <strong className="rewards-stat-value">
              {achievements.filter((a) => a.unlocked).length} / {achievements.length}
            </strong>
          </div>
        </div>
      </header>

      <div className="rewards-grid">
        {achievements.map((a) => {
          const target = a.progressTarget || a.threshold || 1;
          const current = a.progressCurrent ?? 0;
          const pct = target > 0 ? Math.round((Math.min(current, target) / target) * 100) : 0;
          return (
            <article
              className={`reward-card ${a.unlocked ? 'reward-card--unlocked' : ''}`}
              key={a._id || a.badgeId}
            >
              <div className="reward-card-top">
                <span className="reward-emoji" aria-hidden>
                  {a.iconEmoji || '🏅'}
                </span>
                <div className="reward-card-headings">
                  <h3>{a.title}</h3>
                  <p className="reward-requirement">{requirementLabel(a)}</p>
                </div>
              </div>
              {a.description ? <p className="reward-desc">{a.description}</p> : null}

              {!a.unlocked ? (
                <div className="reward-progress-wrap">
                  <div className="reward-progress-bar" aria-label="Progress toward badge">
                    <div className="reward-progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="reward-progress-text">
                    {a.kind === 'events'
                      ? `${current} / ${target} events`
                      : `${current} / ${target} pts`}
                  </p>
                </div>
              ) : (
                <p className="reward-unlocked-pill">
                  ✓ Unlocked
                </p>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

export default Rewards;
