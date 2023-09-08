/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import execa from 'execa';
import { runFleetServerIfNeeded } from '@kbn/security-solution-plugin/scripts/endpoint/endpoint_agent_runner/fleet_server';
import { Manager } from './resource_manager';

export class FleetManager extends Manager {
  private fleetContainerId?: string;
  private log: ToolingLog;

  constructor(log: ToolingLog) {
    super();
    this.log = log;
  }

  public async setup(): Promise<void> {
    const fleetServerConfig = await runFleetServerIfNeeded();

    if (!fleetServerConfig) {
      throw new Error('Fleet server config not found');
    }

    this.fleetContainerId = fleetServerConfig.fleetServerContainerId;
  }

  public cleanup() {
    super.cleanup();

    this.log.info('Removing old fleet config');
    if (this.fleetContainerId) {
      this.log.info('Closing fleet process');

      try {
        execa.sync('docker', ['kill', this.fleetContainerId]);
      } catch (err) {
        this.log.error('Error closing fleet server process');
      }
      this.log.info('Fleet server process closed');
    }
  }
}
