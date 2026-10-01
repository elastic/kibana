/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';
import type { ProcessesEntry } from '../../../../common/endpoint/types';
import {
  killProcess,
  listRunningProcesses,
  startDisposableSleep,
  suspendProcess,
} from '../fixtures/process_actions';
import { test } from '../fixtures';

const AGENT_BEAT_COMMAND_SUFFIX = '/components/agentbeat';
const TEST_TIMEOUT_MS = 15 * 60 * 1000;
const SLEEP_LIST_ATTEMPTS = 3;

const parsePid = (pid: string): number => {
  const parsed = Number(pid);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`Process list returned a non-numeric pid: ${pid}`);
  }
  return parsed;
};

const findNewSleepPid = (
  knownPids: ReadonlySet<string>,
  entries: ProcessesEntry[]
): number | undefined => {
  const sleep = entries.find(
    (entry) => !knownPids.has(entry.pid) && entry.command.includes('sleep')
  );
  return sleep ? parsePid(sleep.pid) : undefined;
};

const waitForNewSleepPid = async (
  kbnClient: KbnClient,
  agentId: string,
  knownPids: ReadonlySet<string>
): Promise<number> => {
  let listedCommands: string[] = [];

  for (let attempt = 0; attempt < SLEEP_LIST_ATTEMPTS; attempt++) {
    const entries = await listRunningProcesses(kbnClient, agentId);
    listedCommands = entries.map((entry) => entry.command);
    const pid = findNewSleepPid(knownPids, entries);
    if (pid !== undefined) {
      return pid;
    }
  }

  throw new Error(
    `No new sleep process in the running process list. Commands: ${listedCommands
      .slice(0, 20)
      .join(' | ')}`
  );
};

test.describe('Response console process operations', { tag: ['@local-stateful-classic'] }, () => {
  test.setTimeout(TEST_TIMEOUT_MS);

  test('live agent lists agentbeat and completes kill and suspend', async ({
    kbnClient,
    enrolledEndpoint,
  }) => {
    const { agentId, hostname } = enrolledEndpoint;
    let knownPids = new Set<string>();

    await test.step('processes lists the Endpoint agentbeat process', async () => {
      const entries = await listRunningProcesses(kbnClient, agentId);
      knownPids = new Set(entries.map((entry) => entry.pid));

      expect(entries.some((entry) => entry.command.includes(AGENT_BEAT_COMMAND_SUFFIX))).toBe(true);
    });

    // This worker shares one enrolled host. Kill and suspend a disposable sleep
    // from that process list so stopping agentbeat cannot take the agent down.

    await test.step('kill-process completes for a pid from that list', async () => {
      await startDisposableSleep(hostname);
      const pid = await waitForNewSleepPid(kbnClient, agentId, knownPids);
      knownPids.add(String(pid));
      await killProcess(kbnClient, agentId, pid);
    });

    await test.step('suspend-process completes for a pid from that list', async () => {
      await startDisposableSleep(hostname);
      const pid = await waitForNewSleepPid(kbnClient, agentId, knownPids);
      await suspendProcess(kbnClient, agentId, pid);
    });
  });
});
