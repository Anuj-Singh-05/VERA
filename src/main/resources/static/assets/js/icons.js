// Authored inline SVG icons: 20px grid, 1.6 stroke, currentColor.

const P = {
  certified: '<circle cx="10" cy="10" r="7.2"/><path d="M6.6 10.2l2.3 2.3 4.5-4.7"/>',
  review: '<circle cx="10" cy="10" r="7.2"/><path d="M10 6.2v4.6"/><path d="M10 13.6v.1"/>',
  blocked: '<circle cx="10" cy="10" r="7.2"/><path d="M7.3 7.3l5.4 5.4M12.7 7.3l-5.4 5.4"/>',
  incomplete: '<circle cx="10" cy="10" r="7.2"/><path d="M10 2.8a7.2 7.2 0 0 1 0 14.4z" fill="currentColor" stroke="none"/>',
  nodata: '<circle cx="10" cy="10" r="7.2" stroke-dasharray="2.2 2.2"/><path d="M7 10h6"/>',
  play: '<path d="M7 5.2v9.6l7.6-4.8z"/>',
  sun: '<circle cx="10" cy="10" r="3.4"/><path d="M10 2.5v1.8M10 15.7v1.8M2.5 10h1.8M15.7 10h1.8M4.7 4.7l1.3 1.3M14 14l1.3 1.3M4.7 15.3L6 14M14 6l1.3-1.3"/>',
  moon: '<path d="M15.6 12.3A6.4 6.4 0 0 1 7.7 4.4a6.4 6.4 0 1 0 7.9 7.9z"/>',
  print: '<path d="M6 7.5V3h8v4.5"/><rect x="3" y="7.5" width="14" height="6.5" rx="1.5"/><path d="M6 12h8v5H6z"/>',
  alert: '<path d="M10 3.2l7.4 13H2.6z"/><path d="M10 8.4v3.6M10 14.2v.1"/>',
  left: '<path d="M12.5 4.5L7 10l5.5 5.5"/>',
  right: '<path d="M7.5 4.5L13 10l-5.5 5.5"/>',
  close: '<path d="M5 5l10 10M15 5L5 15"/>',
  link: '<path d="M8.6 11.4a3 3 0 0 0 4.2 0l2.6-2.6a3 3 0 0 0-4.2-4.2l-.9.9"/><path d="M11.4 8.6a3 3 0 0 0-4.2 0l-2.6 2.6a3 3 0 0 0 4.2 4.2l.9-.9"/>',
  retry: '<path d="M15.5 9.5a5.6 5.6 0 1 1-1.7-4"/><path d="M14.2 2.8v3h-3"/>',
  arrow: '<path d="M4 10h11.5M11 5.5L15.5 10 11 14.5"/>',
};

export function icon(name, cls = '') {
  return `<svg class="ic ${cls}" viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${P[name] || ''}</svg>`;
}

export const statusIcon = (status) => icon({
  CERTIFIED: 'certified',
  NEEDS_HUMAN_REVIEW: 'review',
  BLOCKED: 'blocked',
  INCOMPLETE: 'incomplete',
  NO_DATA: 'nodata',
}[status] || 'nodata');
