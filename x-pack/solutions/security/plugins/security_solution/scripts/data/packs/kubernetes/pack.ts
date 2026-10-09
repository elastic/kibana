/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TechnologyWatchPack } from '../types';
import { hunts } from './hunts';

export const pack: TechnologyWatchPack = {
  id: 'kubernetes',
  technology: 'Kubernetes',
  eventSources: [
    {
      integration: 'kubernetes',
      version: '3.0.0',
      dataStream: 'kubernetes.audit',
      fidelity: 'authored',
      upstreamCommit: 'f86430f5d38a3d5a1f85679f147797c86c50be2c',
      upstreamScenarioId: 'kubernetes-audit',
    },
  ],
  hunts,
};
