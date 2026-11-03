/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { UxOverviewPanelKind } from './constants';

export const uxOverviewPanelTitle = (panel: UxOverviewPanelKind): string => {
  switch (panel) {
    case 'cover':
      return i18n.translate('xpack.ux.dashboard.panel.coverTitle', { defaultMessage: 'Overview' });
    case 'kpis':
      return i18n.translate('xpack.ux.dashboard.panel.kpisTitle', { defaultMessage: 'KPIs' });
    case 'vitals':
      return i18n.translate('xpack.ux.dashboard.panel.vitalsTitle', {
        defaultMessage: 'Core Web Vitals',
      });
    case 'trends':
      return i18n.translate('xpack.ux.dashboard.panel.trendsTitle', { defaultMessage: 'Trends' });
    case 'frustration':
      return i18n.translate('xpack.ux.dashboard.panel.frustrationTitle', {
        defaultMessage: 'Frustration signals',
      });
    case 'browsers':
      return i18n.translate('xpack.ux.dashboard.panel.browsersTitle', {
        defaultMessage: 'Browsers & OS',
      });
    case 'countries':
      return i18n.translate('xpack.ux.dashboard.panel.countriesTitle', {
        defaultMessage: 'Visitors by country',
      });
    case 'pages':
      return i18n.translate('xpack.ux.dashboard.panel.pagesTitle', { defaultMessage: 'Top pages' });
    case 'sessions':
      return i18n.translate('xpack.ux.dashboard.panel.sessionsTitle', {
        defaultMessage: 'Sessions',
      });
    case 'funnels':
      return i18n.translate('xpack.ux.dashboard.panel.funnelsTitle', { defaultMessage: 'Funnels' });
    case 'budgets':
      return i18n.translate('xpack.ux.dashboard.panel.budgetsTitle', {
        defaultMessage: 'Performance budgets',
      });
    case 'alerts':
      return i18n.translate('xpack.ux.dashboard.panel.alertsTitle', { defaultMessage: 'Alerts' });
  }
};

export const uxOverviewConvertTitle = (serviceName?: string): string =>
  serviceName
    ? i18n.translate('xpack.ux.dashboard.convert.namedTitle', {
        defaultMessage: '{serviceName} overview',
        values: { serviceName },
      })
    : i18n.translate('xpack.ux.dashboard.convert.unnamedTitle', {
        defaultMessage: 'User Experience overview',
      });

export const uxOverviewAppControlTitle = (): string =>
  i18n.translate('xpack.ux.dashboard.control.appTitle', { defaultMessage: 'App' });
