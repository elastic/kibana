/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TOP = (fieldName: string) =>
  i18n.translate('xpack.securitySolution.detectionEngine.alerts.histogram.topNLabel', {
    values: { fieldName },
    defaultMessage: `Top {fieldName}`,
  });

export const HISTOGRAM_HEADER = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.histogram.headerTitle',
  {
    defaultMessage: 'Trend',
  }
);

export const NOT_AVAILABLE_TOOLTIP = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.histogram.notAvailableTooltip',
  {
    defaultMessage: 'Not available for trend view',
  }
);

export const VIEW_ALERTS = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.histogram.viewAlertsButtonLabel',
  {
    defaultMessage: 'View alerts',
  }
);

export const SHOWING_ALERTS = (
  totalAlertsFormatted: string,
  totalAlerts: number,
  modifier: string
) =>
  i18n.translate('xpack.securitySolution.detectionEngine.alerts.histogram.showingAlertsTitle', {
    values: { totalAlertsFormatted, totalAlerts, modifier },
    defaultMessage:
      'Showing: {modifier}{totalAlertsFormatted} {totalAlerts, plural, =1 {alert} other {alerts}}',
  });
