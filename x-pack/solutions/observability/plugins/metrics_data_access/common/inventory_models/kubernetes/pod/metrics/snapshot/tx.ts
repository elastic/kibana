/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SEMCONV_K8S_POD_NETWORK_IO } from '../../../../../constants';
import {
  networkTraffic,
  networkTrafficWithInterfacesWithFilter,
} from '../../../../shared/metrics/snapshot/network_traffic';
import type { SchemaBasedAggregations } from '../../../../shared/metrics/types';

export const tx: SchemaBasedAggregations = {
  ecs: networkTraffic('tx', 'kubernetes.pod.network.tx.bytes'),
  semconv: networkTrafficWithInterfacesWithFilter('tx', SEMCONV_K8S_POD_NETWORK_IO, 'interface', {
    term: {
      direction: 'transmit',
    },
  }),
};
