/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import execa from 'execa';

import { getLatestVersion } from './artifact_manager';
import { Manager } from './resource_manager';

export class AgentManager extends Manager {
  private log: ToolingLog;
  private policyEnrollmentKey: string;
  private fleetServerPort: string;
  private agentContainerId?: string;

  constructor(policyEnrollmentKey: string, fleetServerPort: string, log: ToolingLog) {
    super();
    this.log = log;
    this.fleetServerPort = fleetServerPort;
    this.policyEnrollmentKey = policyEnrollmentKey;
  }

  public async setup() {
    this.log.info('Running agent preconfig');

    const artifact = `docker.elastic.co/beats/elastic-agent:${await getLatestVersion()}`;
    this.log.info(artifact);

    const dockerArgs = [
      'run',
      '--detach',
      '--add-host',
      'host.docker.internal:host-gateway',
      '--env',
      'FLEET_ENROLL=1',
      '--env',
      `FLEET_URL=https://host.docker.internal:${this.fleetServerPort}`,
      '--env',
      `FLEET_ENROLLMENT_TOKEN=${this.policyEnrollmentKey}`,
      '--env',
      'FLEET_INSECURE=true',
      '--rm',
      artifact,
    ];

    this.agentContainerId = (await execa('docker', dockerArgs)).stdout;
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
