/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const URL_PARAM_KEY = {
  appQuery: 'query',
  /** @deprecated */
  eventFlyout: 'eventFlyout', // TODO remove when we assume it's been long enough that all users should use the newer `flyout` key
  flyout: 'flyout',
  timelineFlyout: 'timelineFlyout',
  filters: 'filters',
  savedQuery: 'savedQuery',
  sourcerer: 'sourcerer',
  timeline: 'timeline',
  timerange: 'timerange',
  pageFilter: 'pageFilters',
  rulesTable: 'rulesTable',
  /** Canonical entity store id for host/user explore detail URLs (Rison-encoded). */
  entityId: 'entityId',
  /** Identity field map for entity resolution on explore detail URLs (Rison-encoded object). */
  identityFields: 'identityFields',
} as const;
