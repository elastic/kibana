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

export const getKnowledgeIndicatorsLabel = (count: number): string =>
  i18n.translate('xpack.nightshift.detectionPage.knowledgeIndicatorsCountLabel', {
    defaultMessage: '{count, plural, one {knowledge indicator} other {knowledge indicators}}',
    values: { count },
  });

export const getRulesLabel = (count: number): string =>
  i18n.translate('xpack.nightshift.detectionPage.rulesCountLabel', {
    defaultMessage: '{count, plural, one {rule} other {rules}}',
    values: { count },
  });

export const getDetectionsLabel = (count: number): string =>
  i18n.translate('xpack.nightshift.detectionPage.detectionsCountLabel', {
    defaultMessage: '{count, plural, one {detection} other {detections}}',
    values: { count },
  });

export const getSignificantEventsLabel = (count: number): string =>
  i18n.translate('xpack.nightshift.detectionPage.significantEventsCountLabel', {
    defaultMessage: '{count, plural, one {significant event} other {significant events}}',
    values: { count },
  });

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
