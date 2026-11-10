/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  NIGHTSHIFT_FEATURE_ID,
  NIGHTSHIFT_MANAGE_ENGINES_SUB_FEATURE_ID,
  NIGHTSHIFT_SOURCE_VIEW_PREFIX,
} from '@kbn/nightshift-shared';
import type { KibanaRole } from '@kbn/scout-oblt';

export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'elastic-api-version': '1',
} as const;

export const SOURCES_PATH = 'internal/nightshift/sources';

/**
 * Test data indices are created under this prefix so roles can be scoped to them. It avoids
 * `logs-*` on purpose because that template only allows data streams.
 */
export const TEST_INDEX_PREFIX = 'nightshift-sources-test-';
export const RECOMMENDED_SOURCE_TEST_INDEX_PREFIX = 'logsnightshift-sources-recommendation-test-';

const VIEW_NAME_PATTERN = `${NIGHTSHIFT_SOURCE_VIEW_PREFIX}*`;

// ES|QL view operations are index privileges on the view name. `manage` covers create, read
// definition and delete on every ES version Kibana tests against.
const VIEW_MANAGE_PRIVILEGES = { names: [VIEW_NAME_PATTERN], privileges: ['read', 'manage'] };
const VIEW_READ_PRIVILEGES = {
  names: [VIEW_NAME_PATTERN],
  privileges: ['read', 'read_view_metadata'],
};
const TEST_DATA_READ_PRIVILEGES = {
  names: [`${TEST_INDEX_PREFIX}*`, `${RECOMMENDED_SOURCE_TEST_INDEX_PREFIX}*`],
  privileges: ['read', 'view_index_metadata'],
};

// Saving a source checks that its author can read every index the query names, and the All logs
// recommendation is the query `FROM logs*`. The check asks for read on the pattern itself, so the
// test-prefixed indices above do not cover it.
const RECOMMENDED_SOURCE_READ_PRIVILEGES = {
  names: ['logs*'],
  privileges: ['read', 'view_index_metadata'],
};

export const NIGHTSHIFT_MANAGER_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [
      VIEW_MANAGE_PRIVILEGES,
      TEST_DATA_READ_PRIVILEGES,
      RECOMMENDED_SOURCE_READ_PRIVILEGES,
    ],
  },
  kibana: [
    {
      base: [],
      feature: { [NIGHTSHIFT_FEATURE_ID]: ['all', NIGHTSHIFT_MANAGE_ENGINES_SUB_FEATURE_ID] },
      spaces: ['*'],
    },
  ],
};

/**
 * A manager whose index read covers only the `readable` part of the test prefix, so it can run
 * `FROM nightshift-sources-test-*` but does not hold read on the pattern itself.
 */
export const NIGHTSHIFT_PARTIAL_READ_MANAGER_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [
      VIEW_MANAGE_PRIVILEGES,
      {
        names: [`${TEST_INDEX_PREFIX}readable-*`],
        privileges: ['read', 'view_index_metadata'],
      },
    ],
  },
  kibana: NIGHTSHIFT_MANAGER_ROLE.kibana,
};

/**
 * Nightshift `all` without the Manage engines sub-feature: manage but not configure. Has every
 * Elasticsearch privilege the manager has, so a 403 can only come from the Kibana privilege.
 */
export const NIGHTSHIFT_MANAGE_ONLY_ROLE: KibanaRole = {
  elasticsearch: NIGHTSHIFT_MANAGER_ROLE.elasticsearch,
  kibana: [{ base: [], feature: { [NIGHTSHIFT_FEATURE_ID]: ['all'] }, spaces: ['*'] }],
};

export const NIGHTSHIFT_READ_ONLY_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [VIEW_READ_PRIVILEGES, TEST_DATA_READ_PRIVILEGES],
  },
  kibana: [{ base: [], feature: { [NIGHTSHIFT_FEATURE_ID]: ['read'] }, spaces: ['*'] }],
};

/** Kibana read access and no explicit Elasticsearch privileges. View read comes from the implicit grant, so GET health is `ok`. */
export const NIGHTSHIFT_READ_ONLY_NO_ES_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: [], feature: { [NIGHTSHIFT_FEATURE_ID]: ['read'] }, spaces: ['*'] }],
};

export const NO_NIGHTSHIFT_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: [], feature: { advancedSettings: ['read'] }, spaces: ['*'] }],
};
