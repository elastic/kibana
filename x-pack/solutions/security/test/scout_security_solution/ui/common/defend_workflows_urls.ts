/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Defend Workflows URL constants for Scout tests.
 * Matches paths from security_solution common constants.
 */
export const APP_PATH = '/app/security' as const;

export const ENDPOINTS_PATH = '/administration/endpoints';
export const POLICIES_PATH = '/administration/policy';
export const TRUSTED_APPS_PATH = '/administration/trusted_apps';
export const TRUSTED_DEVICES_PATH = '/administration/trusted_devices';
export const EVENT_FILTERS_PATH = '/administration/event_filters';
export const HOST_ISOLATION_EXCEPTIONS_PATH = '/administration/host_isolation_exceptions';
export const BLOCKLIST_PATH = '/administration/blocklist';
export const RESPONSE_ACTIONS_HISTORY_PATH = '/administration/response_actions_history';

export const APP_ENDPOINTS_PATH = `${APP_PATH}${ENDPOINTS_PATH}`;
export const APP_POLICIES_PATH = `${APP_PATH}${POLICIES_PATH}`;
export const APP_TRUSTED_APPS_PATH = `${APP_PATH}${TRUSTED_APPS_PATH}`;
export const APP_TRUSTED_DEVICES_PATH = `${APP_PATH}${TRUSTED_DEVICES_PATH}`;
export const APP_EVENT_FILTERS_PATH = `${APP_PATH}${EVENT_FILTERS_PATH}`;
export const APP_HOST_ISOLATION_EXCEPTIONS_PATH =
  `${APP_PATH}${HOST_ISOLATION_EXCEPTIONS_PATH}`;
export const APP_BLOCKLIST_PATH = `${APP_PATH}${BLOCKLIST_PATH}`;
export const APP_RESPONSE_ACTIONS_HISTORY_PATH =
  `${APP_PATH}${RESPONSE_ACTIONS_HISTORY_PATH}`;

export const getPolicyDetailsPath = (policyId: string, tab?: string): string => {
  const base = `${APP_POLICIES_PATH}/${policyId}`;
  return tab ? `${base}/${tab}` : base;
};
