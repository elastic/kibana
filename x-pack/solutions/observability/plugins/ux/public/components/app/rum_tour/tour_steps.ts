/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { EuiTourStepProps } from '@elastic/eui';
import { UX_TAB_SUFFIXES } from '../../../application/ux_home_route';
import { serviceNameFromPath, uxAppPath, uxTabSuffix } from '../../../utils/ux_app_path';

export const UX_PRODUCT_TOUR_STORAGE_KEY = 'xpack.ux.productTour.v3';

export const UX_APP_LINK_TEST_SUBJ_PREFIX = 'uxAppLink-';

export const UX_SESSION_REPLAY_ROW_PREFIX = 'uxSessionRowReplay-';

export const UX_TOUR_REPORT_TEMPLATE = 'scorecard';

export type UxTourTabLocation = (typeof UX_TAB_SUFFIXES)[keyof typeof UX_TAB_SUFFIXES];

export type UxTourLocation = 'inventory' | 'session-player' | 'report-view' | UxTourTabLocation;

export interface UxTourStep {
  stepId: string;
  location: UxTourLocation;
  /** Skip when the inventory has no apps, or when no session recording exists. */
  optional?: boolean;
  anchorPosition: EuiTourStepProps['anchorPosition'];
  title: string;
  content: string;
}

export const suffixForUxTab = (tab: UxTourTabLocation): string => {
  if (tab === 'journeys') {
    return '/journeys';
  }
  const match = Object.entries(UX_TAB_SUFFIXES).find(([, value]) => value === tab);
  return match?.[0] ?? '';
};

const isSessionPlayerPath = (pathname: string): boolean =>
  /\/session-replay\/[^/]+\/replay$/.test(uxTabSuffix(pathname));

const isReportViewPath = (pathname: string): boolean => {
  const suffix = uxTabSuffix(pathname);
  return suffix.startsWith('/reports/') && suffix !== '/reports/';
};

export const isOnStepLocation = (pathname: string, location: UxTourLocation): boolean => {
  if (location === 'session-player') {
    return isSessionPlayerPath(pathname);
  }
  if (location === 'report-view') {
    return isReportViewPath(pathname);
  }
  const serviceName = serviceNameFromPath(pathname);
  if (location === 'inventory') {
    return serviceName === undefined;
  }
  if (!serviceName) {
    return false;
  }
  return uxTabSuffix(pathname) === suffixForUxTab(location);
};

export const pathnameForTourLocation = (
  serviceName: string | undefined,
  location: UxTourLocation,
  sessionId?: string
): string | undefined => {
  if (location === 'inventory') {
    return '/';
  }
  if (!serviceName) {
    return undefined;
  }
  if (location === 'session-player') {
    if (!sessionId) {
      return undefined;
    }
    return uxAppPath(serviceName, `/session-replay/${encodeURIComponent(sessionId)}/replay`);
  }
  if (location === 'report-view') {
    return uxAppPath(serviceName, `/reports/${UX_TOUR_REPORT_TEMPLATE}`);
  }
  return uxAppPath(serviceName, suffixForUxTab(location));
};

export const firstAppNameFromDom = (): string | undefined => {
  if (typeof document === 'undefined') {
    return undefined;
  }
  const link = document.querySelector(`[data-test-subj^="${UX_APP_LINK_TEST_SUBJ_PREFIX}"]`);
  const testSubj = link?.getAttribute('data-test-subj');
  if (!testSubj?.startsWith(UX_APP_LINK_TEST_SUBJ_PREFIX)) {
    return undefined;
  }
  const name = testSubj.slice(UX_APP_LINK_TEST_SUBJ_PREFIX.length).trim();
  return name ? name : undefined;
};

export const firstReplaySessionIdFromDom = (): string | undefined => {
  if (typeof document === 'undefined') {
    return undefined;
  }
  const row = document.querySelector(`[data-test-subj^="${UX_SESSION_REPLAY_ROW_PREFIX}"]`);
  const testSubj = row?.getAttribute('data-test-subj');
  if (!testSubj?.startsWith(UX_SESSION_REPLAY_ROW_PREFIX)) {
    return undefined;
  }
  const id = testSubj.slice(UX_SESSION_REPLAY_ROW_PREFIX.length).trim();
  return id ? id : undefined;
};

