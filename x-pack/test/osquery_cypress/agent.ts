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

import chalk from 'chalk';
import { getLatestVersion } from './artifact_manager';
import { Manager } from './resource_manager';
import { generateRandomString } from './utils';

export class AgentManager extends Manager {
  private readonly log: ToolingLog;
  private readonly policyEnrollmentKey: string;
  private readonly fleetServerPort: string;
  private readonly kbnClient: KbnClient;
  private agentContainerId?: string;

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
    this.log.info(chalk.bold('Setting up Agent'));

    const artifact = `docker.elastic.co/elastic-agent/elastic-agent:${await getLatestVersion()}`;
    this.log.indent(4, () => this.log.info(`Image: ${artifact}`));
    const containerName = generateRandomString(12);
    const fleetServerUrl =
      (await fetchFleetServerUrl(this.kbnClient)) ??
      `https://host.docker.internal:${this.fleetServerPort}`;
    this.log.indent(4, () => this.log.info(`Fleet Server: ${fleetServerUrl}`));

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

    this.log.debug(`Agent docker container started:\n${JSON.stringify(startedContainer, null, 2)}`);

    this.agentContainerId = startedContainer.stdout;
    this.log.indent(4, () =>
      this.log.info(`Agent container started with id ${this.agentContainerId}`)
    );
    await waitForHostToEnroll(this.kbnClient, this.log, containerName, 240000);
  }

  public cleanup() {
    super.cleanup();
    this.log.info(chalk.bold('Cleaning up the agent process'));
    if (this.agentContainerId) {
      this.log.indent(4, () =>
        this.log.info(`Stopping and removing agent [${this.agentContainerId}] container`)
      );

      try {
        execa.sync('docker', ['kill', this.agentContainerId]);
      } catch (err) {
        this.log.error('Error closing fleet agent process');
      }
      this.log.indent(4, () =>
        this.log.info(`Stopped and removed agent [${this.agentContainerId}] container`)
      );
    }
  }
}
