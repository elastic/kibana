/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout-security';

/**
 * Role combining security alert index privileges with full Kibana access.
 * Shared by tests that need both alert visibility and Kibana-level features
 * (e.g. agent builder, workflow management).
 */
export const FULL_KIBANA_SECURITY_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: ['manage'],
    indices: [
      {
        names: [
          '.alerts-security*',
          '.internal.alerts-security*',
          '.siem-signals-*',
          'apm-*-transaction*',
          'traces-apm*',
          'auditbeat-*',
          'endgame-*',
          'filebeat-*',
          'logs-*',
          'packetbeat-*',
          'winlogbeat-*',
          'logstash-*',
          '.lists*',
          '.items*',
        ],
        privileges: ['read', 'write'],
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
};
