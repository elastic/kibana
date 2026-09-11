/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spawnSync, type SpawnSyncReturns } from 'child_process';

export const dockerContainerName = (kind: 'fleet-server' | 'agent', runId: string): string =>
  `scout-synthetics-agent-e2e-${kind}-${runId}`;

const DOCKER_TIMEOUT_MS = 15 * 60 * 1000;
const ERROR_TAIL_CHARS = 4000;
const SECRET_ENV_RE = /(FLEET_SERVER_SERVICE_TOKEN|FLEET_ENROLLMENT_TOKEN)=[^\s]+/g;

const redactSecrets = (text: string): string => text.replace(SECRET_ENV_RE, '$1=[redacted]');

const formatDockerFailure = (args: string[], result: SpawnSyncReturns<string>): string => {
  const output = `${result.stderr || ''}\n${result.stdout || ''}`.trim();
  const tailed = output.length > ERROR_TAIL_CHARS ? output.slice(-ERROR_TAIL_CHARS) : output;
  const reason =
    result.error?.message ?? (result.signal ? `signal ${result.signal}` : `exit ${result.status}`);
  return redactSecrets(`docker ${args.join(' ')} failed (${reason}): ${tailed}`);
};

const runDocker = (args: string[]): string => {
  const result = spawnSync('docker', args, { encoding: 'utf8', timeout: DOCKER_TIMEOUT_MS });
  if (result.status !== 0) {
    throw new Error(formatDockerFailure(args, result));
  }
  return (result.stdout || '').trim();
};

export const pullImage = (image: string): void => {
  runDocker(['pull', image]);
};

export const removeContainer = (name: string): void => {
  spawnSync('docker', ['rm', '-f', name], { encoding: 'utf8' });
};

export const publishedHostPort = (name: string, containerPort: number): number => {
  const mapping = runDocker(['port', name, String(containerPort)]);
  const match = mapping.match(/:(\d+)\s*$/m);
  if (!match) {
    throw new Error(`No published host port for ${name}:${containerPort} (${mapping})`);
  }
  return Number(match[1]);
};

export const containerLogs = (name: string, tail = 80): string => {
  const result = spawnSync('docker', ['logs', '--tail', String(tail), name], { encoding: 'utf8' });
  return redactSecrets(`${result.stdout || ''}${result.stderr || ''}`.trim());
};

export const startDetachedContainer = (name: string, args: string[]): void => {
  removeContainer(name);
  runDocker(['run', '-d', '--name', name, ...args]);
};

export const isDockerAvailable = (): boolean => {
  const result = spawnSync('docker', ['info'], { encoding: 'utf8' });
  return result.status === 0;
};
