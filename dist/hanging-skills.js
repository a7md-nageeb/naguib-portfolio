const card = document.querySelector('.skills');
const slots = [...card.querySelectorAll('.skill-slot')];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

const landings = new Map();

function updateLandings() {
  const floor = card.getBoundingClientRect().bottom - 10;
  const positions = slots.map(slot => ({ slot, rect: slot.getBoundingClientRect() }));
  const obstacles = positions
    .filter(({ slot }) => !slot.classList.contains('is-detached'))
    .map(({ rect }) => rect);
  const detached = positions
    .filter(({ slot }) => slot.classList.contains('is-detached'))
    .sort((a, b) => b.rect.bottom - a.rect.bottom);

  for (const { slot, rect } of detached) {
    let bottom = floor;
    for (const obstacle of obstacles) {
      if (obstacle.top >= rect.bottom && obstacle.left < rect.right && obstacle.right > rect.left) {
        bottom = Math.min(bottom, obstacle.top);
      }
    }

    const stacked = bottom < floor;
    const drop = Math.max(0, bottom - rect.bottom);
    landings.set(slot, { drop, stacked });
    slot.style.setProperty('--skill-drop', `${drop}px`);
    slot.style.setProperty('--landing-angle', stacked ? '0deg' : 'var(--fallen-angle)');
    const tiltClearance = stacked ? 0 : Math.min(7, rect.width * 0.05);
    obstacles.push({ left: rect.left, right: rect.right, top: rect.top + drop - tiltClearance });
  }
}

new ResizeObserver(updateLandings).observe(card);

for (const slot of slots) {
  const badge = slot.querySelector('button');
  let movement;
  let drag;
  let suppressClick = false;

  function moveTag(fallen, from) {
    movement?.cancel();
    slot.classList.add('has-moved', 'is-moving');
    slot.classList.toggle('is-detached', fallen);
    updateLandings();
    badge.setAttribute('aria-pressed', String(fallen));
    badge.style.removeProperty('transform');

    if (reducedMotion.matches) {
      slot.classList.remove('is-moving');
      return;
    }

    const end = getComputedStyle(badge).transform;
    const { drop, stacked } = landings.get(slot) ?? { drop: 0, stacked: false };
    const angle = stacked ? '0deg' : getComputedStyle(slot).getPropertyValue('--fallen-angle').trim();
    const frames = fallen && !from ? [
      { transform: 'none', easing: 'ease-in' },
      { transform: `translateY(${Math.min(7, drop * 0.3)}px) rotate(-13deg)`, offset: 0.2, easing: 'cubic-bezier(.5,0,.85,.5)' },
      { transform: `translateY(${drop + (stacked ? 0 : 4)}px) rotate(${angle})`, offset: 0.72, easing: 'ease-out' },
      { transform: `translateY(${Math.max(0, drop - 5)}px) rotate(${angle})`, offset: 0.85, easing: 'ease-in' },
      { transform: end }
    ] : [{ transform: from }, { transform: end }];
    const animation = badge.animate(frames, {
      duration: fallen && !from ? 560 : 260,
      easing: fallen && !from ? 'linear' : 'cubic-bezier(.22,1,.36,1)'
    });
    movement = animation;
    animation.finished.then(() => {
      if (movement === animation) {
        movement = undefined;
        slot.classList.remove('is-moving');
      }
    }).catch(() => {});
  }

  badge.addEventListener('click', event => {
    if (suppressClick && event.detail > 0) {
      suppressClick = false;
      return;
    }
    const fallen = slot.classList.contains('is-detached');
    moveTag(!fallen, fallen ? getComputedStyle(badge).transform : undefined);
  });

  badge.addEventListener('pointerdown', event => {
    suppressClick = false;
    if (!event.isPrimary || event.button !== 0 || !slot.classList.contains('is-detached')) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
    badge.setPointerCapture(event.pointerId);
  });

  badge.addEventListener('pointermove', event => {
    if (drag?.id !== event.pointerId) return;
    const x = event.clientX - drag.x;
    const y = event.clientY - drag.y;
    if (!drag.moved) {
      if (Math.hypot(x, y) < 5) return;
      drag.moved = true;
      movement?.cancel();
      movement = undefined;
      slot.classList.remove('is-moving');
      slot.classList.add('is-dragging');
    }
    const drop = landings.get(slot).drop;
    badge.style.transform = `translate(${x}px,${drop + y}px)`;
  });

  function releaseTag(event) {
    if (drag?.id !== event.pointerId) return;
    const moved = drag.moved;
    drag = undefined;
    if (!moved) return;
    suppressClick = true;
    const home = slot.getBoundingClientRect();
    const tag = badge.getBoundingClientRect();
    const atHome = Math.abs(tag.left + tag.width / 2 - home.left - home.width / 2) < home.width * 0.6 &&
      Math.abs(tag.top + tag.height / 2 - home.top - home.height / 2) < home.height * 0.7;
    const from = getComputedStyle(badge).transform;
    slot.classList.remove('is-dragging');
    moveTag(event.type !== 'pointerup' || !atHome, from);
  }

  badge.addEventListener('pointerup', releaseTag);
  badge.addEventListener('pointercancel', releaseTag);
  badge.addEventListener('lostpointercapture', releaseTag);
}
