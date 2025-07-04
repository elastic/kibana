/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dockerContainerCpuUsage, k8sContainerCpuUsage } from './cpu';
import { dockerContainerDiskIORead, dockerContainerDiskIOWrite } from './disk';
import { dockerContainerMemoryUsage, k8sContainerMemoryUsage } from './memory';
import { dockerContainerNetworkRx, dockerContainerNetworkTx } from './network';

export const formulas = {
  dockerContainerCpuUsage,
  dockerContainerMemoryUsage,
  dockerContainerNetworkRx,
  dockerContainerNetworkTx,
  dockerContainerDiskIORead,
  dockerContainerDiskIOWrite,
  k8sContainerCpuUsage,
  k8sContainerMemoryUsage,
} as const;

export type ContainerFormulas = typeof formulas;
