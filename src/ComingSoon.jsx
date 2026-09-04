import "./ComingSoon.css";

function ComingSoon({ icon, title, subtitle, description }) {
  return (
    <section className="comingsoon-page">

      <div className="comingsoon-title">
        <span className="comingsoon-eyebrow">COMING SOON</span>
        <h1>{icon} {title}</h1>
        <p>{subtitle}</p>
      </div>

      <div className="comingsoon-card">
        <div className="comingsoon-badge">🚧 In development</div>
        <p className="comingsoon-description">{description}</p>
      </div>

    </section>
  );
}

export default ComingSoon;