export const UX_PRODUCT_TOUR_STEPS: UxTourStep[] = [
  {
    stepId: 'welcome',
    location: 'inventory',
    optional: true,
    anchorPosition: 'upLeft',
    title: i18n.translate('xpack.ux.tour.welcomeTitle', {
      defaultMessage: 'Welcome to User Experience',
    }),
    content: i18n.translate('xpack.ux.tour.welcomeDescription', {
      defaultMessage:
        'This table is every site and mobile app with real-user traffic. Open a row for sessions, click maps, and AI investigations.',
    }),
  },
  {
    stepId: 'score',
    location: 'inventory',
    optional: true,
    anchorPosition: 'downLeft',
    title: i18n.translate('xpack.ux.tour.scoreTitle', {
      defaultMessage: 'Health score',
    }),
    content: i18n.translate('xpack.ux.tour.scoreDescription', {
      defaultMessage:
        'Score ranks each application from Core Web Vitals and JavaScript errors. Click a score for the breakdown — what is hurting it and where to start.',
    }),
  },
  {
    stepId: 'investigate',
    location: 'inventory',
    optional: true,
    anchorPosition: 'rightCenter',
    title: i18n.translate('xpack.ux.tour.investigateTitle', {
      defaultMessage: 'Investigate',
    }),
    content: i18n.translate('xpack.ux.tour.investigateDescription', {
      defaultMessage:
        'Inspect opens the investigate flyout: an evidence pack with score, worst pages, errors, sample sessions, and an AI summary you can continue in AI Analyst.',
    }),
  },
  {
    stepId: 'sessions',
    location: 'session-replay',
    anchorPosition: 'downCenter',
    title: i18n.translate('xpack.ux.tour.sessionsTitle', {
      defaultMessage: 'Session replay',
    }),
    content: i18n.translate('xpack.ux.tour.sessionsDescription', {
      defaultMessage:
        'Sessions is the heart of the app. List real visits, keep recordings only, then watch what a user did — including slow pages, JavaScript errors, and rage clicks.',
    }),
  },
  {
    stepId: 'inspect',
    location: 'session-replay',
    anchorPosition: 'downLeft',
    title: i18n.translate('xpack.ux.tour.inspectTitle', {
      defaultMessage: 'Find a recording',
    }),
    content: i18n.translate('xpack.ux.tour.inspectDescription', {
      defaultMessage:
        'Has replay keeps visits with a recording. Details opens the timeline. Next opens the replay player for a recorded visit.',
    }),
  },
  {
    stepId: 'player',
    location: 'session-player',
    optional: true,
    anchorPosition: 'upCenter',
    title: i18n.translate('xpack.ux.tour.playerTitle', {
      defaultMessage: 'Replay player',
    }),
    content: i18n.translate('xpack.ux.tour.playerDescription', {
      defaultMessage:
        'Watch the visit as the user saw it. Play and pause, scrub the timeline, change speed, and skip idle gaps with no activity.',
    }),
  },
  {
    stepId: 'playerInspect',
    location: 'session-player',
    optional: true,
    anchorPosition: 'upLeft',
    title: i18n.translate('xpack.ux.tour.playerInspectTitle', {
      defaultMessage: 'Inspect the page',
    }),
    content: i18n.translate('xpack.ux.tour.playerInspectDescription', {
      defaultMessage:
        'Inspect pauses playback and lets you click any element — selector, path, and attributes. Copy a selector to filter sessions or build a funnel step.',
    }),
  },
  {
    stepId: 'filters',
    location: 'overview',
    anchorPosition: 'downLeft',
    title: i18n.translate('xpack.ux.tour.filtersTitle', {
      defaultMessage: 'Filters and time range',
    }),
    content: i18n.translate('xpack.ux.tour.filtersDescription', {
      defaultMessage:
        'All filters include or exclude browser, OS, country, page, and more. KQL and the date picker (top right) apply to every tab, including session replay and click maps. The range defaults to the last 7 days.',
    }),
  },
  {
    stepId: 'clickMap',
    location: 'overview',
    anchorPosition: 'downLeft',
    title: i18n.translate('xpack.ux.tour.clickMapTitle', {
      defaultMessage: 'Click maps',
    }),
    content: i18n.translate('xpack.ux.tour.clickMapDescription', {
      defaultMessage:
        'On Overview, the click map shows where people clicked, drawn on a session-replay snapshot of that page. Filter to a page first, then use a hotspot to open matching sessions.',
    }),
  },
  {
    stepId: 'countryMap',
    location: 'overview',
    anchorPosition: 'downLeft',
    title: i18n.translate('xpack.ux.tour.countryMapTitle', {
      defaultMessage: 'Visitors by country',
    }),
    content: i18n.translate('xpack.ux.tour.countryMapDescription', {
      defaultMessage:
        'The map is volume, LCP, and errors by country. Switch the metric, click a region to filter Overview, or open sessions for that country.',
    }),
  },
  {
    stepId: 'ai',
    location: 'ai',
    anchorPosition: 'downLeft',
    title: i18n.translate('xpack.ux.tour.aiTitle', {
      defaultMessage: 'AI Analyst',
    }),
    content: i18n.translate('xpack.ux.tour.aiDescription', {
      defaultMessage:
        'AI Analyst investigates this app and time range. Presets cover score, errors, frustration, and funnels. From the inventory investigate flyout you can send the evidence pack here.',
    }),
  },
  {
    stepId: 'funnels',
    location: 'funnels',
    anchorPosition: 'downLeft',
    title: i18n.translate('xpack.ux.tour.funnelsTitle', {
      defaultMessage: 'Funnels',
    }),
    content: i18n.translate('xpack.ux.tour.funnelsDescription', {
      defaultMessage:
        'Build a conversion path from pages and clicks. Drop-off opens the sessions that left — inspect those visits in session replay.',
    }),
  },
  {
    stepId: 'budgets',
    location: 'budgets',
    anchorPosition: 'downLeft',
    title: i18n.translate('xpack.ux.tour.budgetsTitle', {
      defaultMessage: 'Performance budgets',
    }),
    content: i18n.translate('xpack.ux.tour.budgetsDescription', {
      defaultMessage:
        'Budgets are SLO-backed contracts on LCP, errors, and session outcomes. When one burns, investigate the sessions behind the regression.',
    }),
  },
  {
    stepId: 'reports',
    location: 'reports',
    anchorPosition: 'downLeft',
    title: i18n.translate('xpack.ux.tour.reportsTitle', {
      defaultMessage: 'Reporting',
    }),
    content: i18n.translate('xpack.ux.tour.reportsDescription', {
      defaultMessage:
        'Templates are stakeholder briefs — scorecard, pages, errors, or frustration. Next opens a live scorecard for this app and time range.',
    }),
  },
  {
    stepId: 'reportView',
    location: 'report-view',
    anchorPosition: 'downLeft',
    title: i18n.translate('xpack.ux.tour.reportViewTitle', {
      defaultMessage: 'Weekly scorecard',
    }),
    content: i18n.translate('xpack.ux.tour.reportViewDescription', {
      defaultMessage:
        'This is a real report: KPIs, Core Web Vitals, countries, and sample sessions. Copy a snapshot URL, export PDF or CSV, or generate an AI narrative.',
    }),
  },
  {
    stepId: 'scheduleEmail',
    location: 'report-view',
    anchorPosition: 'downLeft',
    title: i18n.translate('xpack.ux.tour.scheduleEmailTitle', {
      defaultMessage: 'Schedule email',
    }),
    content: i18n.translate('xpack.ux.tour.scheduleEmailDescription', {
      defaultMessage:
        'Send this report now, or save a cadence (weekly, weekdays) to an email connector. Recipients get the same filters and time range you see here.',
    }),
  },
  {
    stepId: 'alerts',
    location: 'alerts',
    anchorPosition: 'downLeft',
    title: i18n.translate('xpack.ux.tour.alertsTitle', {
      defaultMessage: 'Alerting',
    }),
    content: i18n.translate('xpack.ux.tour.alertsDescription', {
      defaultMessage:
        'Create RUM alerts on vitals, errors, and budget burn. From a fire, jump to the sessions that matched and inspect them in replay.',
    }),
  },
];
