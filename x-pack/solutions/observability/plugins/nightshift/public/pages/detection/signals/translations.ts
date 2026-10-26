/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.nightshift.detectionPage.signals.searchPlaceholder',
  { defaultMessage: 'Search rules' }
);
export const CHANGE_LABEL = i18n.translate('xpack.nightshift.detectionPage.signals.changeLabel', {
  defaultMessage: 'Change',
});
export const RULE_COLUMN_LABEL = i18n.translate(
  'xpack.nightshift.detectionPage.signals.ruleColumnLabel',
  { defaultMessage: 'Rule' }
);
export const SOURCE_COLUMN_LABEL = i18n.translate(
  'xpack.nightshift.detectionPage.signals.sourceColumnLabel',
  { defaultMessage: 'Source' }
);
export const TIMESTAMP_COLUMN_LABEL = i18n.translate(
  'xpack.nightshift.detectionPage.signals.timestampColumnLabel',
  { defaultMessage: 'Timestamp' }
);
export const DISCOVERY_COLUMN_LABEL = i18n.translate(
  'xpack.nightshift.detectionPage.signals.discoveryColumnLabel',
  { defaultMessage: 'Discovery' }
);
export const DISCOVERY_COLUMN_TOOLTIP = i18n.translate(
  'xpack.nightshift.detectionPage.signals.discoveryColumnTooltip',
  { defaultMessage: 'Whether the discovery pipeline has ingested this detection.' }
);
export const PROCESSED_LABEL = i18n.translate(
  'xpack.nightshift.detectionPage.signals.processedLabel',
  { defaultMessage: 'Processed' }
);
export const PENDING_LABEL = i18n.translate('xpack.nightshift.detectionPage.signals.pendingLabel', {
  defaultMessage: 'Pending',
});
export const SKIPPED_LABEL = i18n.translate('xpack.nightshift.detectionPage.signals.skippedLabel', {
  defaultMessage: 'Skipped',
});
export const TABLE_CAPTION = i18n.translate('xpack.nightshift.detectionPage.signals.tableCaption', {
  defaultMessage: 'Signals',
});
export const LOADING_SIGNALS_MESSAGE = i18n.translate(
  'xpack.nightshift.detectionPage.signals.loadingMessage',
  { defaultMessage: 'Loading signals…' }
);
export const EMPTY_TITLE = i18n.translate('xpack.nightshift.detectionPage.signals.emptyTitle', {
  defaultMessage: 'No signals found',
});
export const EMPTY_BODY = i18n.translate('xpack.nightshift.detectionPage.signals.emptyBody', {
  defaultMessage: 'Try changing the time range, entity selection, or filters.',
});
export const CLEAR_FILTERS_LABEL = i18n.translate(
  'xpack.nightshift.detectionPage.signals.clearFiltersLabel',
  { defaultMessage: 'Clear filters' }
);
export const LIST_ERROR_TITLE = i18n.translate(
  'xpack.nightshift.detectionPage.signals.listErrorTitle',
  { defaultMessage: 'Unable to load signals' }
);
export const LIST_ERROR_MESSAGE = i18n.translate(
  'xpack.nightshift.detectionPage.signals.listErrorMessage',
  { defaultMessage: 'There was a problem loading the signals.' }
);
export const RETRY_LABEL = i18n.translate('xpack.nightshift.detectionPage.signals.retryLabel', {
  defaultMessage: 'Retry',
});
export const SIGNAL_NOT_FOUND_TOAST_TITLE = i18n.translate(
  'xpack.nightshift.detectionPage.signals.notFoundToastTitle',
  { defaultMessage: 'This signal no longer exists' }
);
export const SIGNAL_ERROR_TITLE = i18n.translate(
  'xpack.nightshift.detectionPage.signals.signalErrorTitle',
  { defaultMessage: 'Unable to open signal' }
);
export const SIGNAL_ERROR_MESSAGE = i18n.translate(
  'xpack.nightshift.detectionPage.signals.signalErrorMessage',
  { defaultMessage: 'There was a problem loading the selected signal.' }
);
