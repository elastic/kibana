/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TITLE_COLUMN_HEADER = i18n.translate('xpack.nightshift.sources.titleColumnName', {
  defaultMessage: 'Title',
});

export const QUERY_COLUMN_HEADER = i18n.translate('xpack.nightshift.sources.queryColumnName', {
  defaultMessage: 'Query',
});

export const ENABLED_COLUMN_HEADER = i18n.translate('xpack.nightshift.sources.enabledColumnName', {
  defaultMessage: 'Enabled',
});

export const SIGNIFICANT_EVENTS_COLUMN_HEADER = i18n.translate(
  'xpack.nightshift.sources.significantEventsColumnName',
  { defaultMessage: 'Events' }
);

export const SIGNIFICANT_EVENTS_COLUMN_TOOLTIP = i18n.translate(
  'xpack.nightshift.sources.significantEventsColumnTooltip',
  { defaultMessage: 'Number of results produced by created rules in the last 24 hours.' }
);

export const QUERIES_COLUMN_HEADER = i18n.translate('xpack.nightshift.sources.queriesColumnName', {
  defaultMessage: 'KI Queries',
});

export const KNOWLEDGE_INDICATORS_COLUMN_HEADER = i18n.translate(
  'xpack.nightshift.sources.knowledgeIndicatorsColumnName',
  { defaultMessage: 'KI Features' }
);

export const ONBOARDING_STATUS_COLUMN_HEADER = i18n.translate(
  'xpack.nightshift.sources.onboardingStatusColumnName',
  { defaultMessage: 'Status' }
);

export const ACTIONS_COLUMN_HEADER = i18n.translate('xpack.nightshift.sources.actionsColumnName', {
  defaultMessage: 'Actions',
});

export const NO_SOURCES_MESSAGE = i18n.translate('xpack.nightshift.sources.noSourcesMessage', {
  defaultMessage: 'No sources match your search.',
});

export const SOURCES_TABLE_SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.nightshift.sources.searchPlaceholder',
  { defaultMessage: 'Search sources by title, tag or query' }
);

export const SOURCES_TABLE_CAPTION = i18n.translate('xpack.nightshift.sources.tableCaption', {
  defaultMessage: 'Sources',
});

export const RUN_SOURCE_ONBOARDING_BUTTON_LABEL = i18n.translate(
  'xpack.nightshift.sources.runOnboardingButtonLabel',
  { defaultMessage: 'Onboard source' }
);

/** Onboard-source tooltip, extended with the cross-project generation disclosure. */
export const RUN_SOURCE_ONBOARDING_CROSS_PROJECT_TOOLTIP = i18n.translate(
  'xpack.nightshift.sources.runOnboardingCrossProjectTooltip',
  {
    defaultMessage:
      'Onboard source. Analyzes data from all projects linked through cross-project search, regardless of the project scope configured for this space.',
  }
);

export const ENABLE_SOURCE_TO_ONBOARD_TOOLTIP = i18n.translate(
  'xpack.nightshift.sourcesView.enableSourceToOnboardTooltip',
  { defaultMessage: 'Enable the source to onboard it' }
);

export const STOP_SOURCE_ONBOARDING_BUTTON_LABEL = i18n.translate(
  'xpack.nightshift.sources.stopOnboardingButtonLabel',
  { defaultMessage: 'Stop source onboarding' }
);

export const DELETE_SOURCE_ACTION_LABEL = i18n.translate(
  'xpack.nightshift.sources.deleteActionLabel',
  { defaultMessage: 'Delete' }
);

export const DELETE_SOURCE_ACTION_DESCRIPTION = i18n.translate(
  'xpack.nightshift.sources.deleteActionDescription',
  { defaultMessage: 'Delete this source, its knowledge indicators and rules' }
);

export const CREATE_SOURCE_BUTTON_LABEL = i18n.translate(
  'xpack.nightshift.sources.createButtonLabel',
  { defaultMessage: 'Create source' }
);

export const EMPTY_STATE_TITLE = i18n.translate('xpack.nightshift.sources.emptyStateTitle', {
  defaultMessage: 'Create your first source',
});

export const READ_ONLY_EMPTY_STATE_TITLE = i18n.translate(
  'xpack.nightshift.sources.readOnlyEmptyStateTitle',
  { defaultMessage: 'No sources yet' }
);

export const SOURCES_LOAD_ERROR_TITLE = i18n.translate('xpack.nightshift.sources.loadErrorTitle', {
  defaultMessage: 'Could not load sources',
});

export const SOURCES_LOAD_ERROR_BODY = i18n.translate('xpack.nightshift.sources.loadErrorBody', {
  defaultMessage:
    'The source list did not load. Try again, or check that you can read Nightshift sources in this space.',
});

export const RETRY_LABEL = i18n.translate('xpack.nightshift.sources.retryLabel', {
  defaultMessage: 'Try again',
});

export const EMPTY_STATE_BODY = i18n.translate('xpack.nightshift.sources.emptyStateBody', {
  defaultMessage:
    'A source is an ES|QL query that describes the data Nightshift should learn about and watch.',
});

export const getSourcesCountLabel = (count: number) =>
  i18n.translate('xpack.nightshift.sources.countLabel', {
    defaultMessage: '{count, plural, one {# source} other {# sources}}',
    values: { count },
  });

export const ONBOARDING_FAILURE_TITLE = i18n.translate(
  'xpack.nightshift.sources.onboardingErrorTitle',
  { defaultMessage: 'Could not onboard source' }
);

export const SOURCE_NOT_FOUND_TOAST_TITLE = i18n.translate(
  'xpack.nightshift.sources.sourceNotFoundToastTitle',
  { defaultMessage: 'Source not found' }
);

export const FIND_SIGNIFICANT_EVENTS_LABEL = i18n.translate(
  'xpack.nightshift.findSignificantEventsLabel',
  { defaultMessage: 'Find significant events' }
);

export const CANCEL_DISCOVERY_LABEL = i18n.translate('xpack.nightshift.cancelDiscoveryLabel', {
  defaultMessage: 'Cancel',
});
