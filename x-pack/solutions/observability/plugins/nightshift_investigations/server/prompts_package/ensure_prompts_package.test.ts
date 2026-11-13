/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { FleetStartContract } from '@kbn/fleet-plugin/server';
import { createPromptsPackageInstaller } from './ensure_prompts_package';

const notFound = Object.assign(new Error('nightshift_prompts not found'), {
  name: 'PackageNotFoundError',
});

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('createPromptsPackageInstaller', () => {
  it('asks Fleet at most once per interval, including after a failed attempt', async () => {
    const ensureInstalledPackage = jest.fn().mockRejectedValue(notFound);
    const fleet = {
      fleetSetupCompleted: jest.fn().mockResolvedValue(undefined),
      packageService: { asInternalUser: { ensureInstalledPackage } },
    } as unknown as Pick<FleetStartContract, 'fleetSetupCompleted' | 'packageService'>;
    const logger = loggerMock.create();
    let now = 0;
    const ensure = createPromptsPackageInstaller({
      getFleet: () => fleet,
      logger,
      intervalMs: 1000,
      now: () => now,
    });

    ensure();
    now = 999;
    ensure();
    await flush();

    expect(ensureInstalledPackage).toHaveBeenCalledTimes(1);
    expect(ensureInstalledPackage).toHaveBeenCalledWith({ pkgName: 'nightshift_prompts' });
    // A registry without the package yet is expected, so it does not warn.
    expect(logger.warn).not.toHaveBeenCalled();

    now = 1000;
    ensure();
    await flush();

    expect(ensureInstalledPackage).toHaveBeenCalledTimes(2);
  });
});
