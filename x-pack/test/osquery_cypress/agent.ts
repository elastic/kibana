/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import execa from 'execa';
import { ToolingLog } from '@kbn/tooling-log';
import { KbnClient } from '@kbn/test';
import {
  fetchFleetServerUrl,
  waitForHostToEnroll,
} from '@kbn/security-solution-plugin/scripts/endpoint/common/fleet_services';

import { getLatestVersion } from './artifact_manager';
import { Manager } from './resource_manager';
import { generateRandomString } from './utils';

export class AgentManager extends Manager {
  private log: ToolingLog;
  private policyEnrollmentKey: string;
  private fleetServerPort: string;
  private agentContainerId?: string;
  private kbnClient: KbnClient;

  constructor(
    policyEnrollmentKey: string,
    fleetServerPort: string,
    log: ToolingLog,
    kbnClient: KbnClient
  ) {
    super();
    this.log = log;
    this.fleetServerPort = fleetServerPort;
    this.policyEnrollmentKey = policyEnrollmentKey;
    this.kbnClient = kbnClient;
  }

  public async setup() {
    this.log.info('Running agent preconfig');

    const artifact = `docker.elastic.co/beats/elastic-agent:${await getLatestVersion()}`;
    this.log.info(artifact);
    const containerName = generateRandomString(12);
    const fleetServerUrl =
      (await fetchFleetServerUrl(this.kbnClient)) ??
      `https://host.docker.internal:${this.fleetServerPort}`;

    const dockerArgs = [
      'run',
      '--net',
      'elastic',
      '--detach',
      '--add-host',
      'host.docker.internal:host-gateway',
      '--name',
      containerName,
      '--hostname',
      containerName,
      '--env',
      'FLEET_ENROLL=1',
      '--env',
      `FLEET_URL=${fleetServerUrl}`,
      '--env',
      `FLEET_ENROLLMENT_TOKEN=${this.policyEnrollmentKey}`,
      '--env',
      'FLEET_INSECURE=true',
      '--rm',
      artifact,
    ];

    const startedContainer = await execa('docker', dockerArgs);

    this.log.info(`agent docker container started:\n${JSON.stringify(startedContainer, null, 2)}`);

    this.agentContainerId = startedContainer.stdout;
    await waitForHostToEnroll(this.kbnClient, this.log, containerName, 240000);
  }

  public cleanup() {
    super.cleanup();
    this.log.info('Cleaning up the agent process');
    if (this.agentContainerId) {
      this.log.info('Closing fleet process');

      try {
        execa.sync('docker', ['kill', this.agentContainerId]);
      } catch (err) {
        this.log.error('Error closing fleet agent process');
      }
      this.log.info('Fleet agent process closed');
    }
  }
}
