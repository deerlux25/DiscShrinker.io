import { Link, useParams } from "react-router-dom";
import "./Updates.css";
import { CATEGORIES, formatUpdateDate, getUpdateBySlug } from "./updatesData";

function UpdateDetail() {
  const { slug } = useParams();
  const update = getUpdateBySlug(slug);

  if (!update) {
    return (
      <section className="updates-page">
        <div className="updates-title">
          <span className="updates-eyebrow">DISCSHRINK UPDATES</span>
          <h1>Update not found</h1>
          <p>We couldn't find that update — it may have been renamed or removed.</p>
        </div>
        <Link to="/updates" className="updates-back-link">
          ← Back to DiscShrink Updates
        </Link>
      </section>
    );
  }

  const info = CATEGORIES[update.category];

  return (
    <section className="updates-page">
      <Link to="/updates" className="updates-back-link">
        ← Back to DiscShrink Updates
      </Link>

      <div className="updates-detail">
        <div className="updates-detail-meta">
          {info && (
            <span className="updates-tag">
              {info.icon} {info.label}
            </span>
          )}
          <span className="updates-date">{formatUpdateDate(update.date)}</span>
        </div>

        <h1>{update.title}</h1>

        <div className="updates-detail-body">
          {update.content.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      </div>
    </section>
  );
}

export default UpdateDetail;
