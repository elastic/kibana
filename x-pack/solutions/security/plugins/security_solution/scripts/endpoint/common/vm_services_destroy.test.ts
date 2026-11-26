/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import execa from 'execa';
import { createToolingLogger } from '../../../common/endpoint/data_loaders/utils';
import { createVagrantHostVmClient } from './vm_services';

jest.mock('execa');

describe('Vagrant VM destroy', () => {
  const commandMock = execa.command as unknown as jest.Mock;
  const destroyVm = () => createVagrantHostVmClient('vm-1', undefined, createToolingLogger());

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  it('gives each attempt 120 seconds and stops after one success', async () => {
    commandMock.mockResolvedValue({ stdout: '' });

    await destroyVm().destroy();

    expect(commandMock).toHaveBeenCalledTimes(1);
    expect(commandMock).toHaveBeenCalledWith(
      'vagrant destroy -f',
      expect.objectContaining({ timeout: 120_000 })
    );
  });

  it('retries once after a failed attempt', async () => {
    commandMock.mockRejectedValueOnce(new Error('timed out')).mockResolvedValueOnce({ stdout: '' });

    const destroyed = destroyVm().destroy();
    await jest.advanceTimersByTimeAsync(2_000);

    await expect(destroyed).resolves.toBeUndefined();
    expect(commandMock).toHaveBeenCalledTimes(2);
  });

  it('rejects with the last error after two failed attempts', async () => {
    const lastError = new Error('vagrant destroy hung');
    commandMock.mockRejectedValueOnce(new Error('first')).mockRejectedValueOnce(lastError);

    const destroyed = destroyVm().destroy();
    const outcome = expect(destroyed).rejects.toBe(lastError);
    await jest.advanceTimersByTimeAsync(2_000);
    await outcome;

    expect(commandMock).toHaveBeenCalledTimes(2);
  });
});
