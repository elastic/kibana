/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ENTITIES_TITLE = i18n.translate('xpack.nightshift.detectionPage.entities.panelTitle', {
  defaultMessage: 'Entities',
});
export const CLEAR_LABEL = i18n.translate(
  'xpack.nightshift.detectionPage.entities.clearButtonLabel',
  {
    defaultMessage: 'Clear',
  }
);
export const SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.nightshift.detectionPage.entities.searchPlaceholder',
  {
    defaultMessage: 'Find entity…',
  }
);
export const FILTER_LABEL = i18n.translate(
  'xpack.nightshift.detectionPage.entities.filterAriaLabel',
  {
    defaultMessage: 'Filter entities',
  }
);
export const RULES_FILTER_GROUP_LABEL = i18n.translate(
  'xpack.nightshift.detectionPage.entities.rulesFilterGroupLabel',
  {
    defaultMessage: 'Rules',
  }
);
export const HAVE_RULES_LABEL = i18n.translate(
  'xpack.nightshift.detectionPage.entities.haveRulesLabel',
  {
    defaultMessage: 'Have rules',
  }
);
export const NO_RULES_LABEL = i18n.translate(
  'xpack.nightshift.detectionPage.entities.dontHaveRulesLabel',
  {
    defaultMessage: "Don't have rules",
  }
);
export const EVENTS_FILTER_GROUP_LABEL = i18n.translate(
  'xpack.nightshift.detectionPage.entities.eventsFilterGroupLabel',
  {
    defaultMessage: 'Events',
  }
);
export const SIGNIFICANT_EVENTS_FILTER_LABEL = i18n.translate(
  'xpack.nightshift.detectionPage.entities.significantEventsFilterLabel',
  {
    defaultMessage: 'Significant events',
  }
);
export const SERVICES_LABEL = i18n.translate(
  'xpack.nightshift.detectionPage.entities.servicesLabel',
  {
    defaultMessage: 'Services',
  }
);
export const DATABASES_LABEL = i18n.translate(
  'xpack.nightshift.detectionPage.entities.databasesLabel',
  {
    defaultMessage: 'Databases',
  }
);
export const STORAGE_LABEL = i18n.translate(
  'xpack.nightshift.detectionPage.entities.storageLabel',
  {
    defaultMessage: 'Storage',
  }
);
export const OTHER_LABEL = i18n.translate('xpack.nightshift.detectionPage.entities.otherLabel', {
  defaultMessage: 'Other',
});
export const NO_ENTITY_GROUP_LABEL = i18n.translate(
  'xpack.nightshift.detectionPage.entities.noEntityGroupLabel',
  {
    defaultMessage: 'No entity',
  }
);
export const UNASSIGNED_LABEL = i18n.translate(
  'xpack.nightshift.detectionPage.entities.unassignedLabel',
  {
    defaultMessage: 'Unassigned',
  }
);
export const NOT_LOADED_LABEL = i18n.translate(
  'xpack.nightshift.detectionPage.entities.notLoadedLabel',
  {
    defaultMessage: 'Not in the loaded list',
  }
);
export const UNASSIGNED_UNAVAILABLE_TOOLTIP = i18n.translate(
  'xpack.nightshift.detectionPage.entities.unassignedUnavailableTooltip',
  {
    defaultMessage:
      'Not applied: there are too many entities to work out which items are unassigned.',
  }
);
export const UNKNOWN_LABEL = i18n.translate(
  'xpack.nightshift.detectionPage.entities.unknownLabel',
  {
    defaultMessage: 'No longer known',
  }
);
export const EMPTY_DESCRIPTION = i18n.translate(
  'xpack.nightshift.detectionPage.entities.emptyDescription',
  {
    defaultMessage: 'No entities learned yet.',
  }
);
export const KNOWLEDGE_LINK = i18n.translate(
  'xpack.nightshift.detectionPage.entities.knowledgeLinkText',
  {
    defaultMessage: 'Go to Knowledge',
  }
);
export const NO_MATCHES_DESCRIPTION = i18n.translate(
  'xpack.nightshift.detectionPage.entities.noMatchesDescription',
  {
    defaultMessage: 'No entities match.',
  }
);
export const TRUNCATED_DESCRIPTION = i18n.translate(
  'xpack.nightshift.detectionPage.entities.truncatedDescription',
  {
    defaultMessage: 'Showing the first 1,000 entities.',
  }
);
export const ERROR_TITLE = i18n.translate('xpack.nightshift.detectionPage.entities.errorTitle', {
  defaultMessage: 'Could not load entities',
});
export const RETRY_LABEL = i18n.translate(
  'xpack.nightshift.detectionPage.entities.retryButtonLabel',
  {
    defaultMessage: 'Retry',
  }
);
export const getActiveEventsTooltip = (count: number): string =>
  i18n.translate('xpack.nightshift.detectionPage.entities.activeEventsTooltip', {
    defaultMessage:
      '{count, plural, one {# active significant event} other {# active significant events}}',
    values: { count },
  });
