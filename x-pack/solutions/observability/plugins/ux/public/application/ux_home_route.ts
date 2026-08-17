/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UxHomeTab } from '../components/app/rum_dashboard/rum_home';
import { serviceNameFromPath } from '../utils/ux_app_path';

export interface UxHomeRoute {
  tab: UxHomeTab;
  templateId?: string;
  serviceName?: string;
}

/** Tab suffix → home tab. Empty suffix is the app overview. */
export const UX_TAB_SUFFIXES: Record<string, UxHomeTab> = {
  '': 'overview',
  '/pages': 'pages',
  '/errors': 'errors',
  '/session-replay': 'session-replay',
  '/funnels': 'funnels',
  '/patterns': 'journeys',
  '/journeys': 'journeys',
  '/reports': 'reports',
  '/ai': 'ai',
  '/alerts': 'alerts',
  '/budgets': 'budgets',
};

/** Legacy (no app) tab paths, used to register routes and redirects. */
export const UX_HOME_PATHS: Record<string, UxHomeTab> = Object.fromEntries(
  Object.entries(UX_TAB_SUFFIXES)
    .filter(([suffix]) => suffix.length > 0)
    .map(([suffix, tab]) => [suffix, tab])
);

const reportTemplateId = (rest: string): string | undefined => {
  if (!rest.startsWith('/reports/')) {
    return undefined;
  }
  const templateId = rest.slice('/reports/'.length);
  if (templateId.length === 0 || templateId.includes('/')) {
    return undefined;
  }
  return decodeURIComponent(templateId);
};

/** Home-tab paths keep the shared chrome mounted. Session detail/settings do not. */
export function matchUxHomeRoute(pathname: string): UxHomeRoute | null {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/') {
    return { tab: 'overview' };
  }

  const serviceName = serviceNameFromPath(path);
  if (!serviceName) {
    const tab = UX_TAB_SUFFIXES[path];
    if (tab) {
      return { tab };
    }
    const templateId = reportTemplateId(path);
    if (templateId) {
      return { tab: 'reports', templateId };
    }
    return null;
  }

  const first = path.slice(1).split('/')[0];
  const rest = path.slice(1 + first.length);

  if (rest.startsWith('/session-replay/') && rest !== '/session-replay') {
    return null;
  }

  const templateId = reportTemplateId(rest);
  if (templateId) {
    return { tab: 'reports', templateId, serviceName };
  }

  const tab = UX_TAB_SUFFIXES[rest];
  if (tab) {
    return { tab, serviceName };
  }

  return null;
}
