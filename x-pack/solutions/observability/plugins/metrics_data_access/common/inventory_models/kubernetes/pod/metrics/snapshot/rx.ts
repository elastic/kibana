/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { networkTraffic } from '../../../../shared/metrics/snapshot/network_traffic';
export const rx = networkTraffic('rx', 'kubernetes.pod.network.rx.bytes');
