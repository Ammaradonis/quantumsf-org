import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const stylesPath = path.join(rootDir, "src", "styles.css");
const clientPath = path.join(rootDir, "src", "client.js");
const origin = "https://quantumsf.org";

const footerHeadings = new Set([
  "Reviews",
  "Facebook",
  "Community Dojo",
  "Support Our Kids",
  "Our Sister Schools",
  "Post navigation",
  "Discover more from Quantum Martial Arts San Francisco",
  "Leave a ReplyCancel reply"
]);

const primaryNav = [
  ["/", "Home"],
  ["/adults-martial-arts/", "Adults"],
  ["/teens-martial-arts/", "Teens"],
  ["/kids-martial-arts/", "Kids"],
  ["/schedule/", "Schedule"],
  ["/membership/", "Membership"],
  ["/instructors/", "Instructors"],
  ["/donate/", "Donate", "nav-donate"]
];

const featuredLinks = [
  ["/adults-martial-arts/", "Martial Arts for Adults"],
  ["/teens-martial-arts/", "Martial Arts for Teens"],
  ["/kids-martial-arts/", "Martial Arts for Kids"],
  ["/community-workshops/", "Community Workshops"],
  ["/studio-space-rental/", "Studio Space"],
  ["/dojo/", "Dojo"],
  ["/instructors/", "Instructors"],
  ["/schedule/", "Schedule"]
];

const scheduleLinks = [
  ["/adult-class-schedule/", "Adult Class Schedule", "Ages 13+"],
  ["/teen-class-schedule/", "Teen Class Schedule", "Ages 10-14"],
  ["/kids-class-schedule/", "Kids Class Schedule", "Ages 6-9"],
  ["/quarks-class-schedule/", "Quarks Class Schedule", "Ages 4-5"]
];

function readJsonFiles() {
  return fs
    .readdirSync(rootDir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => {
      const fullPath = path.join(rootDir, file);
      return { file, json: JSON.parse(fs.readFileSync(fullPath, "utf8")) };
    });
}

function normalizePath(input) {
  const url = input.startsWith("http") ? new URL(input) : new URL(input, origin);
  let pathname = decodeURI(url.pathname);
  if (!pathname.endsWith("/")) {
    pathname += "/";
  }
  return pathname.replace(/\/+/g, "/");
}

