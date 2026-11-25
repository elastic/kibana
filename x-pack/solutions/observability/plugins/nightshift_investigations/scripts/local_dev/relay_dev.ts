/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setTimeout as sleep } from 'timers/promises';
import execa from 'execa';
import { CA_CERT_PATH, RELAY_CERT_PATH, RELAY_KEY_PATH } from '@kbn/dev-utils';
import { timeoutSignal } from '@kbn/std';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  LOCAL_SERVERLESS_UIAM_ORGANIZATION_ID,
  RELAY_DEV_CONTAINER_NAME,
  RELAY_DEV_HOST_NAME,
  RELAY_DEV_IMAGE,
  RELAY_DEV_SLACK_STUB_URL,
  RELAY_DEV_UIAM_PROJECT_ID,
  RELAY_DEV_UIAM_URL,
  RELAY_DEV_URL,
  RELAY_UIAM_PROJECT_TYPE,
} from './constants';

const UIAM_LABEL = 'nightshift.relay.uiam';
const CONTAINER_CERTS_DIR = '/certs';
const READY_TIMEOUT_MS = 60_000;
const READY_POLL_INTERVAL_MS = 1_000;

export const getRelayDevRunArgs = ({ uiam }: { uiam: boolean }): string[] => [
  'run',
  // '--pull',
  // 'always',
  '-d',
  '--rm',
  '--name',
  RELAY_DEV_CONTAINER_NAME,
  '-p',
  '3000:3000',
  '-p',
  '3100:3100',
  '--label',
  `${UIAM_LABEL}=${uiam}`,
  '-e',
  'RELAY_DEV_SLACK_STUB=true',
  '-e',
  `RELAY_PUBLIC_URL=${RELAY_DEV_URL}`,
  '-v',
  `${RELAY_CERT_PATH}:${CONTAINER_CERTS_DIR}/relay.crt:ro`,
  '-v',
  `${RELAY_KEY_PATH}:${CONTAINER_CERTS_DIR}/relay.key:ro`,
  '-v',
  `${CA_CERT_PATH}:${CONTAINER_CERTS_DIR}/ca.crt:ro`,
  '-e',
  `RELAY_TLS_CERT_FILE=${CONTAINER_CERTS_DIR}/relay.crt`,
  '-e',
  `RELAY_TLS_KEY_FILE=${CONTAINER_CERTS_DIR}/relay.key`,
  '-e',
  `RELAY_TLS_CA_FILE=${CONTAINER_CERTS_DIR}/ca.crt`,
  '--add-host',
  `${RELAY_DEV_HOST_NAME}:host-gateway`,
  ...(uiam
    ? [
        '-e',
        `RELAY_UIAM_URL=${RELAY_DEV_UIAM_URL}`,
        '-e',
        `DEV_TARGET_REF=project:${RELAY_UIAM_PROJECT_TYPE}:${RELAY_DEV_UIAM_PROJECT_ID}`,
        '-e',
        `DEV_ORG_REF=${LOCAL_SERVERLESS_UIAM_ORGANIZATION_ID}`,
      ]
    : []),
  RELAY_DEV_IMAGE,
];

const isRunning = async (): Promise<boolean> => {
  const { stdout } = await execa('docker', [
    'ps',
    '-q',
    '--filter',
    `name=^${RELAY_DEV_CONTAINER_NAME}$`,
  ]);
  return stdout.trim().length > 0;
};

const runsWithUiam = async (): Promise<boolean> => {
  const { stdout } = await execa('docker', [
    'inspect',
    '--format',
    `{{ index .Config.Labels "${UIAM_LABEL}" }}`,
    RELAY_DEV_CONTAINER_NAME,
  ]);
  return stdout.trim() === 'true';
};

const isAnswering = async (): Promise<boolean> => {
  const signal = timeoutSignal(2_000);
  try {
    await fetch(RELAY_DEV_URL, { signal });
    return true;
  } catch {
    return false;
  } finally {
    signal.dispose();
  }
};

const waitUntilAnswering = async (): Promise<void> => {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (await isAnswering()) return;
    await sleep(READY_POLL_INTERVAL_MS);
  }
  throw new Error(
    `The Relay did not answer on ${RELAY_DEV_URL} within ${
      READY_TIMEOUT_MS / 1000
    }s; see: docker logs ${RELAY_DEV_CONTAINER_NAME}`
  );
};

/** Starts the Relay dev container, or reuses the running one. */
export const startRelayDev = async (
  log: ToolingLog,
  { uiam }: { uiam: boolean }
): Promise<void> => {
  try {
    if (await isRunning()) {
      if ((await runsWithUiam()) === uiam) {
        log.success(
          `The Relay (${RELAY_DEV_CONTAINER_NAME}) is already running on ${RELAY_DEV_URL}`
        );
        return;
      }
      log.info('Restarting the Relay: it runs with another UIAM setting');
      await execa('docker', ['stop', RELAY_DEV_CONTAINER_NAME]);
    }
    log.info(`Starting the Relay dev container (${RELAY_DEV_IMAGE})...`);
    await execa('docker', getRelayDevRunArgs({ uiam }));
  } catch (error) {
    const { shortMessage, stderr } = error as { shortMessage?: string; stderr?: string };
    throw new Error(
      [
        `Could not start the Relay dev container: ${stderr || shortMessage || String(error)}`,
        'It needs Docker, and `docker login docker.elastic.co` for the image. Pass --skip-relay to set up without it.',
      ].join('\n')
    );
  }
  await waitUntilAnswering();
  log.success(
    `The Relay is running on ${RELAY_DEV_URL}, with its Slack stub on ${RELAY_DEV_SLACK_STUB_URL}`
  );
};

/** Stops the Relay dev container, which `--rm` also deletes. */
export const stopRelayDev = async (log: ToolingLog): Promise<void> => {
  try {
    if (!(await isRunning())) {
      log.info(`No Relay container (${RELAY_DEV_CONTAINER_NAME}) to stop`);
      return;
    }
    await execa('docker', ['stop', RELAY_DEV_CONTAINER_NAME]);
    log.info(`Stopped the Relay container (${RELAY_DEV_CONTAINER_NAME})`);
  } catch (error) {
    log.warning(
      `Could not stop ${RELAY_DEV_CONTAINER_NAME}; run: docker stop ${RELAY_DEV_CONTAINER_NAME} (${
        (error as Error).message
      })`
    );
  }
};
