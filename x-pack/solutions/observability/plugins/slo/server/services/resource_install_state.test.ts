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

  it('installs under the resource installer lock', async () => {
    const { installer, lockManager, state } = setup();
    installer.install.mockResolvedValue();

    await state.ensureInstalled();

    expect(lockManager.withLock).toHaveBeenCalledWith(
      LOCK_ID_RESOURCE_INSTALLER,
      expect.any(Function)
    );
    expect(installer.install).toHaveBeenCalledTimes(1);
  });

  it('memoizes a successful install', async () => {
    const { installer, state } = setup();
    installer.install.mockResolvedValue();

    await state.ensureInstalled();
    await state.ensureInstalled();
    await state.ensureInstalled();

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

  it('retries on the next call after a failure', async () => {
    const { installer, state } = setup();
    installer.install
      .mockRejectedValueOnce(new SLOResourcesNotInstalled('Failed to install SLO resources: [x]'))
      .mockResolvedValueOnce();

    await expect(state.ensureInstalled()).rejects.toThrow(SLOResourcesNotInstalled);
    await expect(state.ensureInstalled()).resolves.toBeUndefined();

    expect(installer.install).toHaveBeenCalledTimes(2);
  });

  it('wraps unexpected errors in SLOResourcesNotInstalled', async () => {
    const { installer, state } = setup();
    installer.install.mockRejectedValue(new Error('boom'));

    await expect(state.ensureInstalled()).rejects.toThrow(
      new SLOResourcesNotInstalled('Failed to install SLO resources: boom')
    );
  });

  it('resolves when another process holds the lock and the resources are verified', async () => {
    jest.useFakeTimers();
    const { installer, lockManager, state } = setup();
    lockManager.withLock.mockRejectedValue(new LockAcquisitionError('lock held'));
    installer.verify.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    const result = state.ensureInstalled();
    await jest.advanceTimersByTimeAsync(2_000);

    await expect(result).resolves.toBeUndefined();
    expect(installer.install).not.toHaveBeenCalled();
    expect(installer.verify).toHaveBeenCalledTimes(2);

    // memoized once verified
    await state.ensureInstalled();
    expect(lockManager.withLock).toHaveBeenCalledTimes(1);
  });

  it('throws SLOResourcesNotInstalled when the resources are not verified before the timeout', async () => {
    jest.useFakeTimers();
    const { installer, lockManager, state } = setup();
    lockManager.withLock.mockRejectedValue(new LockAcquisitionError('lock held'));
    installer.verify.mockResolvedValue(false);

    const result = state.ensureInstalled();
    const assertion = expect(result).rejects.toThrow(SLOResourcesNotInstalled);
    await jest.advanceTimersByTimeAsync(30_000);
    await assertion;

    expect(installer.verify).toHaveBeenCalledTimes(16);
  });
});
