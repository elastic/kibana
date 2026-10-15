/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID } from '@kbn/alertzero-common';
import { buildWorkerActivatedPayload } from './build_worker_activated_payload';

describe('buildWorkerActivatedPayload', () => {
  it('carries the catalog fields, the installed autonomy level and the enabled state', () => {
    expect(
      buildWorkerActivatedPayload({
        autonomyLevel: 'supervised',
        enabled: true,
        spaceId: 'default',
        workerId: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
      })
    ).toEqual({
      autonomy_level: 'supervised',
      enabled: true,
      is_default_space: true,
      watch_tag: 'watch-floor',
      worker_id: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
    });
  });

  it('omits autonomy_level when it is unknown', () => {
    const payload = buildWorkerActivatedPayload({
      enabled: false,
      spaceId: 'space-a',
      workerId: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
    });

    expect(payload).not.toHaveProperty('autonomy_level');
    expect(payload).toEqual(expect.objectContaining({ enabled: false, is_default_space: false }));
  });

  it('ships the `other` catalog fields for a worker id outside the catalog', () => {
    expect(
      buildWorkerActivatedPayload({ enabled: true, spaceId: 'default', workerId: 'custom-worker' })
    ).toEqual(expect.objectContaining({ watch_tag: 'other', worker_id: 'other' }));
  });
});
