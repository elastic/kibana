/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cpu } from './cpu';
import { disk } from './disk';
import { memory } from './memory';
import { network } from './network';
import { logs } from './logs';
import { charts as kubernetesNodeCharts } from '../../../kubernetes/node/metrics';

export const charts = {
  get: ({ schemas }: { schemas: Array<'ecs' | 'semconv'> }) => ({
    cpu: cpu.get({ schemas }),
    disk: disk.get({ schemas }),
    memory: memory.get({ schemas }),
    network: network.get({ schemas }),
    logs: logs.get({ schemas }),
    kibernetesNode: kubernetesNodeCharts.node,
  }),
};

export type HostCharts = ReturnType<typeof charts.get>;
