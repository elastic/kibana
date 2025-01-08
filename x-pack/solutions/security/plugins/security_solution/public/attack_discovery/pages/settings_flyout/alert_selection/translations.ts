/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ALERTS_PREVIEW = i18n.translate(
  'xpack.securitySolution.attackDiscovery.settingsFlyout.alertSelection.alertsPreviewTabLabel',
  {
    defaultMessage: 'Alerts preview',
  }
);

export const ALERTS_SUMMARY = i18n.translate(
  'xpack.securitySolution.attackDiscovery.settingsFlyout.alertSelection.alertsSummaryTitle',
  {
    defaultMessage: 'Alerts summary',
  }
);

export const CUSTOMIZE_THE_ALERTS = i18n.translate(
  'xpack.securitySolution.attackDiscovery.settingsFlyout.alertSelection.customizeTheAlertsLabel',
  {
    defaultMessage:
      'Customize the set of alerts that will be analyzed when generating Attack discoveries.',
  }
);

export const ALERT_SUMMARY = i18n.translate(
  'xpack.securitySolution.attackDiscovery.settingsFlyout.alertSelection.alertSummaryTabLabel',
  {
    defaultMessage: 'Alert summary',
  }
);

export const FILTER_YOUR_DATA = i18n.translate(
  'xpack.securitySolution.attackDiscovery.settingsFlyout.alertSelection.filterYourDataPlaceholder',
  {
    defaultMessage: 'Filter your data using KQL syntax',
  }
);

export const SELECT_FIELD = i18n.translate(
  'xpack.securitySolution.attackDiscovery.settingsFlyout.alertSelection.alertsTable.selectFieldLabel',
  {
    defaultMessage: 'Select field',
  }
);

export const RESET = i18n.translate(
  'xpack.securitySolution.attackDiscovery.settingsFlyout.alertSelection.resetLabel',

  {
    defaultMessage: 'Reset',
  }
);

export const SEND_FEWER_ALERTS = i18n.translate(
  'xpack.securitySolution.attackDiscovery.alertSelection.alertSelection.selectFewerAlertsLabel',
  {
    defaultMessage:
      "Send fewer alerts if the model's context window is small or more if it is larger.",
  }
);

export const SELECT_A_FIELD = i18n.translate(
  'xpack.securitySolution.attackDiscovery.settingsFlyout.alertSelection.selectAFieldEmptyText',
  {
    defaultMessage: 'Select a field',
  }
);

export const SET_NUMBER_OF_ALERTS_TO_ANALYZE = i18n.translate(
  'xpack.securitySolution.attackDiscovery.settingsFlyout.alertSelection.setNumberOfAlertsToAnalyzeTitle',
  {
    defaultMessage: 'Set number of alerts to analyze',
  }
);
