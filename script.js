const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#main-nav');

menuButton?.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!isOpen));
  navigation?.classList.toggle('open', !isOpen);
});

navigation?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    menuButton?.setAttribute('aria-expanded', 'false');
    navigation.classList.remove('open');
  });
});

const revealObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));

const sections = [...document.querySelectorAll('main section[data-node]')];
const statusText = document.querySelector('.network-status span:last-child');
const mainRoute = document.querySelector('.route-a');
const sideRoute = document.querySelector('.route-b');
const mapNodes = [...document.querySelectorAll('.map-nodes circle')];
const nodeObserver = new IntersectionObserver((entries) => {
  const visible = entries
    .filter((entry) => entry.isIntersecting)
    .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
  if (!visible) return;

  sections.forEach((section) => section.classList.toggle('node-current', section === visible.target));
  const position = sections.indexOf(visible.target);
  const progress = Math.round(((position + 1) / sections.length) * 100);
  if (mainRoute) mainRoute.style.strokeDasharray = `${progress} 100`;
  if (sideRoute) sideRoute.style.strokeDasharray = `${Math.round(progress * 0.64)} 100`;
  mapNodes.forEach((node, index) => node.classList.toggle('node-lit', index === Math.round(position * (mapNodes.length - 1) / (sections.length - 1))));
  if (statusText) statusText.textContent = `NETWORK ONLINE - NODE ${visible.target.dataset.node}`;
}, { rootMargin: '-35% 0px -45% 0px', threshold: [0, 0.15, 0.35, 0.6] });

sections.forEach((section) => nodeObserver.observe(section));

const year = document.querySelector('#year');
if (year) year.textContent = String(new Date().getFullYear());

const packetSamples = {
  https: {
    frame: '001 / TCP',
    summary: 'TLS web traffic sample. A client packet is routed toward a secure service.',
    source: '192.168.10.24:54122',
    destination: '203.0.113.18:443',
    length: '74 bytes',
    layers: { link: 'ETHERNET II', network: 'IPv4', transport: 'TCP', application: 'HTTPS / TLS' }
  },
  dns: {
    frame: '002 / DNS',
    summary: 'A DNS lookup sample shows how a client reaches a resolver before connecting to a service.',
    source: '192.168.10.24:53118',
    destination: '192.168.10.1:53',
    length: '86 bytes',
    layers: { link: 'ETHERNET II', network: 'IPv4', transport: 'UDP', application: 'DNS QUERY' }
  },
  icmp: {
    frame: '003 / ICMP',
    summary: 'An ICMP echo request sample illustrates a basic reachability check.',
    source: '192.168.10.24',
    destination: '198.51.100.25',
    length: '98 bytes',
    layers: { link: 'ETHERNET II', network: 'IPv4', transport: 'ICMP', application: 'ECHO REQUEST' }
  }
};

const packetRows = [...document.querySelectorAll('.packet-row')];
const packetDots = [...document.querySelectorAll('.trace-packet')];
const packetInspector = document.querySelector('.packet-inspector');

packetRows.forEach((row) => {
  row.addEventListener('click', () => {
    const packet = packetSamples[row.dataset.packet];
    if (!packet) return;

    packetRows.forEach((item) => {
      const selected = item === row;
      item.classList.toggle('is-selected', selected);
      item.setAttribute('aria-pressed', String(selected));
    });
    packetDots.forEach((dot) => dot.classList.toggle('packet-selected', dot.dataset.packet === row.dataset.packet));

    if (!packetInspector) return;
    Object.entries({
      frame: packet.frame,
      summary: packet.summary,
      source: packet.source,
      destination: packet.destination,
      length: packet.length
    }).forEach(([field, value]) => {
      const target = packetInspector.querySelector(`[data-inspector="${field}"]`);
      if (target) target.textContent = value;
    });
    Object.entries(packet.layers).forEach(([layer, value]) => {
      const target = packetInspector.querySelector(`[data-layer="${layer}"]`);
      if (target) target.textContent = value;
    });
  });
});

const traceSvg = document.querySelector('.trace-svg');
const traceToggle = document.querySelector('.trace-toggle');
const traceToggleText = traceToggle?.querySelector('span:last-child');
const traceToggleIcon = traceToggle?.querySelector('.toggle-icon');
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const gatewayScene = document.querySelector('.gateway-scene-art');
let tracePaused = motionPreference.matches;

