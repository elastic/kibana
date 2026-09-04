/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ChromeBreadcrumb } from '@kbn/core/public';
import { isRumReportTemplateId, rumReportTitle } from '../../common/rum_report';
import type { UxHomeTab } from '../components/app/rum_dashboard/rum_home';

export const UX_APP_TITLE = i18n.translate('xpack.ux.breadcrumbs.root', {
  defaultMessage: 'User Experience',
});

export const APPLICATIONS_LABEL = i18n.translate('xpack.ux.breadcrumbs.applicationsLabel', {
  defaultMessage: 'Applications',
});

export const UX_BREADCRUMBS: ChromeBreadcrumb[] = [
  {
    text: UX_APP_TITLE,
  },
  {
    text: i18n.translate('xpack.ux.breadcrumbs.dashboard', {
      defaultMessage: 'Overview',
    }),
  },
];

const UX_HOME_TAB_CRUMB: Record<Exclude<UxHomeTab, 'overview'>, string> = {
  pages: i18n.translate('xpack.ux.breadcrumbs.pages', {
    defaultMessage: 'Pages',
  }),
  errors: i18n.translate('xpack.ux.breadcrumbs.errors', {
    defaultMessage: 'Errors',
  }),
  'session-replay': i18n.translate('xpack.ux.breadcrumbs.sessionReplay', {
    defaultMessage: 'Sessions',
  }),
  journeys: i18n.translate('xpack.ux.breadcrumbs.journeys', {
    defaultMessage: 'Journeys',
  }),
  funnels: i18n.translate('xpack.ux.breadcrumbs.funnels', {
    defaultMessage: 'Funnels',
  }),
  reports: i18n.translate('xpack.ux.breadcrumbs.reports', {
    defaultMessage: 'Reporting',
  }),
  ai: i18n.translate('xpack.ux.breadcrumbs.aiAnalyst', {
    defaultMessage: 'AI Analyst',
  }),
  alerts: i18n.translate('xpack.ux.breadcrumbs.alerts', {
    defaultMessage: 'Alerts',
  }),
  budgets: i18n.translate('xpack.ux.breadcrumbs.budgetsTitle', {
    defaultMessage: 'Budgets',
  }),
};

export function uxInventoryBreadcrumbs({
  tab = 'applications',
  inventoryHref,
}: {
  tab?: 'applications' | 'errors';
  inventoryHref?: string;
} = {}): ChromeBreadcrumb[] {
  if (tab === 'errors') {
    return [{ text: UX_APP_TITLE, href: inventoryHref }, { text: UX_HOME_TAB_CRUMB.errors }];
  }
  return [{ text: UX_APP_TITLE }];
}

export function uxHomeBreadcrumbs({
  tab,
  templateId,
  serviceName,
  inventoryHref,
  overviewHref,
}: {
  tab: UxHomeTab;
  templateId?: string;
  serviceName: string;
  inventoryHref: string;
  overviewHref: string;
}): ChromeBreadcrumb[] {
  const inventoryCrumb: ChromeBreadcrumb = {
    text: UX_APP_TITLE,
    href: inventoryHref,
  };
  const appCrumb: ChromeBreadcrumb = { text: serviceName };

  if (tab === 'overview') {
    return [inventoryCrumb, appCrumb];
  }

  const appLink: ChromeBreadcrumb = { ...appCrumb, href: overviewHref };

  if (tab === 'reports' && templateId) {
    const reportLabel = isRumReportTemplateId(templateId)
      ? rumReportTitle(templateId)
      : i18n.translate('xpack.ux.breadcrumbs.reportFallback', {
          defaultMessage: 'Report',
        });
    return [inventoryCrumb, appLink, { text: UX_HOME_TAB_CRUMB.reports }, { text: reportLabel }];
  }

  return [inventoryCrumb, appLink, { text: UX_HOME_TAB_CRUMB[tab] }];
}
