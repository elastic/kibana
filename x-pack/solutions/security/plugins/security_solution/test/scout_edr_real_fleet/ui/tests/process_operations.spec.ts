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

/** The processes action reports the executable path, such as `/usr/bin/sleep`, with no arguments. */
const isSleepProcess = (command: string): boolean => command.split('/').pop() === 'sleep';
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

const findNewSleepProcesses = (
  knownPids: ReadonlySet<string>,
  entries: ProcessesEntry[]
): ProcessesEntry[] =>
  entries.filter((entry) => !knownPids.has(entry.pid) && isSleepProcess(entry.command));

const waitForNewSleepPid = async (
  kbnClient: KbnClient,
  agentId: string,
  knownPids: ReadonlySet<string>,
  seconds: number
): Promise<number> => {
  let lastEntries: ProcessesEntry[] = [];

  for (let attempt = 0; attempt < SLEEP_LIST_ATTEMPTS; attempt++) {
    const entries = await listRunningProcesses(kbnClient, agentId);
    lastEntries = entries;
    const matches = findNewSleepProcesses(knownPids, entries);
    const [match] = matches;
    if (matches.length === 1 && match) {
      return parsePid(match.pid);
    }
    if (matches.length > 1) {
      throw new Error(
        `Expected one new sleep process after starting "sleep ${seconds}", found ${matches
          .map((entry) => `${entry.pid} ${entry.command}`)
          .join(', ')}`
      );
    }
  }

  const sleepEntries = lastEntries.filter((entry) => isSleepProcess(entry.command));
  const listed = sleepEntries.length
    ? sleepEntries
        .map(
          (entry) =>
            `${entry.pid} ${entry.command}${knownPids.has(entry.pid) ? ' (already known)' : ''}`
        )
        .join(' | ')
    : 'none';

  throw new Error(
    `No new sleep process after starting "sleep ${seconds}". Sleep entries: ${listed}`
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
