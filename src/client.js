const menuButton = document.querySelector("[data-menu-button]");
const nav = document.querySelector("[data-nav]");

if (menuButton && nav) {
  menuButton.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
  });
}

const currentPath = window.location.pathname.replace(/\/index\.html$/, "/");

document.querySelectorAll("a[href]").forEach((link) => {
  const href = link.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return;
  }

  try {
    const url = new URL(href, window.location.origin);
    if (url.origin === window.location.origin && url.pathname === currentPath) {
      link.setAttribute("aria-current", "page");
    }
  } catch {
    /* Ignore malformed third-party links from the original WordPress content. */
  }
});
