/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { versionStore } from './version_switcher_store';

let mounted = false;

export const mountVersionSwitcherWidget = () => {
  if (mounted || document.getElementById('ingestHubVersionSwitcher')) return;
  mounted = true;

  const container = document.createElement('div');
  container.id = 'ingestHubVersionSwitcher';
  Object.assign(container.style, {
    position: 'fixed',
    bottom: '16px',
    left: '16px',
    zIndex: '2147483647',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: '#1D1E24',
    padding: '8px 12px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    fontSize: '13px',
    color: '#DFE5EF',
  });

  const logo = document.createElement('span');
  logo.innerHTML =
    '<svg width="20" height="20" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">' +
    '<path fill="#00BFB3" d="M16 0C7.2 0 0 7.2 0 16s7.2 16 16 16 16-7.2 16-16S24.8 0 16 0"/>' +
    '<path fill="#F04E98" d="M21.6 10.4H10.4v11.2h11.2z"/>' +
    '<path fill="#00BFB3" d="M10.4 10.4 16 4.8h-5.6c-3.1 0-5.6 2.5-5.6 5.6zm0 11.2L4.8 16v5.6c0 3.1 2.5 5.6 5.6 5.6zm11.2-11.2 5.6 5.6v-5.6c0-3.1-2.5-5.6-5.6-5.6zm0 11.2L16 27.2h5.6c3.1 0 5.6-2.5 5.6-5.6z"/>' +
    '</svg>';
  container.appendChild(logo);

  const makeBtn = (id: string, label: string) => {
    const btn = document.createElement('button');
    btn.dataset.versionId = id;
    btn.textContent = label;
    Object.assign(btn.style, {
      padding: '4px 12px',
      borderRadius: '4px',
      border: 'none',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: '500',
      transition: 'background 0.15s',
    });
    btn.addEventListener('click', () => {
      versionStore.setVersion(id as 'blockUx' | 'skipUx');
    });
    return btn;
  };

  const blockBtn = makeBtn('blockUx', 'Block UX');
  const skipBtn = makeBtn('skipUx', 'Skip UX');
  container.appendChild(blockBtn);
  container.appendChild(skipBtn);

  const updateButtons = () => {
    const current = versionStore.getSnapshot();
    const activeStyle = { background: '#343741', color: '#DFE5EF' };
    const inactiveStyle = { background: 'transparent', color: '#98A2B3' };
    Object.assign(blockBtn.style, current === 'blockUx' ? activeStyle : inactiveStyle);
    Object.assign(skipBtn.style, current === 'skipUx' ? activeStyle : inactiveStyle);
  };

  updateButtons();
  versionStore.subscribe(updateButtons);

  document.body.appendChild(container);
};
