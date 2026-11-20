/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LockManagerService } from '@kbn/lock-manager';
import { LockAcquisitionError } from '@kbn/lock-manager';
import { loggerMock } from '@kbn/logging-mocks';
import { LOCK_ID_RESOURCE_INSTALLER } from '../../common/constants';
import { SLOResourcesNotInstalled } from '../errors';
import { createResourceInstallerMock } from './mocks';
import { ResourceInstallState } from './resource_install_state';

const setup = () => {
  const installer = createResourceInstallerMock();
  const lockManager: jest.Mocked<Pick<LockManagerService, 'withLock'>> = { withLock: jest.fn() };
  lockManager.withLock.mockImplementation((_lockId, callback) => callback());
  const state = new ResourceInstallState({
    installerFactory: async () => installer,
    lockManager,
    logger: loggerMock.create(),
  });
  return { installer, lockManager, state };
};

describe('ResourceInstallState', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('installs once under the resource installer lock and memoizes the success', async () => {
    const { installer, lockManager, state } = setup();
    installer.install.mockResolvedValue();

    await state.ensureInstalled();
    await state.ensureInstalled();

    expect(lockManager.withLock).toHaveBeenCalledWith(
      LOCK_ID_RESOURCE_INSTALLER,
      expect.any(Function)
    );
    expect(installer.install).toHaveBeenCalledTimes(1);
  });

  it('shares one install between concurrent calls', async () => {
    const { installer, state } = setup();
    let resolveInstall: () => void = () => {};
    installer.install.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveInstall = resolve;
      })
    );

    const calls = Promise.all([
      state.ensureInstalled(),
      state.ensureInstalled(),
      state.ensureInstalled(),
    ]);
    await Promise.resolve();
    await Promise.resolve();
    resolveInstall();
    await calls;

    expect(installer.install).toHaveBeenCalledTimes(1);
  });

  it('wraps a failure in SLOResourcesNotInstalled and retries on the next call', async () => {
    const { installer, state } = setup();
    installer.install.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce();

    await expect(state.ensureInstalled()).rejects.toThrow(
      new SLOResourcesNotInstalled('Failed to install SLO resources: boom')
    );
    await expect(state.ensureInstalled()).resolves.toBeUndefined();

    expect(installer.install).toHaveBeenCalledTimes(2);
  });

  it('installs once another process releases the lock', async () => {
    jest.useFakeTimers();
    const { installer, lockManager, state } = setup();
    lockManager.withLock.mockRejectedValueOnce(new LockAcquisitionError('lock held'));
    installer.install.mockResolvedValue();

    const result = state.ensureInstalled();
    await jest.advanceTimersByTimeAsync(2_000);

    await expect(result).resolves.toBeUndefined();
    expect(lockManager.withLock).toHaveBeenCalledTimes(2);
    expect(installer.install).toHaveBeenCalledTimes(1);

    // memoized once installed
    await state.ensureInstalled();
    expect(lockManager.withLock).toHaveBeenCalledTimes(2);
  });

  it('throws SLOResourcesNotInstalled when the lock is still held after the timeout', async () => {
    jest.useFakeTimers();
    const { installer, lockManager, state } = setup();
    lockManager.withLock.mockRejectedValue(new LockAcquisitionError('lock held'));

    const result = state.ensureInstalled();
    const assertion = expect(result).rejects.toThrow(
      new SLOResourcesNotInstalled('SLO resources are being installed by another process')
    );
    await jest.advanceTimersByTimeAsync(30_000);
    await assertion;

    expect(lockManager.withLock).toHaveBeenCalledTimes(16);
    expect(installer.install).not.toHaveBeenCalled();
  });
});
