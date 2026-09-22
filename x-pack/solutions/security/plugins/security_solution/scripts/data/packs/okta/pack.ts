/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TechnologyWatchPack } from '../types';
import { hunts } from './hunts';

export const pack: TechnologyWatchPack = {
  id: 'okta',
  technology: 'Okta',
  eventSources: [
    {
      integration: 'okta',
      version: '3.0.0',
      dataStream: 'okta.system',
      fidelity: 'authored',
      upstreamCommit: 'f86430f5d38a3d5a1f85679f147797c86c50be2c',
      upstreamScenarioId: 'okta-identity-takeover',
    },
  ],
  hunts,
};
