// DiscShrink Updates — content for the /updates pages.
// Newest first. Add new entries to the top of this array.
// `slug` becomes the URL: /updates/<slug>

export const CATEGORIES = {
  development: { label: "Development", icon: "🛠️" },
  features: { label: "Features", icon: "🚀" },
  fixes: { label: "Fixes", icon: "🔧" },
  behind: { label: "Behind DiscShrink", icon: "🧠" },
  community: { label: "Community", icon: "👥" },
  announcements: { label: "Announcements", icon: "📣" },
};

export const UPDATES = [
  {
    slug: "compression-improvements",
    title: "Making DiscShrink Faster",
    date: "2026-09-06",
    category: "features",
    summary:
      "We've made improvements to the compression system — faster processing and better bitrate targeting for your videos.",
    content: [
      "We've spent the last couple of weeks tuning the compression pipeline, and the results are already showing up in the queue times on the Status page.",
      "The biggest change is smarter bitrate targeting: DiscShrink now calculates a video's ideal bitrate from its exact length instead of a flat estimate, so a 45-second clip and a 4-minute clip both land much closer to your chosen target size (20MB, 19,765 KB, or 30,000 KB) on the first pass.",
      "We've also reduced average wait time in the compression queue, especially during busier hours, by tightening up how jobs are handed off to the FFmpeg engine.",
      "As always, you can watch this play out live on the Status page — check the average compression time stat to see the improvement for yourself.",
    ],
  },
  {
    slug: "new-features-improvements",
    title: "New Features & Improvements",
    date: "2026-08-28",
    category: "features",
    summary:
      "A roundup of smaller quality-of-life improvements across the site, from search to support.",
    content: [
      "This update is a grab-bag of the smaller things we've shipped recently that make DiscShrink a bit nicer to use day to day.",
      "Site search now covers Support and FAQ content directly, so if you're stuck on an error you can search for it from anywhere on the site and jump straight to the relevant answer.",
      "The Support page's contact form now surfaces related help articles as you type your message, before you even hit submit — often it'll point you to the fix before you need to wait for a reply.",
      "We've also cleaned up the queue display during compression so it's clearer whether your video is actively being compressed or just waiting its turn.",
    ],
  },
  {
    slug: "behind-the-compression-engine",
    title: "Behind the Compression Engine",
    date: "2026-08-12",
    category: "behind",
    summary:
      "A look at how DiscShrink actually compresses your videos, and why it targets specific file sizes instead of just \"lower quality.\"",
    content: [
      "A few people have asked how DiscShrink decides what to do with a video once you hit Compress, so here's a peek behind the curtain.",
      "Under the hood, every video is processed with FFmpeg — a free, open-source engine used by a huge chunk of the video tools on the internet. When your video is uploaded, our server calculates the bitrate needed to hit your chosen target size (say, 19,765 KB to just squeak under Discord's non-Nitro limit) based on the video's exact duration, then re-encodes it at that bitrate.",
      "This is different from just cranking down a generic \"quality\" slider — targeting file size directly means you get a predictable result that actually fits where you're trying to upload it, instead of guessing and re-exporting a few times.",
      "Every job runs through a queue system so the server isn't overwhelmed if a lot of people are compressing at once — you can watch your position in that queue in real time once you submit a video.",
    ],
  },
  {
    slug: "community-update",
    title: "Community Update",
    date: "2026-07-30",
    category: "community",
    summary: "What's been happening around DiscShrink lately, and where to reach us.",
    content: [
      "DiscShrink started as a small tool to solve one specific annoyance — Discord's upload limit — and it's been genuinely great seeing more people find it useful.",
      "If you've run into a bug, have a feature idea, or just want to say hi, the Support page's Contact Support button is the fastest way to reach us — every message gets a ticket number so you can reference it if you follow up.",
      "We read every piece of feedback that comes in through that form, and a good chunk of what ends up on this Updates page started as a suggestion from someone using the site.",
      "Thanks for using DiscShrink — more to come.",
    ],
  },
];

export function getUpdateBySlug(slug) {
  return UPDATES.find((u) => u.slug === slug) || null;
}

export function getLatestUpdate() {
  return UPDATES[0] || null;
}

export function formatUpdateDate(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