function localizeUrl(value) {
  if (!value || typeof value !== "string") {
    return value;
  }

  let next = value
    .replaceAll("https:\\/\\/quantumsf.org\\/", "\\/")
    .replaceAll("http:\\/\\/quantumsf.org\\/", "\\/")
    .replaceAll("https://quantumsf.org/", "/")
    .replaceAll("http://quantumsf.org/", "/");

  next = next.replace(/href=(["'])\/([^"'\s?#]+)(["'#?])/g, (match, quote, hrefPath, end) => {
    if (hrefPath.includes(".") || hrefPath.endsWith("/")) {
      return `href=${quote}/${hrefPath}${end}`;
    }
    return `href=${quote}/${hrefPath}/${end}`;
  });

  return next;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function stripSiteTitle(title = "") {
  return title
    .replace(/\s+[–-]\s+Quantum Martial Arts San Francisco.*$/i, "")
    .replace(/^Quantum Martial Arts San Francisco\s+[–-]\s+/i, "")
    .trim();
}

function cleanExcerpt(html = "") {
  return html
    .replace(/<a\b[^>]*class=["'][^"']*more-link[^"']*["'][\s\S]*?<\/a>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function textToParagraphs(text = "", headings = []) {
  let body = text.replace(/\s+/g, " ").trim();
  for (const heading of headings) {
    if (footerHeadings.has(heading.text)) {
      const index = body.indexOf(heading.text);
      if (index > 120) {
        body = body.slice(0, index).trim();
        break;
      }
    }
  }

  if (!body) {
    return "";
  }

  const sentences = body.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) || [body];
  const paragraphs = [];
  let current = "";

  for (const sentence of sentences.map((item) => item.trim()).filter(Boolean)) {
    if ((current + " " + sentence).trim().length > 460 && current) {
      paragraphs.push(current.trim());
      current = sentence;
    } else {
      current = `${current} ${sentence}`.trim();
    }
  }

  if (current) {
    paragraphs.push(current.trim());
  }

  return paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("\n");
}

function sanitizeContent(html = "") {
  return localizeUrl(html)
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/<meta\b[^>]*>/gi, "")
    .replace(/\sclass="more-link"/g, ' class="more-link button"')
    .replace(/<iframe\b/gi, '<iframe loading="lazy"')
    .replace(/<img\b(?![^>]*\bloading=)/gi, '<img loading="lazy"');
}

function getHeadingTitle(doc, wpPage) {
  if (doc?.content?.headings?.length) {
    const first = doc.content.headings.find((heading) => !footerHeadings.has(heading.text));
    if (first?.text) {
      return first.text;
    }
  }

  if (wpPage?.title?.rendered) {
    return wpPage.title.rendered;
  }

  return stripSiteTitle(doc?.page?.title || "Quantum Martial Arts San Francisco");
}

function getHeroImage(doc, fallbackDocs = []) {
  const sources = [doc, ...fallbackDocs].filter(Boolean);
  for (const source of sources) {
    const images = source.images || [];
    const hero =
      images.find((image) => image.inferred_purpose === "hero" && !isTrackingPixel(image.src)) ||
      images.find((image) => image.inferred_purpose === "content" && !isTrackingPixel(image.src)) ||
      images.find((image) => !isLogo(image.src) && !isTrackingPixel(image.src));
    if (hero?.src) {
      return hero.src;
    }
  }
  return "https://i0.wp.com/quantumsf.org/wp-content/uploads/2016/10/adults_feature_1920w.jpg?resize=1920%2C900&ssl=1";
}

function isLogo(src = "") {
  return src.includes("quantum_rework_logo") || src.includes("yelp_button") || src.includes("paypalobjects.com");
}

function isTrackingPixel(src = "") {
  return src.includes("pixel.wp.com") || src.includes("/g.gif");
}

function uniqueImages(images = []) {
  const seen = new Set();
  return images
    .filter((image) => image?.src && !seen.has(image.src) && !isTrackingPixel(image.src) && !isLogo(image.src))
    .filter((image) => {
      seen.add(image.src);
      return true;
    });
}

function imageGallery(images = []) {
  const cleanImages = uniqueImages(images).slice(0, 12);
  if (!cleanImages.length) {
    return "";
  }

  return `
    <section class="section alt">
      <div class="section-inner">
        <h2 class="section-title">From the Dojo</h2>
        <div class="gallery-grid">
          ${cleanImages
            .map(
              (image) => `
            <figure class="media-card">
              <img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt || image.surrounding_text || "Quantum Martial Arts")}" loading="lazy">
              ${image.alt || image.surrounding_text ? `<figcaption>${escapeHtml(image.alt || image.surrounding_text)}</figcaption>` : ""}
            </figure>`
            )
            .join("")}
        </div>
      </div>
    </section>`;
}

function firstParagraphs(html = "", count = 3) {
  const matches = html.match(/<p>[\s\S]*?<\/p>/g);
  if (!matches) {
    return html;
  }
  return matches.slice(0, count).join("\n");
}

function getLogo(docs) {
  for (const doc of docs) {
    const logo = (doc.json.images || []).find((image) => image.inferred_purpose === "logo" && image.src.includes("quantum_rework_logo"));
    if (logo?.src) {
      return logo.src;
    }
  }
  return "https://i0.wp.com/quantumsf.org/wp-content/uploads/2016/02/quantum_rework_logo_500x500_trans.png?fit=60%2C60&ssl=1";
}

function header(activePath, logoSrc) {
  return `
    <header class="site-header">
      <div class="header-inner">
        <a class="brand" href="/">
          <img src="${escapeHtml(logoSrc)}" alt="" width="60" height="60">
          <span>
            <strong>Quantum Martial Arts</strong>
            <span>San Francisco nonprofit dojo</span>
          </span>
        </a>
        <button class="menu-button" type="button" aria-label="Open navigation" aria-expanded="false" data-menu-button><span></span></button>
        <nav class="site-nav" aria-label="Primary navigation" data-nav>
          ${primaryNav
            .map(([href, label, className]) => {
              const active = href === activePath ? ' aria-current="page"' : "";
              return `<a${className ? ` class="${className}"` : ""} href="${href}"${active}>${label}</a>`;
            })
            .join("")}
        </nav>
      </div>
    </header>`;
}

