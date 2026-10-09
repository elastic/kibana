/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout-security';

export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'Content-Type': 'application/json;charset=UTF-8',
};

export const CRIBL_ROUTING_PIPELINE = 'cribl-routing-pipeline';

/**
 * Fleet privileges sufficient to manage package policies, without Elasticsearch
 * ingest pipeline management rights.
 */
export const FLEET_ALL_NO_PIPELINE_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [],
  },
  kibana: [
    {
      base: [],
      feature: { fleetv2: ['all'], fleet: ['all'] },
      spaces: ['*'],
    },
  ],
};
