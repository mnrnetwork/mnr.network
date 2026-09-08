import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const CHROME_CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "google-chrome",
  "google-chrome-stable",
  "chromium",
  "chromium-browser",
  "chrome",
];

function findChrome(): string | null {
  for (const candidate of CHROME_CANDIDATES) {
    try {
      if (candidate.startsWith("/")) {
        if (fs.existsSync(candidate)) return candidate;
      } else {
        const out = execSync(`which ${candidate} 2>/dev/null`, { encoding: "utf8" }).trim();
        if (out && fs.existsSync(out)) return out;
      }
    } catch {}
  }
  return null;
}

interface OgJob {
  sourceHtml: string;
  targets: string[];
}

const JOBS: OgJob[] = [
  {
    sourceHtml: path.resolve(import.meta.dir, "../../mnr/brand/og-token.html"),
    targets: [
      path.resolve(import.meta.dir, "../public/og-token.png"),
      path.resolve(import.meta.dir, "../public/og-get-token.png"),
      path.resolve(import.meta.dir, "../../mnr/brand/og-token.png"),
    ],
  },
  {
    sourceHtml: path.resolve(import.meta.dir, "../../mnr/brand/og-upstreams.html"),
    targets: [
      path.resolve(import.meta.dir, "../public/og-upstreams.png"),
      path.resolve(import.meta.dir, "../../mnr/brand/og-upstreams.png"),
    ],
  },
  {
    sourceHtml: path.resolve(import.meta.dir, "../../mnr/brand/og-docs.html"),
    targets: [
      path.resolve(import.meta.dir, "../public/og-docs.png"),
      path.resolve(import.meta.dir, "../../mnr/brand/og-docs.png"),
    ],
  },
];

async function main() {
  const chrome = findChrome();
  if (!chrome) {
    console.error("Error: Chrome or Chromium executable not found.");
    process.exit(1);
  }

  console.log(`Using Chrome binary: ${chrome}`);
  const tmpRaw = "/tmp/mnr-og-raw.png";

  for (const job of JOBS) {
    const jobName = path.basename(job.sourceHtml, ".html");
    if (!fs.existsSync(job.sourceHtml)) {
      console.error(`Source not found: ${job.sourceHtml}`);
      continue;
    }

    console.log(`Rendering ${jobName}...`);
    const fileUrl = `file://${path.resolve(job.sourceHtml)}`;

    // 1. Capture high-res screenshot via headless Chrome
    const chromeCmd = `"${chrome}" --headless --disable-gpu --force-device-scale-factor=2 --window-size=1200,630 --screenshot="${tmpRaw}" "${fileUrl}"`;
    execSync(chromeCmd, { stdio: "ignore" });

    // 2. Downsample with ImageMagick for pristine antialiased 1200x630 output
    const firstTarget = job.targets[0];
    const magickCmd = `magick "${tmpRaw}" -resize 1200x630 -strip "${firstTarget}"`;
    execSync(magickCmd, { stdio: "inherit" });

    // 3. Copy to any alternate targets / aliases
    for (let i = 1; i < job.targets.length; i++) {
      fs.copyFileSync(firstTarget, job.targets[i]);
    }

    if (fs.existsSync(tmpRaw)) {
      fs.unlinkSync(tmpRaw);
    }

    console.log(`✓ Generated ${job.targets.map((t) => path.basename(t)).join(", ")}`);
  }

  console.log("Done building all OpenGraph images!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
