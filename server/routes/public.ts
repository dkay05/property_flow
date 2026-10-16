import { Router, type Request } from "express";
import { db } from "../db";
import { properties } from "@shared/schema";
import { eq } from "drizzle-orm";
import { extractYouTubeId, youTubeThumbnail } from "../../lib/youtube";

const router = Router();

/** Everything here is rendered into HTML, so escape every interpolated value. */
function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatCurrency(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} Lakh`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
  return `₹${amount}`;
}

const FURNISHING: Record<string, string> = {
  furnished: "Furnished",
  semi_furnished: "Semi-Furnished",
  unfurnished: "Unfurnished",
};

const STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  available: { label: "Available", bg: "#22c55e", fg: "#ffffff" },
  sold: { label: "Sold", bg: "#171e19", fg: "#ffffff" },
  rented_out: { label: "Rented Out", bg: "#3b82f6", fg: "#ffffff" },
  on_hold: { label: "On Hold", bg: "#eab308", fg: "#171e19" },
  under_offer: { label: "Under Offer", bg: "#eab308", fg: "#171e19" },
  inactive: { label: "Inactive", bg: "#9ca3af", fg: "#ffffff" },
};

const TYPE_LABEL: Record<string, string> = {
  residential: "Residential",
  commercial: "Commercial",
  rental: "Rental",
  land: "Land",
  villa: "Villa",
  plot: "Plot",
};

function baseUrlOf(req: Request): string {
  const proto = req.header("x-forwarded-proto") || req.protocol || "http";
  const host = req.header("x-forwarded-host") || req.get("host");
  return `${proto}://${host}`;
}

function absolute(base: string, url?: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//.test(url)) return url;
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
}

