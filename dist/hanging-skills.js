const card = document.querySelector('.skills');
const slots = [...card.querySelectorAll('.skill-slot')];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

function dropDistance(slot) {
  return Math.max(0, card.getBoundingClientRect().bottom - slot.getBoundingClientRect().bottom - 10);
}

function updateLandings() {
  for (const slot of slots) {
    slot.style.setProperty('--skill-drop', `${dropDistance(slot)}px`);
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
    const drop = dropDistance(slot);
    const angle = getComputedStyle(slot).getPropertyValue('--fallen-angle').trim();
    const frames = fallen && !from ? [
      { transform: 'none', easing: 'ease-in' },
      { transform: `translateY(${Math.min(7, drop * 0.3)}px) rotate(-13deg)`, offset: 0.2, easing: 'cubic-bezier(.5,0,.85,.5)' },
      { transform: `translateY(${drop + 4}px) rotate(${angle})`, offset: 0.72, easing: 'ease-out' },
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
    const drop = dropDistance(slot);
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
