/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { EuiTourStepProps } from '@elastic/eui';
import { UX_TAB_SUFFIXES } from '../../../application/ux_home_route';
import { serviceNameFromPath, uxTabSuffix } from '../../../utils/ux_app_path';

export const UX_PRODUCT_TOUR_STORAGE_KEY = 'xpack.ux.productTour.v2';

export const UX_APP_LINK_TEST_SUBJ_PREFIX = 'uxAppLink-';

export type UxTourLocation = 'inventory' | (typeof UX_TAB_SUFFIXES)[keyof typeof UX_TAB_SUFFIXES];

export interface UxTourStep {
  stepId: string;
  location: UxTourLocation;
  /** Skip immediately when the inventory has no applications. */
  optional?: boolean;
  anchorPosition: EuiTourStepProps['anchorPosition'];
  title: string;
  content: string;
}

export const suffixForUxTab = (tab: Exclude<UxTourLocation, 'inventory'>): string => {
  if (tab === 'journeys') {
    return '/journeys';
  }
  const match = Object.entries(UX_TAB_SUFFIXES).find(([, value]) => value === tab);
  return match?.[0] ?? '';
};

export const isOnStepLocation = (pathname: string, location: UxTourLocation): boolean => {
  const serviceName = serviceNameFromPath(pathname);
  if (location === 'inventory') {
    return serviceName === undefined;
  }
  if (!serviceName) {
    return false;
  }
  return uxTabSuffix(pathname) === suffixForUxTab(location);
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
      defaultMessage: 'Inspect or play a session',
    }),
    content: i18n.translate('xpack.ux.tour.inspectDescription', {
      defaultMessage:
        'Has replay keeps visits with a recording. Details (inspect) opens the timeline: pages, errors, and frustration. Play opens the replay player.',
    }),
  },
  {
    stepId: 'filters',
    location: 'session-replay',
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
        'Open a template for a stakeholder brief — scorecard, pages, errors, or frustration. Reports use the same filters and time range. Export, print, or schedule from here.',
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
