/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import execa from 'execa';
import { createToolingLogger } from '../../../common/endpoint/data_loaders/utils';
import { createVm, VAGRANT_CREATE_BUDGET_MS, VAGRANT_UP_TIMEOUT_MS } from './vm_services';

jest.mock('execa');
jest.mock('fs/promises', () => ({
  ...jest.requireActual('fs/promises'),
  statfs: jest.fn().mockResolvedValue({ bfree: 1e9, bsize: 4096 }),
}));

describe('createVm with vagrant', () => {
  const commandMock = execa.command as unknown as jest.Mock;
  let now: number;

  const create = () =>
    createVm({
      type: 'vagrant',
      name: 'vm-1',
      agentDownload: {
        filename: 'agent.tar.gz',
        fullFilePath: '/tmp/agent.tar.gz',
        directory: '/tmp',
      },
      log: createToolingLogger(),
    });

  const upCalls = () => commandMock.mock.calls.filter(([cmd]) => cmd === 'vagrant up');

  beforeEach(() => {
    now = 1_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it('bounds each `vagrant up` and retries once after a quick failure', async () => {
    commandMock.mockImplementation(async (cmd: string) => {
      if (cmd === 'vagrant up' && upCalls().length === 1) {
        now += 20_000;
        throw new Error('transient');
      }
      return { stdout: '' };
    });

    await create();

    expect(upCalls()).toHaveLength(2);
    expect(upCalls()[0][1].timeout).toBe(VAGRANT_UP_TIMEOUT_MS);
  });

  it('does not retry once a hung attempt has used the creation budget', async () => {
    commandMock.mockImplementation(async (cmd: string) => {
      if (cmd === 'vagrant up') {
        now += VAGRANT_UP_TIMEOUT_MS;
        throw Object.assign(new Error('timed out'), { timedOut: true });
      }
      return { stdout: '' };
    });

    await expect(create()).rejects.toThrow('timed out');

    expect(upCalls()).toHaveLength(1);
    expect(VAGRANT_UP_TIMEOUT_MS).toBeLessThan(VAGRANT_CREATE_BUDGET_MS);
  });
});
