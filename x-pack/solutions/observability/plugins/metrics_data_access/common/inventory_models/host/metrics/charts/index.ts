/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { init as initCpuCharts } from './cpu';
import { init as initDiskCharts } from './disk';
import { init as initMemoryCharts } from './memory';
import { init as initNetworkCharts } from './network';
import { logs } from './logs';
import { charts as kubernetesNodeCharts } from '../../../kubernetes/node/metrics';
import { type ChartsConfigMap, type FormulasCatalog } from '../../../shared/metrics/types';
import type { HostFormulas } from '../formulas';

export const initCharts = (formulas: FormulasCatalog<HostFormulas>) => {
  return {
    cpu: initCpuCharts(formulas),
    disk: initDiskCharts(formulas),
    memory: initMemoryCharts(formulas),
    network: initNetworkCharts(formulas),
    logs,
    ...(formulas.schema === 'ecs' ? { kubernetesNode: kubernetesNodeCharts.node } : {}),
  } satisfies ChartsConfigMap;
};
export type HostCharts = ReturnType<typeof initCharts>;
