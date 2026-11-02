/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ELASTIC_INTERNAL_ORIGIN_HEADER, PUBLIC_API_HEADERS } from '@kbn/scout-security';
import type { KibanaRole } from '@kbn/scout-security';

export const PUBLIC_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'Content-Type': 'application/json;charset=UTF-8',
  ...ELASTIC_INTERNAL_ORIGIN_HEADER,
  ...PUBLIC_API_HEADERS,
};

/**
 * Full Kibana access plus the alert and list indices a detection rule needs to run, but only
 * `view_index_metadata` on the source index pattern. Field capabilities succeed on that pattern
 * while searches silently resolve to zero shards, which is what happens when a rule owner can
 * see indices but cannot read them, e.g. in a linked cross-project search project.
 */
export const getViewIndexMetadataOnlyRole = (sourceIndexPattern: string): KibanaRole => ({
  elasticsearch: {
    cluster: [],
    indices: [
      {
        names: [
          '.alerts-security*',
          '.internal.alerts-security*',
          '.siem-signals-*',
          '.lists*',
          '.items*',
        ],
        privileges: ['read', 'write', 'view_index_metadata', 'manage'],
      },
      {
        names: [sourceIndexPattern],
        privileges: ['view_index_metadata'],
      },
    ],
  },
  kibana: [
    {
      base: ['all'],
      feature: {},
      spaces: ['*'],
    },
  ],
});
