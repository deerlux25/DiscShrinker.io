import "./Legal.css";

const LAST_UPDATED = "September 2026";
const CONTACT_EMAIL = "discshrink@gmail.com";

function PrivacyContent() {
  return (
    <>
      <p className="legal-intro">
        DiscShrink ("we," "us") runs this site to help you compress videos so
        they fit Discord's upload limits. This page explains what
        information we collect, why, and how long we keep it.
      </p>

      <h2>Videos you upload</h2>
      <p>
        When you upload a video to compress, it's sent to our server, run
        through FFmpeg, and the compressed result is sent back to you. Both
        the original file and the compressed copy are deleted from our
        server automatically once the job finishes — whether it succeeds or
        fails. We don't view, share, sell, or use your videos for any
        purpose other than compressing and returning them to you.
      </p>

      <h2>Contact / support form</h2>
      <p>
        If you submit the support form, we collect your email address (and
        name and any diagnostic details, if you choose to include them) so
        we can respond to your issue. These are stored in a private support
        log and may also be forwarded to a private Discord channel we
        monitor. We don't sell or share this information, and we don't use
        it for marketing.
      </p>

      <h2>Cookies &amp; analytics</h2>
      <p>
        We don't currently use cookies, trackers, or third-party analytics
        on this site. If that changes, we'll update this page.
      </p>

      <h2>Hosting</h2>
      <p>
        This site is hosted on Render, which may log standard web request
        data (like IP addresses) as part of running its infrastructure and
        DDoS protection, independent of anything we do. That data is
        handled under Render's own policies, not ours.
      </p>

      <h2>Your choices</h2>
      <p>
        Since uploaded videos are deleted automatically right after
        processing, there's nothing to request removal of there. If you'd
        like us to delete a support ticket you submitted, or want to know
        what information we have tied to your email, just reach out below.
      </p>

      <h2>Children's privacy</h2>
      <p>
        This site isn't directed at children under 13, and we don't
        knowingly collect information from anyone under that age.
      </p>

      <h2>Wisconsin residents</h2>
      <p>
        As of {LAST_UPDATED}, Wisconsin has not enacted a comprehensive
        consumer data privacy law, so no specific state-law rights are
        required to be listed here. We've written this policy to be
        reasonable and transparent regardless. Wisconsin does have a data
        breach notification law covering certain sensitive identifiers
        (like Social Security or financial account numbers) — we don't
        collect that kind of information through this site.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        If this policy changes, we'll update the date below and post the
        revised version here.
      </p>

      <h2>Contact us</h2>
      <p>
        Questions about this policy or your data? Email us at{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </>
  );
}

function TermsContent() {
  return (
    <>
      <p className="legal-intro">
        By using DiscShrink, you agree to these terms. If you don't agree,
        please don't use the site.
      </p>

      <h2>The service</h2>
      <p>
        DiscShrink is a free tool that compresses video files you upload.
        It's provided "as is," without warranty of any kind — we don't
        guarantee it will always be available, error-free, or produce a
        particular output quality.
      </p>

      <h2>Your content</h2>
      <p>
        You keep all rights to any video you upload. You're responsible for
        making sure you actually have the right to upload and compress it.
        Don't upload anything illegal, infringing, malicious, or that you
        don't have permission to use.
      </p>

      <h2>Acceptable use</h2>
      <p>
        Please don't use this site to upload malware, abuse or overload our
        servers (scripted spam, automated scraping, etc.), attempt to
        bypass file or rate limits, or try to interfere with the service
        for other users.
      </p>

      <h2>Our content</h2>
      <p>
        The DiscShrink code, design, and branding are owned by DiscShrink
        and protected by copyright — see our LICENSE for details. This
        doesn't apply to videos you upload, which remain yours.
      </p>

      <h2>No liability</h2>
      <p>
        We're not liable for lost, corrupted, or delayed videos, service
        downtime, or any output quality issues. Keep a copy of your
        original file — we can't recover it once it's deleted from our
        server after processing.
      </p>

      <h2>Age requirement</h2>
      <p>
        This tool is meant for compressing videos for Discord, which
        requires users to be at least 13. Please don't use this site if
        you're under that age.
      </p>

      <h2>Changes</h2>
      <p>
        We may update the service or these terms at any time. Continuing to
        use the site after changes means you accept the updated terms.
      </p>

      <h2>Governing law</h2>
      <p>
        These terms are governed by the laws of the State of Wisconsin,
        without regard to conflict-of-law principles.
      </p>

      <h2>Contact us</h2>
      <p>
        Questions about these terms? Email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </>
  );
}

function Legal({ section = "privacy" }) {
  const isPrivacy = section === "privacy";

  return (
    <section className="legal-page">
      <div className="legal-title">
        <span className="legal-eyebrow">
          {isPrivacy ? "YOUR DATA" : "THE FINE PRINT"}
        </span>
        <h1>{isPrivacy ? "🔒 Privacy Policy" : "📄 Terms of Service"}</h1>
        <p className="legal-updated">Last updated: {LAST_UPDATED}</p>
      </div>

      <div className="legal-card">
        {isPrivacy ? <PrivacyContent /> : <TermsContent />}
      </div>
    </section>
  );
}

export default Legal;
