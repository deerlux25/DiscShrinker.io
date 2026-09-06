import { Link } from "react-router-dom";
import "./Updates.css";
import { UPDATES, CATEGORIES, formatUpdateDate } from "./updatesData";

function CategoryTag({ category }) {
  const info = CATEGORIES[category];
  if (!info) return null;
  return (
    <span className="updates-tag">
      {info.icon} {info.label}
    </span>
  );
}

function UpdatesArchive() {
  const [latest, ...previous] = UPDATES;

  return (
    <section className="updates-page">
      <div className="updates-title">
        <span className="updates-eyebrow">DISCSHRINK UPDATES</span>
        <h1>📰 DiscShrink Updates</h1>
        <p>What's happening behind DiscShrink.</p>
      </div>

      {latest && (
        <div className="updates-latest">
          <span className="updates-latest-label">📌 Latest Update</span>
          <Link to={`/updates/${latest.slug}`} className="updates-latest-card">
            <div className="updates-latest-meta">
              <CategoryTag category={latest.category} />
              <span className="updates-date">{formatUpdateDate(latest.date)}</span>
            </div>
            <h2>{latest.title}</h2>
            <p>{latest.summary}</p>
            <span className="updates-read-more">Read Full Update →</span>
          </Link>
        </div>
      )}

      {previous.length > 0 && (
        <div className="updates-previous">
          <h3>Previous Updates</h3>
          <div className="updates-list">
            {previous.map((update) => (
              <Link key={update.slug} to={`/updates/${update.slug}`} className="updates-list-item">
                <div className="updates-list-item-meta">
                  <CategoryTag category={update.category} />
                  <span className="updates-date">{formatUpdateDate(update.date)}</span>
                </div>
                <h4>{update.title}</h4>
                <p>{update.summary}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default UpdatesArchive;