function footer() {
  return `
    <footer class="site-footer">
      <div class="footer-inner">
        <div class="footer-grid">
          <div>
            <h2>Quantum Martial Arts San Francisco</h2>
            <p>A registered 501(c)(3) nonprofit community dojo in San Francisco's Mission District.</p>
          </div>
          <div>
            <h3>Programs</h3>
            <ul>
              <li><a href="/adults-martial-arts/">Adults</a></li>
              <li><a href="/teens-martial-arts/">Teens</a></li>
              <li><a href="/kids-martial-arts/">Kids</a></li>
              <li><a href="/kids-martial-arts/quarks/">Quarks</a></li>
            </ul>
          </div>
          <div>
            <h3>Dojo</h3>
            <ul>
              <li><a href="/dojo/">The Dojo</a></li>
              <li><a href="/instructors/">Instructors</a></li>
              <li><a href="/mission-vision-history/">Mission, Vision & History</a></li>
              <li><a href="/community-workshops/">Community Workshops</a></li>
            </ul>
          </div>
          <div>
            <h3>Support</h3>
            <ul>
              <li><a href="/membership/">Membership</a></li>
              <li><a href="/donate/">Donate</a></li>
              <li><a href="/donors/">Community Partners</a></li>
              <li><a href="/shop/">Quantum Store</a></li>
            </ul>
          </div>
        </div>
        <div class="footer-bottom">Content and assets generated from the supplied quantumsf.org JSON crawl documents.</div>
      </div>
    </footer>`;
}

function htmlShell({ title, description, body, pathName, logoSrc, image }) {
  const cleanTitle = title.includes("Quantum Martial Arts San Francisco") ? title : `${title} - Quantum Martial Arts San Francisco`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(cleanTitle)}</title>
  <meta name="description" content="${escapeHtml(description || "Quantum Martial Arts San Francisco is a nonprofit martial arts school in San Francisco's Mission District.")}">
  <meta property="og:title" content="${escapeHtml(cleanTitle)}">
  <meta property="og:description" content="${escapeHtml(description || "A nonprofit community dojo in San Francisco's Mission District.")}">
  <meta property="og:image" content="${escapeHtml(image || "")}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${origin}${pathName === "/" ? "/" : pathName}">
  <link rel="canonical" href="${origin}${pathName === "/" ? "/" : pathName}">
  <link rel="stylesheet" href="/assets/styles.css">
  <script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "SportsActivityLocation",
    name: "Quantum Martial Arts San Francisco",
    url: origin,
    nonprofitStatus: "Nonprofit501c3",
    image,
    address: {
      "@type": "PostalAddress",
      addressLocality: "San Francisco",
      addressRegion: "CA",
      addressCountry: "US"
    },
    sport: "Martial Arts"
  })}</script>
</head>
<body>
  ${header(pathName, logoSrc)}
  ${body}
  ${footer()}
  <script src="/assets/client.js" type="module"></script>