function syncSceneMotion(reduceMotion) {
  if (reduceMotion) gatewayScene?.pauseAnimations();
  else gatewayScene?.unpauseAnimations();
}

syncSceneMotion(motionPreference.matches);
motionPreference.addEventListener('change', (event) => syncSceneMotion(event.matches));

function setTracePaused(paused) {
  tracePaused = paused;
  if (paused) traceSvg?.pauseAnimations();
  else traceSvg?.unpauseAnimations();
  traceToggle?.setAttribute('aria-pressed', String(paused));
  if (traceToggleText) traceToggleText.textContent = paused ? 'Resume packet flow' : 'Pause packet flow';
  if (traceToggleIcon) traceToggleIcon.textContent = paused ? '▶' : 'Ⅱ';
}

setTracePaused(tracePaused);
traceToggle?.addEventListener('click', () => setTracePaused(!tracePaused));

// A small network packet follows a fine pointer, easing into position below it.
const cursorPacket = document.querySelector('.cursor-packet');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
let packetTargetX = 0;
let packetTargetY = 0;
let packetX = 0;
let packetY = 0;
let packetFrame = 0;
let packetStarted = false;
let scrollPulseTimer;

function stopCursorPacket() {
  if (packetFrame) cancelAnimationFrame(packetFrame);
  packetFrame = 0;
  packetStarted = false;
  cursorPacket?.classList.remove('is-visible', 'is-over-link', 'is-scrolling');
}

function animateCursorPacket() {
  packetX += (packetTargetX - packetX) * 0.13;
  packetY += (packetTargetY - packetY) * 0.13;
  cursorPacket.style.transform = `translate3d(${packetX + 13}px, ${packetY + 17}px, 0)`;

  if (Math.abs(packetTargetX - packetX) < 0.15 && Math.abs(packetTargetY - packetY) < 0.15) {
    packetX = packetTargetX;
    packetY = packetTargetY;
    cursorPacket.style.transform = `translate3d(${packetX + 13}px, ${packetY + 17}px, 0)`;
    packetFrame = 0;
    return;
  }
  packetFrame = requestAnimationFrame(animateCursorPacket);
}

if (cursorPacket && finePointer.matches && !motionPreference.matches) {
  window.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch') return;
    packetTargetX = event.clientX;
    packetTargetY = event.clientY;
    if (!packetStarted) {
      packetStarted = true;
      packetX = packetTargetX - 42;
      packetY = packetTargetY - 28;
      cursorPacket.classList.add('is-visible');
    }
    const overInteractive = event.target instanceof Element && Boolean(event.target.closest('a, button, input, select, textarea, [role="button"]'));
    cursorPacket.classList.toggle('is-over-link', overInteractive);
    if (!packetFrame) packetFrame = requestAnimationFrame(animateCursorPacket);
  }, { passive: true });

  document.documentElement.addEventListener('pointerleave', (event) => {
    if (!event.relatedTarget) stopCursorPacket();
  });
  window.addEventListener('blur', stopCursorPacket);
  window.addEventListener('scroll', () => {
    if (!packetStarted) return;
    cursorPacket.classList.add('is-scrolling');
    window.clearTimeout(scrollPulseTimer);
    scrollPulseTimer = window.setTimeout(() => cursorPacket.classList.remove('is-scrolling'), 220);
  }, { passive: true });
}

motionPreference.addEventListener('change', (event) => {
  if (event.matches) stopCursorPacket();
});

const projectFilters = [...document.querySelectorAll('[data-project-filter]')];
const projectCards = [...document.querySelectorAll('[data-project-categories]')];

projectFilters.forEach((filter) => {
  filter.addEventListener('click', () => {
    const category = filter.dataset.projectFilter;
    projectFilters.forEach((item) => {
      const selected = item === filter;
      item.classList.toggle('is-active', selected);
      item.setAttribute('aria-pressed', String(selected));
    });
    projectCards.forEach((card) => {
      const categories = card.dataset.projectCategories.split(' ');
      card.hidden = category !== 'all' && !categories.includes(category);
    });
  });
});
