import { generateClipPath } from './vendor/lisse/dist/path.js';

function smoothTile(tile, width, height) {
  const radius = parseFloat(getComputedStyle(tile).borderTopLeftRadius);
  if (width > 0 && height > 0 && radius > 0) {
    tile.style.clipPath = generateClipPath(width, height, { radius, smoothing: 0.6 });
  }
}

if ('ResizeObserver' in window && CSS.supports('clip-path', 'path("M 0 0 H 1 V 1 Z")')) {
  const observer = new ResizeObserver(entries => {
    for (const { target, borderBoxSize } of entries) {
      const size = borderBoxSize?.[0];
      smoothTile(target, size?.inlineSize ?? target.offsetWidth, size?.blockSize ?? target.offsetHeight);
    }
  });

  document.querySelectorAll('.bento > .column > .card').forEach(tile => {
    smoothTile(tile, tile.offsetWidth, tile.offsetHeight);
    observer.observe(tile, { box: 'border-box' });
  });
}
