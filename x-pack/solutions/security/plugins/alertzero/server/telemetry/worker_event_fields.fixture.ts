/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertZeroEnvelope } from './worker_event_fields';

/** A run envelope every Worker event fixture builds on. */
export const ENVELOPE_FIXTURE: AlertZeroEnvelope = {
  autonomy_level: 'supervised',
  autonomy_mode: 'auto_accept',
  execution_id: 'c5d0e2a9-3b7e-4c61-8f2d-6a9b0e4d7f21',
  is_default_space: true,
  run_id: '0b6a1f4e-8c43-4a39-9a4e-1f7f5f3f9c10',
  trigger_type: 'scheduled',
  watch_tag: 'watch-floor',
  worker_id: 'system-security-floor-attack-discovery',
};
