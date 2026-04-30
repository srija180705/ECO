import { useEffect, useState } from 'react';
import { apiFetch } from '../api';
import './Rewards.css';

const API = '/api/rewards';

function Rewards({ userId, userPoints, onPointsUpdated }) {
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [banner, setBanner] = useState(null);
  const [redeemingId, setRedeemingId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch(API);
        if (!res.ok) throw new Error('Failed to load rewards');
        const data = await res.json();
        if (!cancelled) setRewards(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Something went wrong');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRedeem = async (r) => {
    if (!userId) return;
    if (userPoints < r.pointsRequired) {
      setBanner({ type: 'err', text: 'Not enough points' });
      return;
    }
    setRedeemingId(r._id);
    setBanner(null);
    try {
      const res = await apiFetch(`${API}/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, rewardId: r._id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBanner({ type: 'err', text: data.message || 'Could not redeem' });
        return;
      }
      if (typeof data.points === 'number') {
        onPointsUpdated(data.points);
        try {
          const cur = JSON.parse(localStorage.getItem('user') || '{}');
          localStorage.setItem('user', JSON.stringify({ ...cur, points: data.points }));
        } catch {
          /* noop */
        }
      }
      setBanner({ type: 'ok', text: `You redeemed “${r.title}”. New balance: ${data.points} pts.` });
    } finally {
      setRedeemingId(null);
    }
  };

  if (loading) {
    return (
      <div className="rewards-page">
        <p className="rewards-status">Loading rewards…</p>
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

  if (rewards.length === 0) {
    return (
      <div className="rewards-page">
        <header className="rewards-header">
          <h2>Rewards</h2>
          <p>Redeem your volunteer points for perks</p>
        </header>
        <p className="rewards-empty">No rewards available</p>
      </div>
    );
  }

  return (
    <div className="rewards-page">
      <header className="rewards-header">
        <h2>Rewards</h2>
        <p>Redeem your volunteer points for perks</p>
        <p className="rewards-balance">
          Your balance: <strong>{userPoints}</strong> pts
        </p>
      </header>

      {banner ? (
        <div className={`rewards-banner ${banner.type === 'ok' ? 'rewards-banner--ok' : 'rewards-banner--err'}`} role="status">
          {banner.text}
        </div>
      ) : null}

      <div className="rewards-grid">
        {rewards.map((r) => {
          const canAfford = userId && userPoints >= r.pointsRequired;
          const busy = redeemingId === r._id;
          return (
            <article className="reward-card" key={r._id}>
              <div className="reward-card-top">
                <h3>{r.title}</h3>
                <div className="reward-points-pill">
                  <span>⭐</span>
                  <span>{r.pointsRequired} pts</span>
                </div>
              </div>
              {r.description ? <p className="reward-desc">{r.description}</p> : null}
              <button
                type="button"
                className="reward-redeem-btn"
                disabled={!userId || !canAfford || busy}
                onClick={() => handleRedeem(r)}
              >
                {busy ? 'Redeeming…' : 'Redeem'}
              </button>
              {!userId ? (
                <p className="reward-hint reward-hint--muted">Sign in to redeem rewards.</p>
              ) : !canAfford ? (
                <p className="reward-hint">Not enough points</p>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}

export default Rewards;
