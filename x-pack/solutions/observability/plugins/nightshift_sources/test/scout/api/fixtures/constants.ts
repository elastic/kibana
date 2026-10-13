/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NIGHTSHIFT_FEATURE_ID, NIGHTSHIFT_SOURCE_VIEW_PREFIX } from '@kbn/nightshift-shared';
import type { KibanaRole } from '@kbn/scout-oblt';

export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'elastic-api-version': '1',
} as const;

export const SOURCES_PATH = 'internal/nightshift/sources';

/**
 * Test data indices are created under this prefix so roles can be scoped to them. It avoids
 * `logs-*` on purpose: that template only allows data streams.
 */
export const TEST_INDEX_PREFIX = 'nightshift-sources-test-';

const VIEW_NAME_PATTERN = `${NIGHTSHIFT_SOURCE_VIEW_PREFIX}*`;

// ES|QL view operations are index privileges on the view name. `manage` covers create, read
// definition and delete on every ES version Kibana tests against.
const VIEW_MANAGE_PRIVILEGES = { names: [VIEW_NAME_PATTERN], privileges: ['read', 'manage'] };
const VIEW_READ_PRIVILEGES = {
  names: [VIEW_NAME_PATTERN],
  privileges: ['read', 'read_view_metadata'],
};
const TEST_DATA_READ_PRIVILEGES = {
  names: [`${TEST_INDEX_PREFIX}*`],
  privileges: ['read', 'view_index_metadata'],
};

export const NIGHTSHIFT_MANAGER_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [VIEW_MANAGE_PRIVILEGES, TEST_DATA_READ_PRIVILEGES],
  },
  kibana: [{ base: [], feature: { [NIGHTSHIFT_FEATURE_ID]: ['all'] }, spaces: ['*'] }],
};

export const NIGHTSHIFT_READ_ONLY_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [VIEW_READ_PRIVILEGES, TEST_DATA_READ_PRIVILEGES],
  },
  kibana: [{ base: [], feature: { [NIGHTSHIFT_FEATURE_ID]: ['read'] }, spaces: ['*'] }],
};

/** Kibana read access but no Elasticsearch privileges: GET health must degrade to `unknown`. */
export const NIGHTSHIFT_READ_ONLY_NO_ES_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: [], feature: { [NIGHTSHIFT_FEATURE_ID]: ['read'] }, spaces: ['*'] }],
};

export const NO_NIGHTSHIFT_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: [], feature: { advancedSettings: ['read'] }, spaces: ['*'] }],
};
