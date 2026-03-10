/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MANAGEMENT_PATH } from '../../../common/constants';
import type { ManagementStoreGlobalNamespace } from '../types';
import { AdministrationSubTab } from '../types';

// --[ ROUTING ]---------------------------------------------------------------------------
export const MANAGEMENT_ROUTING_ENDPOINTS_PATH = `${MANAGEMENT_PATH}/:tabName(${AdministrationSubTab.endpoints})`;
export const MANAGEMENT_ROUTING_POLICIES_PATH = `${MANAGEMENT_PATH}/:tabName(${AdministrationSubTab.policies})`;
export const MANAGEMENT_ROUTING_POLICY_DETAILS_FORM_PATH = `${MANAGEMENT_PATH}/:tabName(${AdministrationSubTab.policies})/:policyId/settings`;
export const MANAGEMENT_ROUTING_POLICY_DETAILS_TRUSTED_APPS_PATH = `${MANAGEMENT_PATH}/:tabName(${AdministrationSubTab.policies})/:policyId/trustedApps`;
export const MANAGEMENT_ROUTING_POLICY_DETAILS_TRUSTED_DEVICES_PATH = `${MANAGEMENT_PATH}/:tabName(${AdministrationSubTab.policies})/:policyId/trustedDevices`;
export const MANAGEMENT_ROUTING_POLICY_DETAILS_EVENT_FILTERS_PATH = `${MANAGEMENT_PATH}/:tabName(${AdministrationSubTab.policies})/:policyId/eventFilters`;
export const MANAGEMENT_ROUTING_POLICY_DETAILS_HOST_ISOLATION_EXCEPTIONS_PATH = `${MANAGEMENT_PATH}/:tabName(${AdministrationSubTab.policies})/:policyId/hostIsolationExceptions`;
export const MANAGEMENT_ROUTING_POLICY_DETAILS_BLOCKLISTS_PATH = `${MANAGEMENT_PATH}/:tabName(${AdministrationSubTab.policies})/:policyId/blocklists`;
export const MANAGEMENT_ROUTING_POLICY_DETAILS_ENDPOINT_EXCEPTIONS_PATH = `${MANAGEMENT_PATH}/:tabName(${AdministrationSubTab.policies})/:policyId/endpointExceptions`;
export const MANAGEMENT_ROUTING_POLICY_DETAILS_PROTECTION_UPDATES_PATH = `${MANAGEMENT_PATH}/:tabName(${AdministrationSubTab.policies})/:policyId/protectionUpdates`;
export const MANAGEMENT_ROUTING_NOTES_PATH = `${MANAGEMENT_PATH}/:tabName(${AdministrationSubTab.notes})`;
/** @deprecated use the paths defined above instead */
export const MANAGEMENT_ROUTING_POLICY_DETAILS_PATH_OLD = `${MANAGEMENT_PATH}/:tabName(${AdministrationSubTab.policies})/:policyId`;
export const MANAGEMENT_ROUTING_ENDPOINT_EXCEPTIONS_PATH = `${MANAGEMENT_PATH}/:tabName(${AdministrationSubTab.endpointExceptions})`;
export const MANAGEMENT_ROUTING_TRUSTED_APPS_PATH = `${MANAGEMENT_PATH}/:tabName(${AdministrationSubTab.trustedApps})`;
export const MANAGEMENT_ROUTING_TRUSTED_DEVICES_PATH = `${MANAGEMENT_PATH}/:tabName(${AdministrationSubTab.trustedDevices})`;
export const MANAGEMENT_ROUTING_EVENT_FILTERS_PATH = `${MANAGEMENT_PATH}/:tabName(${AdministrationSubTab.eventFilters})`;
export const MANAGEMENT_ROUTING_HOST_ISOLATION_EXCEPTIONS_PATH = `${MANAGEMENT_PATH}/:tabName(${AdministrationSubTab.hostIsolationExceptions})`;
export const MANAGEMENT_ROUTING_BLOCKLIST_PATH = `${MANAGEMENT_PATH}/:tabName(${AdministrationSubTab.blocklist})`;
export const MANAGEMENT_ROUTING_RESPONSE_ACTIONS_HISTORY_PATH = `${MANAGEMENT_PATH}/:tabName(${AdministrationSubTab.responseActionsHistory})`;
export const MANAGEMENT_ROUTING_SCRIPTS_LIBRARY_PATH = `${MANAGEMENT_PATH}/:tabName(${AdministrationSubTab.scriptsLibrary})`;

// --[ STORE ]---------------------------------------------------------------------------
/** The SIEM global store namespace where the management state will be mounted */
export const MANAGEMENT_STORE_GLOBAL_NAMESPACE: ManagementStoreGlobalNamespace = 'management';
/** Namespace within the Management state where policy details state is maintained */
export const MANAGEMENT_STORE_POLICY_DETAILS_NAMESPACE = 'policyDetails';
/** Namespace within the Management state where endpoint-host state is maintained */
export const MANAGEMENT_STORE_ENDPOINTS_NAMESPACE = 'endpoints';

export const MANAGEMENT_PAGE_SIZE_OPTIONS: readonly number[] = [10, 20, 50];
export const MANAGEMENT_DEFAULT_PAGE = 0;
export const MANAGEMENT_DEFAULT_PAGE_SIZE = 10;
export const MANAGEMENT_DEFAULT_SORT_ORDER = 'desc';
export const MANAGEMENT_DEFAULT_SORT_FIELD = 'created_at';

// --[ DEFAULTS ]---------------------------------------------------------------------------
/** The default polling interval for API calls that require a refresh interval */
export const DEFAULT_POLL_INTERVAL = 10000;
