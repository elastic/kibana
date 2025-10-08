/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InventoryTsvbType } from '../../types';

export const nginx: InventoryTsvbType[] = [
  'nginxHits',
  'nginxRequestRate',
  'nginxActiveConnections',
  'nginxRequestsPerConnection',
];

export const aws: InventoryTsvbType[] = [
  'awsOverview',
  'awsCpuUtilization',
  'awsNetworkBytes',
  'awsNetworkPackets',
  'awsDiskioOps',
  'awsDiskioBytes',
];
