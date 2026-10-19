export function embedUrl(id) {
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1`;
}

export function buildIframe(doc, id, title) {
  const frame = doc.createElement('iframe');
  frame.setAttribute('src', embedUrl(id));
  frame.setAttribute('title', title);
  frame.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
  frame.setAttribute('allowfullscreen', '');
  return frame;
}

// Lite players: the cover is a plain link to YouTube; with JS a click swaps it for the nocookie iframe.
export function initYoutube() {
  for (const link of document.querySelectorAll('a[data-youtube]')) {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const frame = buildIframe(document, link.dataset.youtube, link.dataset.title || '');
      frame.className = 'yt';
      link.replaceWith(frame);
      try {
        window.umami?.track('video-open', { id: link.dataset.youtube });
      } catch {
        // Analytics must never break the player.
      }
    });
  }
}
