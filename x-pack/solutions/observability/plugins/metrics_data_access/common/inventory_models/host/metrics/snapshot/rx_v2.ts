/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SchemaBasedAggregations } from '../../../shared/metrics/types';
import {
  networkTrafficSingleBucket,
  networkTrafficWithInterfacesWithFilterSingleBucket,
} from '../../../shared/metrics/snapshot/network_traffic';

export const rxV2: SchemaBasedAggregations = {
  ecs: networkTrafficSingleBucket('rxV2', 'host.network.ingress.bytes'),
  semconv: networkTrafficWithInterfacesWithFilterSingleBucket(
    'rxV2',
    'system.network.io',
    'device',
    {
      term: {
        direction: 'receive',
      },
    }
  ),
};
