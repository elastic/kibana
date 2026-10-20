/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const DETECTION_ENGINE_LABEL = i18n.translate(
  'xpack.nightshift.detectionPage.detectionEngineLabel',
  { defaultMessage: 'Detection engine' }
);

export const MONITORING_STATUS_LABEL = i18n.translate(
  'xpack.nightshift.detectionPage.monitoringStatusLabel',
  { defaultMessage: 'Monitoring' }
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
  { defaultMessage: 'Loading detection engine status' }
);

export const getSourcesLabel = (count: number): string =>
  i18n.translate('xpack.nightshift.detectionPage.sourcesCountLabel', {
    defaultMessage: '{count, plural, one {source} other {sources}}',
    values: { count },
  });

export const SOURCES_TOOLTIP = i18n.translate('xpack.nightshift.detectionPage.sourcesTooltip', {
  defaultMessage: 'Sources in this space',
});

export const getKnowledgeIndicatorsLabel = (count: number): string =>
  i18n.translate('xpack.nightshift.detectionPage.knowledgeIndicatorsCountLabel', {
    defaultMessage: '{count, plural, one {knowledge indicator} other {knowledge indicators}}',
    values: { count },
  });

export const KNOWLEDGE_INDICATORS_TOOLTIP = i18n.translate(
  'xpack.nightshift.detectionPage.knowledgeIndicatorsTooltip',
  { defaultMessage: 'Features and queries' }
);

export const getRulesLabel = (count: number): string =>
  i18n.translate('xpack.nightshift.detectionPage.rulesCountLabel', {
    defaultMessage: '{count, plural, one {rule} other {rules}}',
    values: { count },
  });

export const RULES_TOOLTIP = i18n.translate('xpack.nightshift.detectionPage.activeRulesTooltip', {
  defaultMessage: 'Alerting rules',
});

export const getDiscoveriesLabel = (count: number): string =>
  i18n.translate('xpack.nightshift.detectionPage.discoveriesCountLabel', {
    defaultMessage: '{count, plural, one {discovery} other {discoveries}}',
    values: { count },
  });

export const DISCOVERIES_TOOLTIP = i18n.translate(
  'xpack.nightshift.detectionPage.detectionsTooltip',
  { defaultMessage: 'Change-point detections in the selected time range' }
);

export const getSignificantEventsLabel = (count: number): string =>
  i18n.translate('xpack.nightshift.detectionPage.significantEventsCountLabel', {
    defaultMessage: '{count, plural, one {significant event} other {significant events}}',
    values: { count },
  });

export const SIGNIFICANT_EVENTS_TOOLTIP = i18n.translate(
  'xpack.nightshift.detectionPage.significantEventsTooltip',
  { defaultMessage: 'Significant events in the selected time range, any status' }
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
