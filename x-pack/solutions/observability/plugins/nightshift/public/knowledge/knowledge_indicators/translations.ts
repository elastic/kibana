/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TITLE_COLUMN_LABEL = i18n.translate(
  'xpack.nightshift.knowledge.knowledgeIndicators.columns.titleLabel',
  { defaultMessage: 'Knowledge Indicator' }
);

export const EVENTS_COLUMN_LABEL = i18n.translate(
  'xpack.nightshift.knowledge.knowledgeIndicators.columns.eventsLabel',
  { defaultMessage: 'Events' }
);

export const TYPE_COLUMN_LABEL = i18n.translate(
  'xpack.nightshift.knowledge.knowledgeIndicators.columns.typeLabel',
  { defaultMessage: 'Type' }
);

export const MATCH_QUERY_TYPE_LABEL = i18n.translate(
  'xpack.nightshift.knowledge.knowledgeIndicators.columns.matchQueryTypeLabel',
  { defaultMessage: 'Match query' }
);

export const STATS_QUERY_TYPE_LABEL = i18n.translate(
  'xpack.nightshift.knowledge.knowledgeIndicators.columns.statsQueryTypeLabel',
  { defaultMessage: 'Stats query' }
);

export const STREAM_COLUMN_LABEL = i18n.translate(
  'xpack.nightshift.knowledge.sources.knowledgeIndicators.sourceColumnLabel',
  { defaultMessage: 'Source' }
);

export const DURABILITY_COLUMN_LABEL = i18n.translate(
  'xpack.nightshift.knowledge.knowledgeIndicators.columns.durabilityLabel',
  { defaultMessage: 'Durability' }
);

export const ACTIONS_COLUMN_LABEL = i18n.translate(
  'xpack.nightshift.knowledge.knowledgeIndicators.columns.actionsLabel',
  { defaultMessage: 'Actions' }
);

export const VIEW_DETAILS_ARIA_LABEL = i18n.translate(
  'xpack.nightshift.knowledge.knowledgeIndicators.viewDetailsAriaLabel',
  { defaultMessage: 'View details' }
);

export const MINIMIZE_DETAILS_ARIA_LABEL = i18n.translate(
  'xpack.nightshift.knowledge.knowledgeIndicators.minimizeDetailsAriaLabel',
  { defaultMessage: 'Collapse details' }
);

export const OCCURRENCES_TOOLTIP_NAME = i18n.translate(
  'xpack.nightshift.knowledge.knowledgeIndicators.occurrencesTooltipName',
  { defaultMessage: 'Detected event occurrences' }
);

export const TABLE_CAPTION = i18n.translate(
  'xpack.nightshift.knowledge.knowledgeIndicators.tableCaption',
  {
    defaultMessage: 'Knowledge Indicators table',
  }
);

export const TABLE_LABEL = i18n.translate(
  'xpack.nightshift.knowledge.knowledgeIndicators.tableLabel',
  {
    defaultMessage: 'Knowledge indicators',
  }
);

export const NO_ITEMS_MESSAGE = i18n.translate(
  'xpack.nightshift.knowledge.knowledgeIndicators.noItemsMessage',
  {
    defaultMessage: 'No knowledge indicators found',
  }
);

export const SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.nightshift.knowledge.knowledgeIndicators.searchPlaceholder',
  { defaultMessage: 'Search knowledge indicators' }
);

export const SEARCH_ARIA_LABEL = i18n.translate(
  'xpack.nightshift.knowledge.knowledgeIndicators.searchAriaLabel',
  { defaultMessage: 'Search knowledge indicators' }
);

export const SHOW_COMPUTED_LABEL = i18n.translate(
  'xpack.nightshift.knowledge.knowledgeIndicators.showComputedLabel',
  { defaultMessage: 'Show computed features' }
);

export const CLEAR_SELECTION_LABEL = i18n.translate(
  'xpack.nightshift.knowledge.knowledgeIndicators.clearSelectionLabel',
  { defaultMessage: 'Clear selection' }
);

export const DELETE_SELECTED_LABEL = i18n.translate(
  'xpack.nightshift.knowledge.knowledgeIndicators.deleteSelectedLabel',
  { defaultMessage: 'Delete selected' }
);

export const EXCLUDE_SELECTED_LABEL = i18n.translate(
  'xpack.nightshift.knowledge.knowledgeIndicators.excludeSelectedLabel',
  { defaultMessage: 'Exclude selected' }
);

export const RESTORE_SELECTED_LABEL = i18n.translate(
  'xpack.nightshift.knowledge.knowledgeIndicators.restoreSelectedLabel',
  { defaultMessage: 'Restore selected' }
);

