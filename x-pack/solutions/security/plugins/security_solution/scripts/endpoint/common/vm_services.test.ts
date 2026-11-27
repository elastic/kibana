/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import execa from 'execa';
import { createToolingLogger } from '../../../common/endpoint/data_loaders/utils';
import { createVm, VAGRANT_UP_TIMEOUT_MS } from './vm_services';

jest.mock('execa');
jest.mock('fs/promises', () => ({
  ...jest.requireActual('fs/promises'),
  statfs: jest.fn().mockResolvedValue({ bfree: 1e9, bsize: 4096 }),
}));

describe('createVm with vagrant', () => {
  const commandMock = execa.command as unknown as jest.Mock;
  const DESTROY_MS = 20_000;
  let now: number;

  const create = (createBudgetMs?: number) =>
    createVm({
      type: 'vagrant',
      name: 'vm-1',
      agentDownload: {
        filename: 'agent.tar.gz',
        fullFilePath: '/tmp/agent.tar.gz',
        directory: '/tmp',
      },
      log: createToolingLogger(),
      createBudgetMs,
    });

  const upCalls = () => commandMock.mock.calls.filter(([cmd]) => cmd === 'vagrant up');
  const upTimeouts = () => upCalls().map(([, options]) => options.timeout);

  /** Each `vagrant destroy` takes DESTROY_MS; the first `vagrant up` fails after `firstUpMs`. */
  const mockCommands = (firstUpMs: number, error: Error = new Error('apt-get failed')) => {
    commandMock.mockImplementation(async (cmd: string) => {
      if (cmd === 'vagrant destroy -f') {
        now += DESTROY_MS;
      }
      if (cmd === 'vagrant up' && upCalls().length === 1) {
        now += firstUpMs;
        throw error;
      }
      return { stdout: '' };
    });
  };

  beforeEach(() => {
    now = 1_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  describe('without a creation budget', () => {
    it('bounds each `vagrant up` and retries after a late failure', async () => {
      // The failure from the Cypress lane: `vagrant up` failed on apt-get after 2m43s.
      mockCommands(163_000);

      await create();

      expect(upTimeouts()).toEqual([VAGRANT_UP_TIMEOUT_MS, VAGRANT_UP_TIMEOUT_MS]);
    });
  });

  describe('with a creation budget', () => {
    const BUDGET_MS = 360_000;

    it('gives the retry only the time left in the budget', async () => {
      mockCommands(60_000);

      await create(BUDGET_MS);

      expect(upTimeouts()).toEqual([
        BUDGET_MS - DESTROY_MS,
        BUDGET_MS - (DESTROY_MS + 60_000 + DESTROY_MS),
      ]);
    });

    it('does not retry when the remaining budget is too short', async () => {
      mockCommands(163_000);

      await expect(create(BUDGET_MS)).rejects.toThrow('apt-get failed');

      expect(upCalls()).toHaveLength(1);
    });

    it('does not retry once a hung attempt has used the budget', async () => {
      mockCommands(
        BUDGET_MS - DESTROY_MS,
        Object.assign(new Error('timed out'), { timedOut: true })
      );

      await expect(create(BUDGET_MS)).rejects.toThrow('timed out');

      expect(upCalls()).toHaveLength(1);
    });
  });
});
