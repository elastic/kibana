/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PREFIX } from '../../../shared/test_ids';

/* Visualization tab */

export const ANALYZER_GRAPH_TEST_ID = `${PREFIX}AnalyzerGraph` as const;
export const ANALYZER_COLD_FROZEN_TIER_CALLOUT_TEST_ID =
  `${PREFIX}AnalyzerColdFrozenTierCallout` as const;
export const ANALYZER_COLD_FROZEN_TIER_CALLOUT_DISMISS_BUTTON_TEST_ID =
  `${PREFIX}AnalyzerColdFrozenTierCalloutDismissButton` as const;
export const SESSION_VIEW_TEST_ID = `${PREFIX}SessionView` as const;
export const GRAPH_VISUALIZATION_TEST_ID = `${PREFIX}GraphVisualization` as const;

/* Insights tab */

/* Entities */

export const ENTITIES_DETAILS_TEST_ID = `${PREFIX}EntitiesDetails` as const;
export const USER_DETAILS_TEST_ID = `${PREFIX}UsersDetails` as const;
export const USER_DETAILS_LINK_TEST_ID = `${USER_DETAILS_TEST_ID}TitleLink` as const;
export const USER_DETAILS_ALERT_COUNT_TEST_ID = `${USER_DETAILS_TEST_ID}AlertCount` as const;
export const USER_DETAILS_MISCONFIGURATIONS_TEST_ID =
  `${USER_DETAILS_TEST_ID}Misconfigurations` as const;
export const USER_DETAILS_RELATED_HOSTS_TABLE_TEST_ID =
  `${USER_DETAILS_TEST_ID}RelatedHostsTable` as const;
export const USER_DETAILS_RELATED_HOSTS_LINK_TEST_ID =
  `${USER_DETAILS_TEST_ID}RelatedHostsLink` as const;
export const USER_DETAILS_RELATED_HOSTS_IP_LINK_TEST_ID =
  `${USER_DETAILS_TEST_ID}RelatedHostsIPLink` as const;
export const USER_DETAILS_INFO_TEST_ID = 'user-overview' as const;

export const HOST_DETAILS_TEST_ID = `${PREFIX}HostsDetails` as const;
export const HOST_DETAILS_LINK_TEST_ID = `${HOST_DETAILS_TEST_ID}TitleLink` as const;
export const HOST_DETAILS_ALERT_COUNT_TEST_ID = `${HOST_DETAILS_TEST_ID}AlertCount` as const;
export const HOST_DETAILS_MISCONFIGURATIONS_TEST_ID =
  `${HOST_DETAILS_TEST_ID}Misconfigurations` as const;
export const HOST_DETAILS_VULNERABILITIES_TEST_ID =
  `${HOST_DETAILS_TEST_ID}Vulnerabilities` as const;
export const HOST_DETAILS_RELATED_USERS_TABLE_TEST_ID =
  `${HOST_DETAILS_TEST_ID}RelatedUsersTable` as const;
export const HOST_DETAILS_RELATED_USERS_LINK_TEST_ID =
  `${HOST_DETAILS_TEST_ID}RelatedUsersLink` as const;
export const HOST_DETAILS_RELATED_USERS_IP_LINK_TEST_ID =
  `${HOST_DETAILS_TEST_ID}RelatedUsersIPLink` as const;
export const HOST_DETAILS_INFO_TEST_ID = 'host-overview' as const;

/* Investigation */

export const INVESTIGATION_GUIDE_TEST_ID = `${PREFIX}InvestigationGuide` as const;
export const INVESTIGATION_GUIDE_LOADING_TEST_ID = `${INVESTIGATION_GUIDE_TEST_ID}Loading` as const;
