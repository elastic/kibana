/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TechnologyWatchPack } from '../types';
import { hunts } from './hunts';

export const pack: TechnologyWatchPack = {
  id: 'ip-fields',
  technology: 'Network Security',
  eventSources: [
    {
      integration: 'network',
      version: '1.0.0',
      dataStream: 'network.security',
      fidelity: 'authored',
    },
  ],
  hunts,
};