export const EMPTY_STATE_TITLE = i18n.translate(
  'xpack.nightshift.knowledge.knowledgeIndicators.emptyState.title',
  { defaultMessage: 'Knowledge indicators' }
);

export const HIDDEN_COMPUTED_FEATURES_HINT = i18n.translate(
  'xpack.nightshift.knowledge.knowledgeIndicators.hiddenComputedFeaturesHint',
  {
    defaultMessage:
      'There are computed features hidden. Enable "Show computed features" to see them.',
  }
);

export const CANNOT_EXCLUDE_SELECTION_TOOLTIP = i18n.translate(
  'xpack.nightshift.knowledge.knowledgeIndicators.cannotExcludeSelectionTooltip',
  {
    defaultMessage:
      'Queries and computed features cannot be excluded. Deselect them to enable this action.',
  }
);

export const BULK_EXCLUDE_SUCCESS_TOAST_TITLE = i18n.translate(
  'xpack.nightshift.knowledge.knowledgeIndicators.bulkExcludeSuccessToastTitle',
  { defaultMessage: 'Knowledge indicators excluded' }
);

export const BULK_EXCLUDE_PARTIAL_TOAST_TITLE = i18n.translate(
  'xpack.nightshift.knowledge.knowledgeIndicators.bulkExcludePartialToastTitle',
  { defaultMessage: 'Some knowledge indicators could not be excluded' }
);

export const BULK_EXCLUDE_ERROR_TOAST_TITLE = i18n.translate(
  'xpack.nightshift.knowledge.knowledgeIndicators.bulkExcludeErrorToastTitle',
  { defaultMessage: 'Failed to exclude knowledge indicators' }
);

export const BULK_RESTORE_SUCCESS_TOAST_TITLE = i18n.translate(
  'xpack.nightshift.knowledge.knowledgeIndicators.bulkRestoreSuccessToastTitle',
  { defaultMessage: 'Knowledge indicators restored' }
);

export const BULK_RESTORE_PARTIAL_TOAST_TITLE = i18n.translate(
  'xpack.nightshift.knowledge.knowledgeIndicators.bulkRestorePartialToastTitle',
  { defaultMessage: 'Some knowledge indicators could not be restored' }
);

export const BULK_RESTORE_ERROR_TOAST_TITLE = i18n.translate(
  'xpack.nightshift.knowledge.knowledgeIndicators.bulkRestoreErrorToastTitle',
  { defaultMessage: 'Failed to restore knowledge indicators' }
);

export const DELETE_MODAL_TITLE = (count: number) =>
  i18n.translate('xpack.nightshift.knowledge.knowledgeIndicators.deleteModalTitle', {
    defaultMessage:
      'Are you sure you want to delete {count, plural, one {this knowledge indicator} other {these knowledge indicators}}?',
    values: { count },
  });

export const PROMOTE_SELECTED_LABEL = i18n.translate(
  'xpack.nightshift.knowledge.knowledgeIndicators.promoteSelectedLabel',
  { defaultMessage: 'Promote selected' }
);

export const BULK_PROMOTE_SUCCESS_TOAST_TITLE = i18n.translate(
  'xpack.nightshift.knowledge.knowledgeIndicators.bulkPromoteSuccessToastTitle',
  { defaultMessage: 'Queries promoted' }
);

export const BULK_PROMOTE_PARTIAL_TOAST_TITLE = i18n.translate(
  'xpack.nightshift.knowledge.knowledgeIndicators.bulkPromotePartialToastTitle',
  { defaultMessage: 'Some queries could not be promoted' }
);

export const BULK_PROMOTE_ERROR_TITLE = i18n.translate(
  'xpack.nightshift.knowledge.knowledgeIndicators.bulkPromoteErrorTitle',
  { defaultMessage: 'Failed to promote selected queries' }
);

export const PROMOTE_QUERY_ALREADY_PROMOTED = i18n.translate(
  'xpack.nightshift.knowledge.queriesTable.promoteQueryAlreadyPromoted',
  { defaultMessage: 'Query is already promoted' }
);

export const STATS_PROMOTE_DISABLED_TOOLTIP = i18n.translate(
  'xpack.nightshift.knowledge.queriesTable.statsPromoteDisabledTooltip',
  { defaultMessage: 'STATS queries cannot be promoted to rules yet' }
);

export const NOT_FILTER_ONLY_PROMOTE_DISABLED = i18n.translate(
  'xpack.nightshift.knowledge.queriesTable.notFilterOnlyPromoteDisabled',
  {
    defaultMessage:
      'Only filter-only queries can be promoted. Rewrite the query as FROM … | WHERE … without other commands.',
  }
);
