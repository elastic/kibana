/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/ui';
import type { KbnClient } from '@kbn/scout-security';
import type { ProcessesEntry } from '../../../../common/endpoint/types';
import { captureHostVmAgentDiagnostics } from '../fixtures/agent_diagnostics';
import { startLongRunningSleep } from '../fixtures/host_sleep';
import { killProcess, listRunningProcesses, suspendProcess } from '../fixtures/process_actions';
import { test } from '../fixtures';

// Command the processes action reports for the installed Elastic Defend binary.
const ENDPOINT_COMMAND = '/opt/Elastic/Endpoint/elastic-endpoint';
const KILL_SLEEP_SECONDS = 617;
const SUSPEND_SLEEP_SECONDS = 619;
const SLEEP_LIST_ATTEMPTS = 3;
/**
 * One process list, then up to three lists plus kill, then the same for suspend.
 * Each action waits up to 120s, so the worst case is 18 minutes.
 */
const TEST_TIMEOUT_MS = 20 * 60 * 1000;

const parsePid = (pid: string): number => {
  const parsed = Number(pid);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`Process list returned a non-numeric pid: ${pid}`);
  }
  return parsed;
};

const findNewSleepPid = (
  knownPids: ReadonlySet<string>,
  entries: ProcessesEntry[],
  seconds: number
): number | undefined => {
  const command = `sleep ${seconds}`;
  const sleep = entries.find(
    (entry) => !knownPids.has(entry.pid) && entry.command.includes(command)
  );
  return sleep ? parsePid(sleep.pid) : undefined;
};

const waitForNewSleepPid = async (
  kbnClient: KbnClient,
  agentId: string,
  knownPids: ReadonlySet<string>,
  seconds: number
): Promise<number> => {
  let listedCommands: string[] = [];

  for (let attempt = 0; attempt < SLEEP_LIST_ATTEMPTS; attempt++) {
    const entries = await listRunningProcesses(kbnClient, agentId);
    listedCommands = entries.map((entry) => entry.command);
    const pid = findNewSleepPid(knownPids, entries, seconds);
    if (pid !== undefined) {
      return pid;
    }
  }

  throw new Error(
    `No new "sleep ${seconds}" process in the running process list. Commands: ${listedCommands
      .slice(0, 20)
      .join(' | ')}`
  );
};

test.describe('Response console process operations', { tag: ['@local-stateful-classic'] }, () => {
  test.setTimeout(TEST_TIMEOUT_MS);

  test.afterEach(async ({ enrolledEndpoint, log }, testInfo) => {
    if (testInfo.status === 'passed' || testInfo.status === 'skipped') {
      return;
    }

    await captureHostVmAgentDiagnostics(enrolledEndpoint.hostname, testInfo.title).catch(
      (error) => {
        log.warning(`[edr_real_fleet] agent diagnostics capture failed: ${error}`);
      }
    );
  });

  test('live agent lists Endpoint and completes kill and suspend', async ({
    kbnClient,
    enrolledEndpoint,
  }) => {
    const { agentId, hostname } = enrolledEndpoint;
    let knownPids = new Set<string>();

    await test.step('processes lists the Elastic Defend process', async () => {
      const entries = await listRunningProcesses(kbnClient, agentId);
      knownPids = new Set(entries.map((entry) => entry.pid));
      const commands = entries.map((entry) => entry.command);

      expect(commands).toStrictEqual(
        expect.arrayContaining([expect.stringContaining(ENDPOINT_COMMAND)])
      );
    });

    // This worker shares one enrolled host. Kill and suspend a disposable sleep
    // from that process list so stopping elastic-endpoint cannot take the agent down.
    await test.step('kill-process completes for a pid from that list', async () => {
      await startLongRunningSleep(hostname, KILL_SLEEP_SECONDS);
      const pid = await waitForNewSleepPid(kbnClient, agentId, knownPids, KILL_SLEEP_SECONDS);
      knownPids.add(String(pid));
      await killProcess(kbnClient, agentId, pid);
    });

    await test.step('suspend-process completes for a pid from that list', async () => {
      await startLongRunningSleep(hostname, SUSPEND_SLEEP_SECONDS);
      const pid = await waitForNewSleepPid(kbnClient, agentId, knownPids, SUSPEND_SLEEP_SECONDS);
      await suspendProcess(kbnClient, agentId, pid);
    });
  });
});
