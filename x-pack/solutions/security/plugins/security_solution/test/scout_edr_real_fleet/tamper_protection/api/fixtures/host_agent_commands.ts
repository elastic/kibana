/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type execa from 'execa';
import type { ScoutLogger } from '@kbn/scout-security';
import type { HostVmExecResponse } from '../../../../../scripts/endpoint/common/types';
import { getHostVmClient } from '../../../../../scripts/endpoint/common/vm_services';

const UNINSTALL_TIMEOUT_MS = 180_000;
const LIST_TIMEOUT_MS = 60_000;
const ELASTIC_INSTALL_DIR = '/opt/Elastic';
/** OpenSSH exits with 255 on its own connection errors and `vagrant ssh` passes it through. */
const SSH_ERROR_EXIT_CODE = 255;

export interface HostCommandResult {
  exitCode: number;
  /** stdout and stderr together: the agent prints its result on either stream. */
  output: string;
}

export type ElasticInstallState = 'present' | 'absent';

const isExecaError = (error: unknown): error is execa.ExecaError =>
  error instanceof Error && 'isCanceled' in error && 'command' in error;

/**
 * Both VM clients reject on any non-zero exit. A non-zero exit of the command itself
 * is a result; a timeout, a signal or an SSH failure is rethrown.
 */
const toCommandExitResult = (error: unknown): HostVmExecResponse => {
  if (!isExecaError(error)) {
    throw error;
  }

  const { exitCode, timedOut, isCanceled, killed, signal, stdout, stderr } = error;
  if (
    timedOut ||
    isCanceled ||
    killed ||
    signal !== undefined ||
    typeof exitCode !== 'number' ||
    exitCode === SSH_ERROR_EXIT_CODE
  ) {
    throw error;
  }

  return { exitCode, stdout: stdout ?? '', stderr: stderr ?? '' };
};

const runOnHost = async (
  log: ScoutLogger,
  hostname: string,
  { command, label, timeoutMs }: { command: string; label: string; timeoutMs: number }
): Promise<HostVmExecResponse> => {
  const result = await getHostVmClient(hostname)
    .exec(command, { silent: true, timeoutMs })
    .catch(toCommandExitResult);

  log.info(
    `[edr_real_fleet] ${label} on ${hostname} exited with ${result.exitCode}\nstdout: ${result.stdout}\nstderr: ${result.stderr}`
  );

  return result;
};

const REDACTED = '[REDACTED]';

/**
 * The rethrown execa error carries the full command line, which includes the uninstall
 * token, and it would end up in the CI logs. `stack` embeds the message, so it is redacted too.
 */
const redactToken = (error: unknown, token: string): unknown => {
  if (!(error instanceof Error) || !token) {
    return error;
  }

  const redactable = error as Error & {
    shortMessage?: string;
    command?: string;
    escapedCommand?: string;
  };
  for (const field of ['message', 'shortMessage', 'command', 'escapedCommand', 'stack'] as const) {
    const value = redactable[field];
    if (typeof value === 'string') {
      redactable[field] = value.replaceAll(token, REDACTED);
    }
  }

  return redactable;
};

export const uninstallAgent = async (
  log: ScoutLogger,
  hostname: string,
  uninstallToken: string
): Promise<HostCommandResult> => {
  try {
    const { exitCode, stdout, stderr } = await runOnHost(log, hostname, {
      command: `sudo elastic-agent uninstall -f --uninstall-token ${uninstallToken}`,
      label: 'elastic-agent uninstall',
      timeoutMs: UNINSTALL_TIMEOUT_MS,
    });

    return { exitCode, output: `${stdout}\n${stderr}` };
  } catch (error) {
    throw redactToken(error, uninstallToken);
  }
};

/** `absent` when the install directory is missing or empty. */
export const getElasticInstallState = async (
  log: ScoutLogger,
  hostname: string
): Promise<ElasticInstallState> => {
  const { exitCode, stdout, stderr } = await runOnHost(log, hostname, {
    command: `ls -A ${ELASTIC_INSTALL_DIR}`,
    label: `ls -A ${ELASTIC_INSTALL_DIR}`,
    timeoutMs: LIST_TIMEOUT_MS,
  });

  if (exitCode === 0) {
    return stdout.trim() ? 'present' : 'absent';
  }

  // `vagrant ssh` can merge stderr into stdout, so look at both.
  if (`${stdout}\n${stderr}`.includes('No such file or directory')) {
    return 'absent';
  }

  throw new Error(
    `ls -A ${ELASTIC_INSTALL_DIR} on ${hostname} failed with exit code ${exitCode}: ${stdout} ${stderr}`
  );
};
