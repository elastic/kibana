/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import execa from 'execa';
import { ToolingLog } from '@kbn/tooling-log';
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
    this.fleetContainerId = await runFleetServerIfNeeded();
  }

  public cleanup() {
    super.cleanup();

    this.log.info('Removing old fleet config');
    if (this.fleetContainerId) {
      this.log.info('Closing fleet process');

      execa.sync('docker', ['kill', this.fleetContainerId]);
      this.log.info('Fleet server process closed');
    }
  }
}
