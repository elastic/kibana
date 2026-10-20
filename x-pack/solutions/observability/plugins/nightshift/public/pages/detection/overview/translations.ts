/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const DETECTION_PROCESS_LABEL = i18n.translate(
  'xpack.nightshift.detectionPage.detectionProcessLabel',
  { defaultMessage: 'Detection process' }
);

export const ENABLED_STATUS_LABEL = i18n.translate(
  'xpack.nightshift.detectionPage.enabledStatusLabel',
  { defaultMessage: 'Enabled' }
);

export const PAUSED_STATUS_LABEL = i18n.translate(
  'xpack.nightshift.detectionPage.pausedStatusLabel',
  { defaultMessage: 'Paused' }
);

export const UNKNOWN_STATUS_LABEL = i18n.translate(
  'xpack.nightshift.detectionPage.unknownStatusLabel',
  { defaultMessage: 'Unknown' }
);

export const STATUS_ERROR_TOOLTIP = i18n.translate(
  'xpack.nightshift.detectionPage.statusErrorTooltip',
  { defaultMessage: "Status couldn't be loaded" }
);

export const STATUS_LOADING_LABEL = i18n.translate(
  'xpack.nightshift.detectionPage.statusLoadingLabel',
  { defaultMessage: 'Loading detection process status' }
);

export const SOURCES_LABEL = i18n.translate('xpack.nightshift.detectionPage.sourcesLabel', {
  defaultMessage: 'Sources',
});

export const SOURCES_TOOLTIP = i18n.translate('xpack.nightshift.detectionPage.sourcesTooltip', {
  defaultMessage: 'Sources in this space',
});

export const KNOWLEDGE_INDICATORS_LABEL = i18n.translate(
  'xpack.nightshift.detectionPage.knowledgeIndicatorsLabel',
  { defaultMessage: 'Knowledge indicators' }
);

export const KNOWLEDGE_INDICATORS_TOOLTIP = i18n.translate(
  'xpack.nightshift.detectionPage.knowledgeIndicatorsTooltip',
  { defaultMessage: 'Features and queries' }
);

export const ACTIVE_RULES_LABEL = i18n.translate(
  'xpack.nightshift.detectionPage.activeRulesLabel',
  { defaultMessage: 'Active rules' }
);

export const ACTIVE_RULES_TOOLTIP = i18n.translate(
  'xpack.nightshift.detectionPage.activeRulesTooltip',
  { defaultMessage: 'Alerting rules' }
);

export const DETECTIONS_LABEL = i18n.translate('xpack.nightshift.detectionPage.detectionsLabel', {
  defaultMessage: 'Detections',
});

export const DETECTIONS_TOOLTIP = i18n.translate(
  'xpack.nightshift.detectionPage.detectionsTooltip',
  { defaultMessage: 'Change-point detections in the last 24 hours' }
);

export const SIGNIFICANT_EVENTS_LABEL = i18n.translate(
  'xpack.nightshift.detectionPage.significantEventsLabel',
  { defaultMessage: 'Significant events' }
);

export const SIGNIFICANT_EVENTS_TOOLTIP = i18n.translate(
  'xpack.nightshift.detectionPage.significantEventsTooltip',
  { defaultMessage: 'Significant events in the last 24 hours, any status' }
);

export const OVERVIEW_ERROR_TITLE = i18n.translate(
  'xpack.nightshift.detectionPage.overviewErrorTitle',
  { defaultMessage: 'Unable to load detection overview' }
);

export const OVERVIEW_ERROR_MESSAGE = i18n.translate(
  'xpack.nightshift.detectionPage.overviewErrorMessage',
  { defaultMessage: "The overview counts couldn't be loaded." }
);

export const OVERVIEW_RETRY_LABEL = i18n.translate(
  'xpack.nightshift.detectionPage.overviewRetryLabel',
  { defaultMessage: 'Try again' }
);
