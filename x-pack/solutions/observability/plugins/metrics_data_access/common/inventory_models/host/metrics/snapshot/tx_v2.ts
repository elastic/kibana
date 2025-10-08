/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  networkTrafficSingleBucket,
  networkTrafficWithInterfacesWithFilterSingleBucket,
} from '../../../shared/metrics/snapshot/network_traffic';
import type { SchemaBasedAggregations } from '../../../shared/metrics/types';

export const txV2: SchemaBasedAggregations = {
  ecs: networkTrafficSingleBucket('txV2', 'host.network.egress.bytes'),
  semconv: networkTrafficWithInterfacesWithFilterSingleBucket(
    'txV2',
    'system.network.io',
    'device',
    {
      term: {
        direction: 'transmit',
      },
    }
  ),
};
