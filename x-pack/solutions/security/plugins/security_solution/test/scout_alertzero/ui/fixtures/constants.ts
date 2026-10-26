/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under the
 * Elastic License 2.0; you may not use this file except in compliance with the Elastic
 * License 2.0.
 */

import { INTERNAL_API_HEADERS, type KibanaRole } from '@kbn/scout-security';

/**
 * Worker and proposal routes are `access: 'internal'` at version 1, so every
 * request needs the internal-origin header plus `elastic-api-version: 1`;
 * mutating routes additionally need `kbn-xsrf`.
 */
export const TI_HEADERS = {
  ...INTERNAL_API_HEADERS,
  'kbn-xsrf': 'some-xsrf-token',
  'Content-Type': 'application/json;charset=UTF-8',
};

/**
 * AlertZero read-only: AlertZero read without write, no cluster privileges.
 * Cannot PATCH workers (no `alertzero_write`, no `manage_security`, no
 * `updateManaged` extended privilege) — used for the privilege-gating specs.
 */
export const ALERTZERO_READ_ONLY_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [],
  },
  kibana: [
    {
      base: [],
      feature: { siem: ['read'], alertzero: ['read'] },
      spaces: ['*'],
    },
  ],
};