</body>
</html>`;
}

function buildHome({ homeDoc, docsByPath, logoSrc }) {
  const heroImages = uniqueImages(homeDoc.images || []).filter((image) => image.inferred_purpose === "hero");
  const heroImage = heroImages[0]?.src || getHeroImage(homeDoc);
  const aboutText = homeDoc.content.visible_text.split("Reviews")[0].trim();
  const lede =
    "A nonprofit community studio offering martial arts classes for all ages, focused on self-actualization, total body healing, and strength.";

  const programCards = [
    {
      title: "Martial Arts for Adults",
      href: "/adults-martial-arts/",
      image: getHeroImage(docsByPath.get("/adults-martial-arts/"), [homeDoc]),
      text: "Classes for all skill levels, with foundational striking, partner work, forms, grappling concepts, and conditioning."
    },
    {
      title: "Martial Arts for Teens",
      href: "/teens-martial-arts/",
      image: getHeroImage(docsByPath.get("/teens-martial-arts/"), [homeDoc]),
      text: "Dedicated teen classes for growing students, with structure, discipline, movement, and confidence-building."
    },
    {
      title: "Martial Arts for Kids",
      href: "/kids-martial-arts/",
      image: getHeroImage(docsByPath.get("/kids-martial-arts/"), [homeDoc]),
      text: "Youth programs for Quarks, Kids, and Teens with movement play, body awareness, and positive learning."
    }
  ];

  const body = `
    <main>
      <section class="hero">
        <img src="${escapeHtml(heroImage)}" alt="Quantum Martial Arts class in San Francisco">
        <div class="hero-content">
          <p class="eyebrow">Nonprofit martial arts school</p>
          <h1>Quantum Martial Arts San Francisco</h1>
          <p>${escapeHtml(lede)}</p>
          <div class="hero-actions">
            <a class="button" href="/schedule/">Class Schedule</a>
            <a class="button secondary" href="/membership/">Membership</a>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-inner">
          <h2 class="section-title">Programs for every age and stage</h2>
          <div class="program-grid">
            ${programCards
              .map(
                (card) => `
              <article class="program-card">
                <img src="${escapeHtml(card.image)}" alt="${escapeHtml(card.title)}" loading="lazy">
                <div>
                  <h3>${escapeHtml(card.title)}</h3>
                  <p>${escapeHtml(card.text)}</p>
                  <a href="${card.href}">Read more</a>
                </div>
              </article>`
              )
              .join("")}
          </div>
        </div>
      </section>

      <section class="section alt">
        <div class="section-inner">
          <h2 class="section-title">About Us</h2>
          <div class="feature-grid">
            <div class="page-content">${firstParagraphs(textToParagraphs(aboutText, homeDoc.content.headings), 3)}</div>
            <div class="quick-links">
              ${featuredLinks.map(([href, label]) => `<a href="${href}">${label}</a>`).join("")}
            </div>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-inner">
          <h2 class="section-title">Class schedules</h2>
          <div class="schedule-grid">
            ${scheduleLinks
              .map(
                ([href, label, ages]) => `
              <article class="schedule-card">
                <h3>${label}</h3>
                <p>${ages}</p>
                <a href="${href}">View schedule</a>
              </article>`
              )
              .join("")}
          </div>
        </div>
      </section>

      ${imageGallery(homeDoc.images)}

      <section class="section contact-band">
        <div class="section-inner">
          <h2 class="section-title">Community Dojo</h2>
          <p class="lede">Quantum Martial Arts is a registered 501(c)(3) nonprofit in the State of California. Donations support youth scholarships and community access to training.</p>
          <div class="hero-actions">
            <a class="button" href="/donate/">Donate</a>
            <a class="button secondary" href="/community-workshops/">Community Workshops</a>
          </div>
        </div>
      </section>
    </main>`;

  return htmlShell({
    title: homeDoc.page.title,
    description: homeDoc.page.meta_description || lede,
    body,
    pathName: "/",
    logoSrc,
    image: heroImage
  });
}

function pageSidebar(pagePath) {
  const related = [];

  if (pagePath.includes("adult")) {
    related.push(["/adult-class-schedule/", "Adult schedule"], ["/adult-martial-arts-curriculum/", "Adult curriculum"], ["/adult-martial-arts-curriculum/videos/", "Adult videos"]);
  } else if (pagePath.includes("teen")) {
    related.push(["/teen-class-schedule/", "Teen schedule"], ["/teens-martial-arts/curriculum/", "Teen curriculum"], ["/teens-martial-arts/teens-distance-learning/", "Teen videos"]);
  } else if (pagePath.includes("kids") || pagePath.includes("quarks")) {
    related.push(["/kids-class-schedule/", "Kids schedule"], ["/quarks-class-schedule/", "Quarks schedule"], ["/kids-teens-martial-arts-curriculum/", "Kids curriculum"]);
  } else {
    related.push(["/schedule/", "Schedule"], ["/membership/", "Membership"], ["/donate/", "Donate"]);
  }

  return `
    <aside class="side-panel" aria-label="Related pages">
      <h3>Related</h3>
      <ul>
        ${related.map(([href, label]) => `<li><a href="${href}">${label}</a></li>`).join("")}
      </ul>
    </aside>`;
}

function buildGenericPage({ doc, wpPage, pagePath, homeDoc, logoSrc }) {
  const title = getHeadingTitle(doc, wpPage);
  const heroImage = getHeroImage(doc, [homeDoc]);
  const excerpt = wpPage ? cleanExcerpt(wpPage.excerpt?.rendered || "") : "";
  const description = doc.page.meta_description || excerpt || `${title} at Quantum Martial Arts San Francisco.`;

  const contentHtml = wpPage
    ? sanitizeContent(wpPage.content?.rendered || "")
    : textToParagraphs(doc.content?.visible_text || "", doc.content?.headings || []);

  const ctas = (doc.content?.ctas || [])
    .filter((cta) => cta.href && !cta.text.match(/search|post comment/i))
    .slice(0, 5)
    .map((cta) => ({ ...cta, href: localizeUrl(cta.href) }));

  const body = `
    <main>
      <section class="page-hero">
        <img src="${escapeHtml(heroImage)}" alt="${escapeHtml(title)}">
        <div class="page-hero-content">
          <p class="eyebrow">Quantum Martial Arts San Francisco</p>
          <h1>${escapeHtml(title)}</h1>
          ${description ? `<p>${escapeHtml(description)}</p>` : ""}
          ${
            ctas.length
              ? `<div class="cta-list">${ctas.map((cta) => `<a class="button secondary" href="${escapeHtml(cta.href)}">${escapeHtml(cta.text)}</a>`).join("")}</div>`
              : ""
          }
        </div>
      </section>

      <section class="section">
        <div class="section-inner content-shell">
          <article class="page-content">${contentHtml}</article>
          ${pageSidebar(pagePath)}
        </div>
      </section>
      ${wpPage ? "" : imageGallery(doc.images)}
    </main>`;

  return htmlShell({
    title,
    description,
    body,
    pathName: pagePath,
    logoSrc,
    image: heroImage
  });
}

function buildContactPage({ logoSrc, homeDoc }) {
  const heroImage = getHeroImage(homeDoc);
  const body = `
    <main>
      <section class="page-hero">
        <img src="${escapeHtml(heroImage)}" alt="Quantum Martial Arts dojo">
        <div class="page-hero-content">
          <p class="eyebrow">Quantum Martial Arts San Francisco</p>
          <h1>Contact Us</h1>
          <p>Use this page to collect class, membership, and community workshop inquiries.</p>
        </div>
      </section>
      <section class="section">
        <div class="section-inner content-shell">
          <article class="page-content">
            <h2>Class and membership inquiries</h2>
            <p>Send a note about adult classes, teen classes, kids classes, Quarks classes, community workshops, or membership.</p>
            <form class="contact-form" name="contact" method="get" action="/contact-us/">
              <div class="field-grid">
                <label>Name <input name="name" autocomplete="name" required></label>
                <label>Email <input type="email" name="email" autocomplete="email" required></label>
              </div>
              <label>Program
                <select name="program">
                  <option>Adult classes</option>
                  <option>Teen classes</option>
                  <option>Kids classes</option>
                  <option>Quarks classes</option>
                  <option>Community workshops</option>
                </select>
              </label>
              <label>Message <textarea name="message" required></textarea></label>
              <button type="submit">Send inquiry</button>
            </form>
          </article>
          ${pageSidebar("/contact-us/")}
        </div>
      </section>
    </main>`;

  return htmlShell({
    title: "Contact Us",
    description: "Contact Quantum Martial Arts San Francisco.",
    body,
    pathName: "/contact-us/",
    logoSrc,
    image: heroImage
  });
}

function writeRoute(pagePath, html) {
  const outputDir = pagePath === "/" ? distDir : path.join(distDir, pagePath);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "index.html"), html);
}

function build() {
  fs.rmSync(distDir, { recursive: true, force: true });
  fs.mkdirSync(path.join(distDir, "assets"), { recursive: true });
  fs.copyFileSync(stylesPath, path.join(distDir, "assets", "styles.css"));
  fs.copyFileSync(clientPath, path.join(distDir, "assets", "client.js"));

  const files = readJsonFiles();
  const logoSrc = getLogo(files);
  const wpPages = new Map();
  const docsByPath = new Map();

  for (const { file, json } of files) {
    if (file.includes("_wp_json_wp_v2_pages_")) {
      try {
        const page = JSON.parse(json.content.visible_text);
        wpPages.set(normalizePath(page.link), page);
      } catch {
        // Non-page API captures are ignored.
      }
      continue;
    }

    const pageUrl = json.page?.url || "";
    if (!pageUrl.startsWith(origin) || pageUrl.includes("/wp-json/") || pageUrl.includes("/feed/")) {
      continue;
    }

    if (json.page.status_code !== 200) {
      continue;
    }

    docsByPath.set(normalizePath(pageUrl), json);
  }

  const homeDoc = docsByPath.get("/") || files.find(({ file }) => file === "quantumsf_org.json")?.json;
  writeRoute("/", buildHome({ homeDoc, docsByPath, logoSrc }));

  for (const [pagePath, doc] of docsByPath.entries()) {
    if (pagePath === "/") {
      continue;
    }

    writeRoute(
      pagePath,
      buildGenericPage({
        doc,
        wpPage: wpPages.get(pagePath),
        pagePath,
        homeDoc,
        logoSrc
      })
    );
  }

  for (const [pagePath, wpPage] of wpPages.entries()) {
    if (pagePath === "/" || docsByPath.has(pagePath)) {
      continue;
    }

    const pseudoDoc = {
      page: {
        title: wpPage.title.rendered,
        meta_description: cleanExcerpt(wpPage.excerpt?.rendered || ""),
        url: `${origin}${pagePath}`
      },
      content: {
        headings: [{ level: "h1", text: wpPage.title.rendered }],
        ctas: [],
        visible_text: cleanExcerpt(wpPage.content?.rendered || "")
      },
      images: []
    };

    writeRoute(
      pagePath,
      buildGenericPage({
        doc: pseudoDoc,
        wpPage,
        pagePath,
        homeDoc,
        logoSrc
      })
    );
  }

  writeRoute("/contact-us/", buildContactPage({ logoSrc, homeDoc }));

  fs.writeFileSync(
    path.join(distDir, "_redirects"),
    [
      "/martial-arts-for-teens /teens-martial-arts/ 301",
      "/martial-arts-for-teens/ /teens-martial-arts/ 301",
      "/* /404.html 404"
    ].join("\n")
  );

  fs.writeFileSync(
    path.join(distDir, "_headers"),
    [
      "/*",
      "  X-Content-Type-Options: nosniff",
      "  Referrer-Policy: strict-origin-when-cross-origin",
      "  Permissions-Policy: camera=(), microphone=(), geolocation=()",
      "/assets/*",
      "  Cache-Control: public, max-age=31536000, immutable"
    ].join("\n")
  );

  const paths = ["/", ...Array.from(docsByPath.keys()).filter((pagePath) => pagePath !== "/"), ...Array.from(wpPages.keys()).filter((pagePath) => pagePath !== "/" && !docsByPath.has(pagePath)), "/contact-us/"]
    .filter((value, index, list) => list.indexOf(value) === index)
    .sort();

  fs.writeFileSync(
    path.join(distDir, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths
      .map((pagePath) => `  <url><loc>${origin}${pagePath === "/" ? "/" : pagePath}</loc></url>`)
      .join("\n")}\n</urlset>\n`
  );

  fs.writeFileSync(path.join(distDir, "robots.txt"), "User-agent: *\nAllow: /\nSitemap: https://quantumsf.org/sitemap.xml\n");

  fs.writeFileSync(
    path.join(distDir, "404.html"),
    htmlShell({
      title: "Page not found",
      description: "This page could not be found.",
      pathName: "/404.html",
      logoSrc,
      image: getHeroImage(homeDoc),
      body: `
        <main>
          <section class="page-hero">
            <img src="${escapeHtml(getHeroImage(homeDoc))}" alt="">
            <div class="page-hero-content">
              <p class="eyebrow">Quantum Martial Arts San Francisco</p>
              <h1>Page not found</h1>
              <p>The page you requested is not available in the supplied crawl.</p>
              <div class="hero-actions"><a class="button secondary" href="/">Return home</a></div>
            </div>
          </section>
        </main>`
    })
  );

  console.log(`Built ${paths.length} pages into ${path.relative(rootDir, distDir)}`);
}

build();
