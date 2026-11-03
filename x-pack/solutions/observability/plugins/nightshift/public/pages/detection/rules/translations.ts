/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const RULES_LABEL = i18n.translate('xpack.nightshift.detectionPage.rules.rulesLabel', {
  defaultMessage: 'rules',
});
export const SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.nightshift.detectionPage.rules.searchPlaceholder',
  { defaultMessage: 'Search rules' }
);
export const TITLE_LABEL = i18n.translate('xpack.nightshift.detectionPage.rules.titleLabel', {
  defaultMessage: 'Title',
});
export const IMPACT_LABEL = i18n.translate('xpack.nightshift.detectionPage.rules.impactLabel', {
  defaultMessage: 'Impact',
});
export const LAST_ACTIVITY_LABEL = i18n.translate(
  'xpack.nightshift.detectionPage.rules.lastActivityLabel',
  { defaultMessage: 'Last activity' }
);
export const LAST_ACTIVITY_TOOLTIP = i18n.translate(
  'xpack.nightshift.detectionPage.rules.lastActivityTooltip',
  { defaultMessage: 'The latest chart interval in which the rule matched.' }
);
export const STATUS_LABEL = i18n.translate('xpack.nightshift.detectionPage.rules.statusLabel', {
  defaultMessage: 'Status',
});
export const MATCHES_LABEL = i18n.translate('xpack.nightshift.detectionPage.rules.matchesLabel', {
  defaultMessage: 'Matches',
});
export const MATCHES_TOOLTIP = i18n.translate(
  'xpack.nightshift.detectionPage.rules.matchesTooltip',
  { defaultMessage: 'Documents the rule matched in the selected time range.' }
);
export const ACTIONS_LABEL = i18n.translate('xpack.nightshift.detectionPage.rules.actionsLabel', {
  defaultMessage: 'Actions',
});
export const DISCOVER_LABEL = i18n.translate('xpack.nightshift.detectionPage.rules.discoverLabel', {
  defaultMessage: 'Open in Discover',
});
export const DELETE_LABEL = i18n.translate('xpack.nightshift.detectionPage.rules.deleteLabel', {
  defaultMessage: 'Delete rule',
});
export const DELETE_SELECTED_LABEL = i18n.translate(
  'xpack.nightshift.detectionPage.rules.deleteSelectedLabel',
  { defaultMessage: 'Delete selected' }
);
export const CLEAR_SELECTION_LABEL = i18n.translate(
  'xpack.nightshift.detectionPage.rules.clearSelectionLabel',
  { defaultMessage: 'Clear selection' }
);
export const NO_RULES_TITLE = i18n.translate('xpack.nightshift.detectionPage.rules.noRulesTitle', {
  defaultMessage: 'No rules yet',
});
export const NO_RULES_BODY = i18n.translate('xpack.nightshift.detectionPage.rules.noRulesBody', {
  defaultMessage: 'Rules start when you promote a query in Knowledge indicators.',
});
export const NO_SEARCH_RESULTS = i18n.translate(
  'xpack.nightshift.detectionPage.rules.noSearchResults',
  { defaultMessage: 'No rules match your search' }
);
export const CLEAR_SEARCH_LABEL = i18n.translate(
  'xpack.nightshift.detectionPage.rules.clearSearchLabel',
  { defaultMessage: 'Clear search' }
);
export const NO_ENTITY_RESULTS = i18n.translate(
  'xpack.nightshift.detectionPage.rules.noEntityResultsTitle',
  { defaultMessage: 'No rules for the selected entities' }
);
export const NOT_FOUND_TITLE = i18n.translate(
  'xpack.nightshift.detectionPage.rules.notFoundTitle',
  { defaultMessage: 'This rule no longer exists' }
);
export const ERROR_TITLE = i18n.translate('xpack.nightshift.detectionPage.rules.errorTitle', {
  defaultMessage: 'Could not load rules',
});
export const ERROR_MESSAGE = i18n.translate('xpack.nightshift.detectionPage.rules.errorMessage', {
  defaultMessage: 'Try loading the rules again.',
});
export const RETRY_LABEL = i18n.translate('xpack.nightshift.detectionPage.rules.retryLabel', {
  defaultMessage: 'Retry',
});
