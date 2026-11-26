/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors as EsErrors } from '@elastic/elasticsearch';
import type { LockManagerService } from '@kbn/lock-manager';
import { LockAcquisitionError } from '@kbn/lock-manager';
import { loggerMock } from '@kbn/logging-mocks';
import { LOCK_ID_RESOURCE_INSTALLER } from '../../common/constants';
import { SLOResourcesNotInstalled } from '../errors';
import { DEFAULT_RETRY_OPTIONS, REQUEST_RETRY_OPTIONS } from '../utils/retry';
import { createResourceInstallerMock } from './mocks';
import { ResourceInstallState } from './resource_install_state';

const setup = () => {
  const installer = createResourceInstallerMock();
  const lockManager: jest.Mocked<Pick<LockManagerService, 'withLock'>> = { withLock: jest.fn() };
  lockManager.withLock.mockImplementation((_lockId, callback) => callback());
  const installerFactory = jest.fn(async () => installer);
  const logger = loggerMock.create();
  const state = new ResourceInstallState({ installerFactory, lockManager, logger });
  return { installer, installerFactory, lockManager, logger, state };
};

describe('ResourceInstallState', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
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

  it.each([
    ['request retry options by default', undefined, REQUEST_RETRY_OPTIONS],
    ['the given retry options', DEFAULT_RETRY_OPTIONS, DEFAULT_RETRY_OPTIONS],
  ])('builds the installer with %s', async (_name, given, expected) => {
    const { installer, installerFactory, state } = setup();
    installer.install.mockResolvedValue();

    await state.ensureInstalled(given);

    expect(installerFactory).toHaveBeenCalledWith({ retryOptions: expected });
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
    const { installer, logger, state } = setup();
    installer.install.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce();

    await expect(state.ensureInstalled()).rejects.toThrow(
      new SLOResourcesNotInstalled('SLO resources are not installed yet, try again later')
    );
    await expect(state.ensureInstalled()).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalledWith('Failed to install SLO resources: boom');
    expect(installer.install).toHaveBeenCalledTimes(2);
  });

  it('reconcile installs under the lock and marks the resources installed', async () => {
    const { installer, installerFactory, lockManager, state } = setup();
    installer.install.mockResolvedValue();

    await expect(state.reconcile()).resolves.toBe(true);
    await state.ensureInstalled();

    expect(installerFactory).toHaveBeenCalledWith({ retryOptions: DEFAULT_RETRY_OPTIONS });
    expect(lockManager.withLock).toHaveBeenCalledTimes(1);
  });

  it('reconcile returns false without waiting when another process holds the lock', async () => {
    const { installer, lockManager, state } = setup();
    lockManager.withLock.mockRejectedValue(new LockAcquisitionError('lock held'));

    await expect(state.reconcile()).resolves.toBe(false);

    expect(lockManager.withLock).toHaveBeenCalledTimes(1);
    expect(installer.install).not.toHaveBeenCalled();
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

    expect(lockManager.withLock.mock.calls.length).toBeGreaterThan(1);
    expect(installer.install).not.toHaveBeenCalled();
  });

  it('reconcile failure invalidates a previously cached success', async () => {
    const { installer, lockManager, state } = setup();
    installer.install.mockResolvedValueOnce().mockRejectedValueOnce(new Error('boom'));

    await state.ensureInstalled();
    await expect(state.reconcile()).rejects.toThrow(
      new SLOResourcesNotInstalled('SLO resources are not installed yet, try again later')
    );
    await state.ensureInstalled();

    expect(lockManager.withLock).toHaveBeenCalledTimes(3);
  });

  it('reconcile keeps a cached success when another process holds the lock', async () => {
    const { installer, lockManager, state } = setup();
    installer.install.mockResolvedValue();

    await state.ensureInstalled();
    lockManager.withLock.mockRejectedValueOnce(new LockAcquisitionError('lock held'));
    await expect(state.reconcile()).resolves.toBe(false);
    await state.ensureInstalled();

    expect(lockManager.withLock).toHaveBeenCalledTimes(2);
  });

  it('times out when a single lock attempt outlasts the wait budget', async () => {
    jest.useFakeTimers();
    const { lockManager, state } = setup();
    lockManager.withLock.mockReturnValue(new Promise(() => {}));

    const assertion = expect(state.ensureInstalled()).rejects.toThrow(
      new SLOResourcesNotInstalled('SLO resources are being installed by another process')
    );
    await jest.advanceTimersByTimeAsync(30_000);
    await assertion;
  });

  it('does not cut off an install that already holds the lock when the wait budget elapses', async () => {
    jest.useFakeTimers();
    const { installer, state } = setup();
    let resolveInstall: () => void = () => {};
    installer.install.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveInstall = resolve;
      })
    );

    const result = state.ensureInstalled();
    await jest.advanceTimersByTimeAsync(60_000);
    resolveInstall();

    await expect(result).resolves.toBeUndefined();
  });

  it('does not install when the lock is acquired after the wait budget elapsed', async () => {
    const { installer, lockManager, state } = setup();
    lockManager.withLock.mockImplementation(async (_lockId, callback) => {
      // the budget elapses while the acquisition is pending, before the timer callback runs
      jest.spyOn(performance, 'now').mockReturnValue(performance.now() + 31_000);
      return callback();
    });

    await expect(state.ensureInstalled()).rejects.toThrow(
      new SLOResourcesNotInstalled('SLO resources are being installed by another process')
    );
    expect(installer.install).not.toHaveBeenCalled();
  });

  it('installs when the wall clock jumps forward while the lock is acquired', async () => {
    jest.useFakeTimers();
    const { installer, lockManager, state } = setup();
    lockManager.withLock.mockImplementation(async (_lockId, callback) => {
      jest.setSystemTime(Date.now() + 31_000);
      return callback();
    });

    await expect(state.ensureInstalled()).resolves.toBeUndefined();
    expect(installer.install).toHaveBeenCalledTimes(1);
  });

  it('passes the reconcile signal to the installer and rethrows its abort unwrapped', async () => {
    const { installer, installerFactory, logger, state } = setup();
    const abortController = new AbortController();
    const abortError = new EsErrors.RequestAbortedError('Request aborted');
    installer.install.mockImplementation(async () => {
      abortController.abort();
      throw abortError;
    });

    await expect(state.reconcile(abortController.signal)).rejects.toBe(abortError);

    expect(installerFactory).toHaveBeenCalledWith({
      retryOptions: DEFAULT_RETRY_OPTIONS,
      signal: abortController.signal,
    });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('treats an abort error raised without cancellation as an install failure', async () => {
    const { installer, logger, state } = setup();
    installer.install.mockRejectedValue(new EsErrors.RequestAbortedError('Response too large'));

    await expect(state.reconcile(new AbortController().signal)).rejects.toThrow(
      new SLOResourcesNotInstalled('SLO resources are not installed yet, try again later')
    );

    expect(logger.warn).toHaveBeenCalledWith('Failed to install SLO resources: Response too large');
  });
});
