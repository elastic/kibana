/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityEvent } from './types';

export function generateEvent(extra: Record<string, unknown> = {}): SecurityEvent {
  return {
    '@timestamp': Date.now(),
    ecs: { version: '1.4.0' },
    event: { kind: 'event', category: 'process', type: 'start' },
    ...extra,
  };
}
