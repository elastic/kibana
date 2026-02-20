/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Defend Workflows Scout test constants (routes, selectors, etc.).
 * Extend as specs are migrated from Cypress.
 */
export const DEFEND_WORKFLOWS_ROUTES = {
  endpoints: '/app/security/administration/endpoints',
  policies: '/app/security/administration/policy',
  trustedApps: '/app/security/administration/trusted_apps',
  eventFilters: '/app/security/administration/event_filters',
  blocklist: '/app/security/administration/blocklist',
  hostIsolationExceptions: '/app/security/administration/host_isolation_exceptions',
  responseActionsHistory: '/app/security/administration/response_actions_history',
} as const;

/** Main page test-subj per route for minimal "page loads" assertions. */
export const DEFEND_WORKFLOWS_PAGE_SUBJS: Record<string, string> = {
  [DEFEND_WORKFLOWS_ROUTES.endpoints]: 'endpointPage',
  [DEFEND_WORKFLOWS_ROUTES.policies]: 'policyListPage',
  [DEFEND_WORKFLOWS_ROUTES.trustedApps]: 'trustedAppsListPage',
  [DEFEND_WORKFLOWS_ROUTES.eventFilters]: 'EventFiltersListPage',
  [DEFEND_WORKFLOWS_ROUTES.blocklist]: 'blocklistPage',
  [DEFEND_WORKFLOWS_ROUTES.hostIsolationExceptions]: 'hostIsolationExceptionsListPage',
  [DEFEND_WORKFLOWS_ROUTES.responseActionsHistory]: 'responseActionsPage',
};
