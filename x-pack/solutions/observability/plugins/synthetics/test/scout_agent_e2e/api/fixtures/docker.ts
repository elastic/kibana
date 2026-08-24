/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spawnSync } from 'child_process';

export const FLEET_SERVER_CONTAINER = 'scout-agent-e2e-fleet-server';
export const SYNTHETICS_AGENT_CONTAINER = 'scout-agent-e2e-agent';

const runDocker = (args: string[]): string => {
  const result = spawnSync('docker', args, { encoding: 'utf8', timeout: 8 * 60 * 1000 });
  if (result.status !== 0) {
    throw new Error(
      `docker ${args.join(' ')} failed (exit ${result.status}): ${result.stderr || result.stdout}`
    );
  }
  return (result.stdout || '').trim();
};

export const removeContainer = (name: string): void => {
  spawnSync('docker', ['rm', '-f', name], { encoding: 'utf8' });
};

export const containerLogs = (name: string, tail = 80): string => {
  const result = spawnSync('docker', ['logs', '--tail', String(tail), name], { encoding: 'utf8' });
  return `${result.stdout || ''}${result.stderr || ''}`.trim();
};

export const startDetachedContainer = (name: string, args: string[]): void => {
  removeContainer(name);
  runDocker(['run', '-d', '--name', name, ...args]);
};

export const isDockerAvailable = (): boolean => {
  const result = spawnSync('docker', ['info'], { encoding: 'utf8' });
  return result.status === 0;
};
