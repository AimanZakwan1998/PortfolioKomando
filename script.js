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
