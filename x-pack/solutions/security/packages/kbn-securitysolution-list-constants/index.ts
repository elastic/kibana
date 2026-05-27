/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deepFreeze } from '@kbn/std';

/**
 * Value list routes
 */
export const LIST_URL = '/api/lists';
export const LIST_INDEX = `${LIST_URL}/index`;
export const LIST_ITEM_URL = `${LIST_URL}/items`;
export const LIST_PRIVILEGES_URL = `${LIST_URL}/privileges`;

/**
 * Internal value list routes
 */
export const INTERNAL_LIST_URL = '/internal/lists';
export const INTERNAL_FIND_LISTS_BY_SIZE = `${INTERNAL_LIST_URL}/_find_lists_by_size` as const;
export const INTERNAL_EXCEPTION_FILTER = `${INTERNAL_LIST_URL}/_create_filter` as const;

/**
 * Exception list routes
 */
export const EXCEPTION_LIST_URL = '/api/exception_lists';
export const EXCEPTION_LIST_ITEM_URL = '/api/exception_lists/items';

/**
 * Internal exception list routes
 */
export const INTERNAL_EXCEPTION_LIST_URL = `/internal${EXCEPTION_LIST_URL}`;
export const INTERNAL_EXCEPTIONS_LIST_ENSURE_CREATED_URL = `${INTERNAL_EXCEPTION_LIST_URL}/_create`;

/**
 * Exception list spaces
 */
export const EXCEPTION_LIST_NAMESPACE_AGNOSTIC = 'exception-list-agnostic';
export const EXCEPTION_LIST_NAMESPACE_AWARE = 'exception-list';

/**
 * Specific routes for the single global space agnostic endpoint list
 */
export const ENDPOINT_LIST_URL = '/api/endpoint_list';

/**
 * Specific routes for the single global space agnostic endpoint list. These are convenience
 * routes where they are going to try and create the global space agnostic endpoint list if it
 * does not exist yet or if it was deleted at some point and re-create it before adding items to
 * the list
 */
export const ENDPOINT_LIST_ITEM_URL = '/api/endpoint_list/items';

export const MAX_EXCEPTION_LIST_SIZE = 10000;

export const MAXIMUM_SMALL_VALUE_LIST_SIZE = 65536;

export const MAXIMUM_SMALL_IP_RANGE_VALUE_LIST_DASH_SIZE = 200;

/**
 * List definitions for Endpoint Artifact
 */
export const ENDPOINT_ARTIFACT_LISTS = deepFreeze({
  endpointExceptions: {
    id: 'endpoint_list',
    name: 'Endpoint Security Exception List',
    description: 'Endpoint Security Exception List',
  },
  trustedApps: {
    id: 'endpoint_trusted_apps',
    name: 'Endpoint Security Trusted Apps List',
    description: 'Endpoint Security Trusted Apps List',
  },
  trustedDevices: {
    id: 'endpoint_trusted_devices',
    name: 'Endpoint Security Trusted Devices List',
    description: 'Endpoint Security Trusted Devices List',
  },
  eventFilters: {
    id: 'endpoint_event_filters',
    name: 'Endpoint Security Event Filters List',
    description: 'Endpoint Security Event Filters List',
  },
  hostIsolationExceptions: {
    id: 'endpoint_host_isolation_exceptions',
    name: 'Endpoint Security Host isolation exceptions List',
    description: 'Endpoint Security Host isolation exceptions List',
  },
  blocklists: {
    id: 'endpoint_blocklists',
    name: 'Endpoint Security Blocklists List',
    description: 'Endpoint Security Blocklists List',
  },
} as const);

/**
 * The IDs of all Endpoint artifact lists
 */
export const ENDPOINT_ARTIFACT_LIST_IDS = Object.freeze(
  Object.values(ENDPOINT_ARTIFACT_LISTS).map(({ id }) => id)
);
