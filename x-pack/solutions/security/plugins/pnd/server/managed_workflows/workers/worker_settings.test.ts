/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SYSTEM_SECURITY_WORKER_DARK_CONTINUOUS_THREAT_HUNT_ID,
  SYSTEM_SECURITY_WORKER_IDS,
  WorkerSettings,
} from '@kbn/pnd-common';
import { createWorkerSettingsRegistration } from './worker_settings';

describe('createWorkerSettingsRegistration', () => {
  it.each([...SYSTEM_SECURITY_WORKER_IDS])(
    '%s defaults round-trip through the public WorkerSettings schema',
    (workerId) => {
      const registration = createWorkerSettingsRegistration(workerId);
      const projected = registration.toSettings(registration.createDefaultValues());

      expect(WorkerSettings.parse(projected)).toEqual(projected);
      expect(projected).toEqual(
        expect.objectContaining({
          workerId,
          autonomy: 'manual',
        })
      );
    }
  );

  it('does not silently strip projected keys', () => {
    const registration = createWorkerSettingsRegistration(
      SYSTEM_SECURITY_WORKER_DARK_CONTINUOUS_THREAT_HUNT_ID
    );
    const projected = registration.toSettings(registration.createDefaultValues());
    const parsed = WorkerSettings.parse(projected);

    expect(Object.keys(parsed).sort()).toEqual(Object.keys(projected).sort());
    expect(parsed).toEqual(projected);
  });
});
