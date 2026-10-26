/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID } from '@kbn/alertzero-common';
import { buildWorkerInvestigationReopenedPayload } from './build_worker_investigation_reopened_payload';

const INVESTIGATION_ID = '3f1c2b4a-5d6e-5f70-8a9b-0c1d2e3f4a5b';

describe('buildWorkerInvestigationReopenedPayload', () => {
  it('carries the Investigation id, the catalog fields and whether the space is the default', () => {
    expect(
      buildWorkerInvestigationReopenedPayload({
        investigationId: INVESTIGATION_ID,
        spaceId: 'default',
        workerId: SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
      })
    ).toEqual({
      investigation_id: INVESTIGATION_ID,
      is_default_space: true,
      watch_tag: 'watch-hunt',
      worker_id: SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
    });
  });

  it('never carries the space id', () => {
    const payload = buildWorkerInvestigationReopenedPayload({
      investigationId: INVESTIGATION_ID,
      spaceId: 'security-team',
      workerId: SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
    });

    expect({
      isDefaultSpace: payload.is_default_space,
      values: Object.values(payload),
    }).toEqual({ isDefaultSpace: false, values: expect.not.arrayContaining(['security-team']) });
  });

  it('ships the `other` catalog fields for a worker id outside the catalog', () => {
    expect(
      buildWorkerInvestigationReopenedPayload({
        investigationId: INVESTIGATION_ID,
        spaceId: 'default',
        workerId: 'custom-worker',
      })
    ).toEqual(expect.objectContaining({ watch_tag: 'other', worker_id: 'other' }));
  });
});
