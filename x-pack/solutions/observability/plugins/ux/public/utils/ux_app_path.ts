/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** First-segment names that are UX tabs, not application names. */
export const UX_RESERVED_PATH_SEGMENTS = new Set([
  'pages',
  'errors',
  'session-replay',
  'funnels',
  'patterns',
  'journeys',
  'reports',
  'ai',
  'alerts',
  'budgets',
  'settings',
]);

export const UX_SETTINGS_TABS = ['repository', 'capture', 'inject', 'remote-clusters'] as const;
export type UxSettingsTab = (typeof UX_SETTINGS_TABS)[number];

export const encodeUxServiceName = (name: string): string => encodeURIComponent(name);

export const decodeUxServiceName = (segment: string): string => {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
};

const normalizePath = (pathname: string): string => pathname.replace(/\/+$/, '') || '/';

/** Application name from `/{serviceName}/...`. Reserved tab segments are ignored. */
export const serviceNameFromPath = (pathname: string): string | undefined => {
  const path = normalizePath(pathname);
  if (path === '/') {
    return undefined;
  }
  const first = path.slice(1).split('/')[0];
  if (!first || UX_RESERVED_PATH_SEGMENTS.has(first)) {
    return undefined;
  }
  const name = decodeUxServiceName(first).trim();
  return name ? name : undefined;
};

/** Tab/session suffix after the app segment (`''`, `/pages`, `/session-replay/abc`). */
export const uxTabSuffix = (pathname: string): string => {
  const path = normalizePath(pathname);
  const serviceName = serviceNameFromPath(path);
  if (!serviceName) {
    return path === '/' ? '' : path;
  }
  const first = path.slice(1).split('/')[0];
  return path.slice(1 + first.length);
};

/** In-app pathname for an application + tab suffix. */
export const uxAppPath = (serviceName: string | undefined, suffix = ''): string => {
  const normalized = suffix === '/' ? '' : suffix;
  if (!serviceName) {
    return normalized || '/';
  }
  return `/${encodeUxServiceName(serviceName)}${normalized}`;
};

const isSettingsTab = (value: string): value is UxSettingsTab =>
  (UX_SETTINGS_TABS as readonly string[]).includes(value);

/** Settings path suffix: in-app opens Repository; fleet-wide opens Capture. */
export const uxSettingsSuffix = (serviceName?: string): string =>
  serviceName ? '/settings' : '/settings/capture';

/** Settings tab from `/settings/{tab}` or `/{app}/settings/{tab}`. */
export const uxSettingsTabFromPath = (pathname: string): UxSettingsTab => {
  const suffix = uxTabSuffix(pathname);
  const match = suffix.match(/^\/settings(?:\/([^/]+))?$/);
  const tab = match?.[1];
  if (tab && isSettingsTab(tab)) {
    return tab;
  }
  return serviceNameFromPath(pathname) ? 'repository' : 'capture';
};

export const uxSessionIdFromPath = (pathname: string): string | undefined => {
  const parts = normalizePath(pathname).split('/').filter(Boolean);
  const index = parts.lastIndexOf('session-replay');
  if (index < 0 || index === parts.length - 1) {
    return undefined;
  }
  const id = parts[index + 1];
  if (!id || id === 'settings') {
    return undefined;
  }
  return decodeUxServiceName(id);
};
