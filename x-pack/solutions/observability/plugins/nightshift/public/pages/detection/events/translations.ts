/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const EVENTS_TABLE_CAPTION = i18n.translate(
  'xpack.nightshift.detectionPage.events.tableCaption',
  { defaultMessage: 'Significant events' }
);
export const EVENT_COLUMN_LABEL = i18n.translate(
  'xpack.nightshift.detectionPage.events.columns.event',
  { defaultMessage: 'Event' }
);
export const SEVERITY_COLUMN_LABEL = i18n.translate(
  'xpack.nightshift.detectionPage.events.columns.severity',
  { defaultMessage: 'Severity' }
);
export const STATUS_COLUMN_LABEL = i18n.translate(
  'xpack.nightshift.detectionPage.events.columns.status',
  { defaultMessage: 'Status' }
);
export const INVESTIGATION_COLUMN_LABEL = i18n.translate(
  'xpack.nightshift.detectionPage.events.columns.investigation',
  { defaultMessage: 'Investigation' }
);
export const SOURCES_COLUMN_LABEL = i18n.translate(
  'xpack.nightshift.detectionPage.events.columns.sources',
  { defaultMessage: 'Sources' }
);
export const CREATED_COLUMN_LABEL = i18n.translate(
  'xpack.nightshift.detectionPage.events.columns.created',
  { defaultMessage: 'Created' }
);
export const ACTIONS_COLUMN_LABEL = i18n.translate(
  'xpack.nightshift.detectionPage.events.columns.actions',
  { defaultMessage: 'Actions' }
);
export const RUN_INVESTIGATION_LABEL = i18n.translate(
  'xpack.nightshift.detectionPage.events.runInvestigation',
  { defaultMessage: 'Run investigation' }
);
export const RESTART_INVESTIGATION_LABEL = i18n.translate(
  'xpack.nightshift.detectionPage.events.restartInvestigation',
  { defaultMessage: 'Restart investigation' }
);
export const RESTART_INVESTIGATION_TOOLTIP = i18n.translate(
  'xpack.nightshift.detectionPage.events.restartInvestigationTooltip',
  { defaultMessage: 'This will cancel the running investigation and start a new one.' }
);
export const MARK_INACTIVE_LABEL = i18n.translate(
  'xpack.nightshift.detectionPage.events.markInactive',
  { defaultMessage: 'Mark significant event inactive' }
);
export const SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.nightshift.detectionPage.events.searchPlaceholder',
  { defaultMessage: 'Search significant events' }
);
export const STATUS_FILTER_LABEL = i18n.translate(
  'xpack.nightshift.detectionPage.events.statusFilterLabel',
  { defaultMessage: 'Status' }
);
export const SEVERITY_FILTER_LABEL = i18n.translate(
  'xpack.nightshift.detectionPage.events.severityFilterLabel',
  { defaultMessage: 'Severity' }
);
export const EMPTY_TITLE = i18n.translate('xpack.nightshift.detectionPage.events.emptyTitle', {
  defaultMessage: 'No significant events found',
});
export const EMPTY_BODY = i18n.translate('xpack.nightshift.detectionPage.events.emptyBody', {
  defaultMessage: 'No significant events match the selected time range and filters.',
});
export const CLEAR_FILTERS_LABEL = i18n.translate(
  'xpack.nightshift.detectionPage.events.clearFiltersLabel',
  { defaultMessage: 'Clear filters' }
);
export const EVENT_NOT_FOUND_TOAST_TITLE = i18n.translate(
  'xpack.nightshift.detectionPage.events.eventNotFoundToastTitle',
  { defaultMessage: 'The significant event could not be found' }
);

export const LIST_ERROR_TITLE = i18n.translate(
  'xpack.nightshift.detectionPage.events.listErrorTitle',
  { defaultMessage: 'Unable to load significant events' }
);
export const LIST_ERROR_MESSAGE = i18n.translate(
  'xpack.nightshift.detectionPage.events.listErrorMessage',
  { defaultMessage: "The significant events list couldn't be loaded." }
);
export const RETRY_LABEL = i18n.translate('xpack.nightshift.detectionPage.events.retryLabel', {
  defaultMessage: 'Try again',
});
