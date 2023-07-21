/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  APP_BLOCKLIST_PATH,
  APP_ENDPOINTS_PATH,
  APP_EVENT_FILTERS_PATH,
  APP_HOST_ISOLATION_EXCEPTIONS_PATH,
  APP_POLICIES_PATH,
  APP_RESPONSE_ACTIONS_HISTORY_PATH,
  APP_TRUSTED_APPS_PATH,
} from '@kbn/security-solution-plugin/common/constants';

export const getEndpointManagementPageList = (): Array<{
  id: string;
  title: string;
  url: string;
}> => {
  return [
    { id: 'endpointList', title: 'Endpoint list page', url: APP_ENDPOINTS_PATH },
    { id: 'policyList', title: 'Policy List page', url: APP_POLICIES_PATH },
    { id: 'trustedApps', title: 'Trusted Apps Page', url: APP_TRUSTED_APPS_PATH },
    { id: 'eventFilters', title: 'Event Filters page', url: APP_EVENT_FILTERS_PATH },
    {
      id: 'HostIsolationExceptions',
      title: 'Host Isolation Exceptions page',
      url: APP_HOST_ISOLATION_EXCEPTIONS_PATH,
    },
    { id: 'blocklist', title: 'Blocklist page', url: APP_BLOCKLIST_PATH },
    {
      id: 'responseActionLog',
      title: 'Response Actions History Log page',
      url: APP_RESPONSE_ACTIONS_HISTORY_PATH,
    },
  ];
};
