/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ACKNOWLEDGED = i18n.translate(
  'xpack.securitySolution.attackDiscovery.results.tabs.previousTab.searchAndFilter.acknowledgedFilterLabel',
  {
    defaultMessage: 'Acknowledged',
  }
);

export const CLEAR_FILTER_ID = (id: string) =>
  i18n.translate(
    'xpack.securitySolution.attackDiscovery.results.tabs.previousTab.searchAndFilter.clearFilterIdLabel',
    {
      values: { id },
      defaultMessage: `Clear filter _id:{id}`,
    }
  );

export const CLOSED = i18n.translate(
  'xpack.securitySolution.attackDiscovery.results.tabs.previousTab.searchAndFilter.closedFilterLabel',
  {
    defaultMessage: 'Closed',
  }
);

export const CONNECTOR = i18n.translate(
  'xpack.securitySolution.attackDiscovery.results.tabs.previousTab.searchAndFilter.connectorDropdownLabel',
  {
    defaultMessage: 'Connector',
  }
);

export const DELETED = i18n.translate(
  'xpack.securitySolution.attackDiscovery.results.tabs.previousTab.searchAndFilter.deletedFilterLabel',
  {
    defaultMessage: 'Deleted',
  }
);

export const HIDDEN = i18n.translate(
  'xpack.securitySolution.attackDiscovery.results.tabs.previousTab.searchAndFilter.hiddenFilterLabel',
  {
    defaultMessage: 'Hidden',
  }
);

export const ONLY_VISIBLE_TO_YOU = i18n.translate(
  'xpack.securitySolution.attackDiscovery.results.tabs.previousTab.searchAndFilter.onlyVisibleToYouFilterLabel',
  {
    defaultMessage: 'Only visible to you',
  }
);

export const OPEN = i18n.translate(
  'xpack.securitySolution.attackDiscovery.results.tabs.previousTab.searchAndFilter.openFilterLabel',
  {
    defaultMessage: 'Open',
  }
);

export const NOT_SHARED = i18n.translate(
  'xpack.securitySolution.attackDiscovery.results.tabs.previousTab.searchAndFilter.notSharedFilterLabel',
  {
    defaultMessage: 'Not shared',
  }
);

export const SEARCH = i18n.translate(
  'xpack.securitySolution.attackDiscovery.results.tabs.previousTab.searchAndFilter.searchPlaceholder',
  {
    defaultMessage: 'Search',
  }
);

export const SHARED = i18n.translate(
  'xpack.securitySolution.attackDiscovery.results.tabs.previousTab.searchAndFilter.sharedFilterLabel',
  {
    defaultMessage: 'Shared',
  }
);

export const STATUS = i18n.translate(
  'xpack.securitySolution.attackDiscovery.results.tabs.previousTab.searchAndFilter.statusDropdownLabel',
  {
    defaultMessage: 'Status',
  }
);

export const VISIBILITY = i18n.translate(
  'xpack.securitySolution.attackDiscovery.results.tabs.previousTab.searchAndFilter.visibilityDropdownLabel',
  {
    defaultMessage: 'Visibility',
  }
);

export const VISIBLE_TO_YOUR_TEAM = i18n.translate(
  'xpack.securitySolution.attackDiscovery.results.tabs.previousTab.searchAndFilter.visibleToYourTeamFilterLabel',
  {
    defaultMessage: 'Visible to your team',
  }
);