function notFoundPage(): string {
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Listing not available</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
       background:#ffe17c;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;padding:24px}
  .box{background:#fff;border:3px solid #000;box-shadow:8px 8px 0 #000;padding:32px;max-width:420px;text-align:center}
  h1{margin:0 0 8px;font-size:22px}
  p{margin:0;color:#555;font-size:15px;line-height:1.5}
</style></head>
<body><div class="box"><h1>Listing not available</h1>
<p>This property link is invalid or the listing has been removed.</p></div></body></html>`;
}

function renderPage(p: typeof properties.$inferSelect, base: string): string {
  const images: string[] = Array.isArray(p.images) ? (p.images as string[]) : [];
  const amenities: string[] = Array.isArray(p.amenities) ? (p.amenities as string[]) : [];

  const videoId = extractYouTubeId(p.videoUrl);
  const photoUrls = images.map((i) => absolute(base, i)).filter(Boolean) as string[];
  const previewImage = photoUrls[0] || youTubeThumbnail(p.videoUrl) || null;

  const status = STATUS[p.status] || { label: p.status, bg: "#9ca3af", fg: "#ffffff" };
  const title = `${p.address}, ${p.area}`;
  const price = formatCurrency(p.price);

  const specs = [
    p.bedrooms ? `${p.bedrooms} BHK` : null,
    p.bathrooms ? `${p.bathrooms} Bath` : null,
    p.carpetArea ? `${p.carpetArea} sq ft` : null,
    FURNISHING[p.furnishing] || p.furnishing,
  ].filter(Boolean) as string[];

  const description = `${price} · ${specs.join(" · ")} · ${p.area}, ${p.city}`;

  const detailCards = [
    p.bedrooms ? { value: `${p.bedrooms}`, label: "Bedrooms" } : null,
    p.bathrooms ? { value: `${p.bathrooms}`, label: "Bathrooms" } : null,
    p.carpetArea ? { value: `${p.carpetArea}`, label: "Sq Ft" } : null,
    { value: FURNISHING[p.furnishing] || p.furnishing, label: "Furnishing" },
    { value: TYPE_LABEL[p.propertyType] || p.propertyType, label: "Type" },
  ].filter(Boolean) as { value: string; label: string }[];

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} — ${esc(price)}</title>
<meta name="description" content="${esc(description)}">

<meta property="og:type" content="website">
<meta property="og:title" content="${esc(price)} — ${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:site_name" content="PropertyFlow">
${previewImage ? `<meta property="og:image" content="${esc(previewImage)}">` : ""}
<meta name="twitter:card" content="${previewImage ? "summary_large_image" : "summary"}">
<meta name="twitter:title" content="${esc(price)} — ${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
${previewImage ? `<meta name="twitter:image" content="${esc(previewImage)}">` : ""}

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap" rel="stylesheet">
<style>
  :root{
    --yellow:#ffe17c; --charcoal:#171e19; --black:#000; --white:#fff;
    --gray:#6b7280; --light:#f5f5f5; --sage:#b7c6c2;
  }
  *{box-sizing:border-box}
  body{
    margin:0;background:var(--yellow);color:var(--black);
    font-family:"DM Sans",system-ui,-apple-system,"Segoe UI",sans-serif;
    padding:16px;line-height:1.45;
  }
  .wrap{max-width:720px;margin:0 auto}
  .card{
    background:var(--white);border:3px solid var(--black);
    box-shadow:6px 6px 0 var(--black);padding:18px;margin-bottom:16px;
  }
  .brand{
    display:flex;align-items:center;gap:8px;font-weight:800;font-size:15px;
    letter-spacing:-0.3px;margin-bottom:14px;
  }
  .brand .dot{
    width:26px;height:26px;border:2px solid var(--black);background:var(--yellow);
    display:grid;place-items:center;font-size:14px;
  }
  .badge{
    display:inline-block;font-weight:700;font-size:11px;letter-spacing:1px;
    text-transform:uppercase;padding:4px 10px;border:2px solid var(--black);
  }
  .price{font-size:40px;font-weight:800;letter-spacing:-1.5px;margin:10px 0 2px;line-height:1.1}
  .addr{font-size:18px;font-weight:700;margin:0}
  .area{font-size:14px;color:var(--gray);margin:2px 0 0}
  .label{
    font-size:11px;font-weight:800;letter-spacing:1.2px;color:var(--charcoal);
    text-transform:uppercase;margin:0 0 12px;
  }
  .videoBox{position:relative;width:100%;padding-top:56.25%;border:3px solid var(--black);background:#000}
  .videoBox iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
  .gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
  .gallery img{
    width:100%;aspect-ratio:4/3;object-fit:cover;border:2px solid var(--black);
    background:var(--light);display:block;cursor:zoom-in;
  }
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px}
  .cell{border:2px solid var(--black);background:var(--light);padding:12px;text-align:center}
  .cell .v{font-size:17px;font-weight:700}
  .cell .l{font-size:11px;color:var(--gray);margin-top:2px}
  .chips{display:flex;flex-wrap:wrap;gap:8px}
  .chip{
    background:var(--sage);border:2px solid var(--black);
    padding:5px 10px;font-size:13px;font-weight:500;
  }
  .foot{text-align:center;font-size:12px;color:var(--charcoal);opacity:.75;padding:4px 0 20px}
  .lightbox{
    position:fixed;inset:0;background:rgba(0,0,0,.9);display:none;
    align-items:center;justify-content:center;padding:20px;z-index:50;cursor:zoom-out;
  }
  .lightbox.open{display:flex}
  .lightbox img{max-width:100%;max-height:100%;border:3px solid var(--white)}
  @media(max-width:480px){
    .price{font-size:32px}
    .card{padding:14px;box-shadow:4px 4px 0 var(--black)}
  }
</style>
</head>
<body>
<div class="wrap">

  <div class="card">
    <div class="brand"><span class="dot">🏠</span><span>PropertyFlow</span></div>
    <span class="badge" style="background:${esc(status.bg)};color:${esc(status.fg)}">${esc(status.label)}</span>
    <div class="price">${esc(price)}</div>
    <p class="addr">${esc(p.address)}</p>
    <p class="area">${esc(p.area)}, ${esc(p.city)}</p>
  </div>

  ${
    videoId
      ? `<div class="card">
    <p class="label">Property Video</p>
    <div class="videoBox">
      <iframe src="https://www.youtube-nocookie.com/embed/${esc(videoId)}"
        title="Property video" loading="lazy" allowfullscreen
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>
    </div>
  </div>`
      : ""
  }

  ${
    photoUrls.length
      ? `<div class="card">
    <p class="label">Photos</p>
    <div class="gallery">
      ${photoUrls
        .map(
          (u) =>
            `<img src="${esc(u)}" alt="${esc(p.address)}" loading="lazy" onclick="zoom(this.src)">`,
        )
        .join("\n      ")}
    </div>
  </div>`
      : ""
  }

  <div class="card">
    <p class="label">Property Details</p>
    <div class="grid">
      ${detailCards
        .map((d) => `<div class="cell"><div class="v">${esc(d.value)}</div><div class="l">${esc(d.label)}</div></div>`)
        .join("\n      ")}
    </div>
  </div>

  ${
    amenities.length
      ? `<div class="card">
    <p class="label">Amenities</p>
    <div class="chips">
      ${amenities.map((a) => `<span class="chip">${esc(a)}</span>`).join("\n      ")}
    </div>
  </div>`
      : ""
  }

  <p class="foot">Shared via PropertyFlow</p>
</div>

<div class="lightbox" id="lb" onclick="this.classList.remove('open')"><img id="lbImg" alt=""></div>
<script>
  function zoom(src){
    document.getElementById('lbImg').src = src;
    document.getElementById('lb').classList.add('open');
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') document.getElementById('lb').classList.remove('open');
  });
</script>
</body>
</html>`;
}

// GET /p/:id — public, no auth. This link is what gets shared.
router.get("/p/:id", async (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");

  const id = req.params.id;
  // Ids are uuids; anything else is a bad link, and querying would throw.
  if (!/^[0-9a-fA-F-]{36}$/.test(id)) {
    return res.status(404).send(notFoundPage());
  }

  const [property] = await db.select().from(properties).where(eq(properties.id, id));
  if (!property) return res.status(404).send(notFoundPage());

  res.send(renderPage(property, baseUrlOf(req)));
});

export default router;
