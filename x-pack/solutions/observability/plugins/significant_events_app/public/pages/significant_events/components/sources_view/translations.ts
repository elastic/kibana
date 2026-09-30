/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TITLE_COLUMN_HEADER = i18n.translate(
  'xpack.significantEventsApp.sources.titleColumnName',
  { defaultMessage: 'Title' }
);

export const QUERY_COLUMN_HEADER = i18n.translate(
  'xpack.significantEventsApp.sources.queryColumnName',
  { defaultMessage: 'Query' }
);

export const ENABLED_COLUMN_HEADER = i18n.translate(
  'xpack.significantEventsApp.sources.enabledColumnName',
  { defaultMessage: 'Enabled' }
);

export const SIGNIFICANT_EVENTS_COLUMN_HEADER = i18n.translate(
  'xpack.significantEventsApp.sources.significantEventsColumnName',
  { defaultMessage: 'Events' }
);

export const SIGNIFICANT_EVENTS_COLUMN_TOOLTIP = i18n.translate(
  'xpack.significantEventsApp.sources.significantEventsColumnTooltip',
  { defaultMessage: 'Number of results produced by created rules.' }
);

export const QUERIES_COLUMN_HEADER = i18n.translate(
  'xpack.significantEventsApp.sources.queriesColumnName',
  { defaultMessage: 'KI Queries' }
);

export const KNOWLEDGE_INDICATORS_COLUMN_HEADER = i18n.translate(
  'xpack.significantEventsApp.sources.knowledgeIndicatorsColumnName',
  { defaultMessage: 'KI Features' }
);

export const ONBOARDING_STATUS_COLUMN_HEADER = i18n.translate(
  'xpack.significantEventsApp.sources.onboardingStatusColumnName',
  { defaultMessage: 'Status' }
);

export const ACTIONS_COLUMN_HEADER = i18n.translate(
  'xpack.significantEventsApp.sources.actionsColumnName',
  { defaultMessage: 'Actions' }
);

export const NO_SOURCES_MESSAGE = i18n.translate(
  'xpack.significantEventsApp.sources.noSourcesMessage',
  { defaultMessage: 'No sources match your search.' }
);

export const SOURCES_TABLE_SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.significantEventsApp.sources.searchPlaceholder',
  { defaultMessage: 'Search sources by title, tag or query' }
);

export const SOURCES_TABLE_CAPTION = i18n.translate(
  'xpack.significantEventsApp.sources.tableCaption',
  { defaultMessage: 'Sources' }
);

export const RUN_SOURCE_ONBOARDING_BUTTON_LABEL = i18n.translate(
  'xpack.significantEventsApp.sources.runOnboardingButtonLabel',
  { defaultMessage: 'Onboard source' }
);

/** Onboard-source tooltip, extended with the cross-project generation disclosure. */
export const RUN_SOURCE_ONBOARDING_CROSS_PROJECT_TOOLTIP = i18n.translate(
  'xpack.significantEventsApp.sources.runOnboardingCrossProjectTooltip',
  {
    defaultMessage:
      'Onboard source. Analyzes data from all projects linked through cross-project search, regardless of the project scope configured for this space.',
  }
);

export const STOP_SOURCE_ONBOARDING_BUTTON_LABEL = i18n.translate(
  'xpack.significantEventsApp.sources.stopOnboardingButtonLabel',
  { defaultMessage: 'Stop source onboarding' }
);

export const RESET_SOURCE_KNOWLEDGE_ACTION_LABEL = i18n.translate(
  'xpack.significantEventsApp.sources.resetKnowledgeActionLabel',
  { defaultMessage: 'Reset knowledge' }
);

export const RESET_SOURCE_KNOWLEDGE_ACTION_DESCRIPTION = i18n.translate(
  'xpack.significantEventsApp.sources.resetKnowledgeActionDescription',
  { defaultMessage: 'Delete the knowledge indicators and rules of this source' }
);

export const DELETE_SOURCE_ACTION_LABEL = i18n.translate(
  'xpack.significantEventsApp.sources.deleteActionLabel',
  { defaultMessage: 'Delete' }
);

export const DELETE_SOURCE_ACTION_DESCRIPTION = i18n.translate(
  'xpack.significantEventsApp.sources.deleteActionDescription',
  { defaultMessage: 'Delete this source, its knowledge indicators and rules' }
);

export const CREATE_SOURCE_BUTTON_LABEL = i18n.translate(
  'xpack.significantEventsApp.sources.createButtonLabel',
  { defaultMessage: 'Create source' }
);

export const EMPTY_STATE_TITLE = i18n.translate(
  'xpack.significantEventsApp.sources.emptyStateTitle',
  { defaultMessage: 'Create your first source' }
);

export const EMPTY_STATE_BODY = i18n.translate(
  'xpack.significantEventsApp.sources.emptyStateBody',
  {
    defaultMessage:
      'A source is an ES|QL query that describes the data Nightshift should learn about and watch.',
  }
);

export const getSourcesCountLabel = (count: number) =>
  i18n.translate('xpack.significantEventsApp.sources.countLabel', {
    defaultMessage: '{count, plural, one {# source} other {# sources}}',
    values: { count },
  });

export const ONBOARDING_FAILURE_TITLE = i18n.translate(
  'xpack.significantEventsApp.sources.onboardingErrorTitle',
  { defaultMessage: 'Could not onboard source' }
);
