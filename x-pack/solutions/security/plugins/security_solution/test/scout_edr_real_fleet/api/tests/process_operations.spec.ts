/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture, KibanaRole } from '@kbn/scout-security';
import { PUBLIC_API_HEADERS } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import type { ProcessesEntry } from '../../../../common/endpoint/types';
import { getEndpointOperationsAnalyst } from '../../../../scripts/endpoint/common/roles_users/endpoint_operations_analyst';
import { startLongRunningSleep } from '../../ui/fixtures/host_sleep';
import { captureHostVmAgentDiagnostics } from '../fixtures/agent_diagnostics';
import { killProcess, listRunningProcesses, suspendProcess } from '../fixtures/process_actions';
import { apiTest } from '../fixtures';

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

const endpointOperationsAnalystRole = (): KibanaRole => {
  const role = getEndpointOperationsAnalyst();

  return {
    elasticsearch: {
      cluster: [...(role.elasticsearch.cluster ?? [])],
      indices: role.elasticsearch.indices?.map((index) => ({
        names: [...index.names],
        privileges: [...index.privileges],
      })),
    },
    kibana: role.kibana.map((kibana) => ({
      base: [...(kibana.base ?? [])],
      feature: kibana.feature,
      spaces: [...kibana.spaces],
    })),
  };
};

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
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  agentId: string,
  knownPids: ReadonlySet<string>,
  seconds: number
): Promise<number> => {
  let lastEntries: ProcessesEntry[] = [];

  for (let attempt = 0; attempt < SLEEP_LIST_ATTEMPTS; attempt++) {
    const entries = await listRunningProcesses(apiClient, headers, agentId);
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

apiTest.describe(
  'Real agent process response actions',
  { tag: ['@local-stateful-classic', '@local-serverless-security_complete'] },
  () => {
    apiTest.setTimeout(TEST_TIMEOUT_MS);

    let requestHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(
        endpointOperationsAnalystRole()
      );
      requestHeaders = {
        ...apiKeyHeader,
        ...PUBLIC_API_HEADERS,
        'kbn-xsrf': 'scout-edr-real-fleet',
        'Content-Type': 'application/json',
      };
    });

    apiTest.afterEach(async ({ enrolledEndpoint, log }, testInfo) => {
      if (testInfo.status === 'passed' || testInfo.status === 'skipped') {
        return;
      }

      await captureHostVmAgentDiagnostics(enrolledEndpoint.hostname, testInfo.title).catch(
        (error) => {
          log.warning(`[edr_real_fleet] agent diagnostics capture failed: ${error}`);
        }
      );
    });

    apiTest(
      'live agent lists Endpoint and completes kill and suspend',
      async ({ apiClient, enrolledEndpoint }) => {
        const { agentId, hostname } = enrolledEndpoint;
        let knownPids = new Set<string>();

        await apiTest.step('processes lists the Elastic Defend process', async () => {
          const entries = await listRunningProcesses(apiClient, requestHeaders, agentId);
          knownPids = new Set(entries.map((entry) => entry.pid));
          const commands = entries.map((entry) => entry.command);

          expect(commands).toStrictEqual(
            expect.arrayContaining([expect.stringContaining(ENDPOINT_COMMAND)])
          );
        });

        // Kill and suspend a disposable sleep so stopping elastic-endpoint cannot take the agent down.
        await apiTest.step('kill-process completes for a pid from that list', async () => {
          await startLongRunningSleep(hostname, KILL_SLEEP_SECONDS);
          const pid = await waitForNewSleepPid(
            apiClient,
            requestHeaders,
            agentId,
            knownPids,
            KILL_SLEEP_SECONDS
          );
          knownPids.add(String(pid));
          await killProcess(apiClient, requestHeaders, agentId, pid);
        });

        await apiTest.step('suspend-process completes for a pid from that list', async () => {
          await startLongRunningSleep(hostname, SUSPEND_SLEEP_SECONDS);
          const pid = await waitForNewSleepPid(
            apiClient,
            requestHeaders,
            agentId,
            knownPids,
            SUSPEND_SLEEP_SECONDS
          );
          await suspendProcess(apiClient, requestHeaders, agentId, pid);
        });
      }
    );
  }
);
