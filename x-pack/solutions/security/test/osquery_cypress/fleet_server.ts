/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import { KbnClient } from '@kbn/test';
import {
  StartedFleetServer,
  startFleetServer,
} from '@kbn/security-solution-plugin/scripts/endpoint/common/fleet_server/fleet_server_services';
import { Manager } from './resource_manager';
import { getLatestAvailableAgentVersion } from './utils';

export class FleetManager extends Manager {
  private fleetServer: StartedFleetServer | undefined = undefined;

  constructor(
    private readonly kbnClient: KbnClient,
    private readonly log: ToolingLog,
    private readonly port: number
  ) {
    super();
  }

  public async setup(): Promise<void> {
    const version = await getLatestAvailableAgentVersion(this.kbnClient);
    this.fleetServer = await startFleetServer({
      kbnClient: this.kbnClient,
      logger: this.log,
      port: this.port,
      force: true,
      version,
    });

    if (!this.fleetServer) {
      throw new Error('Fleet server was not started');
    }
  }

  public cleanup() {
    super.cleanup();

    this.log.info('Removing old fleet config');
    if (this.fleetServer) {
      this.log.info('Closing fleet process');

      try {
        this.fleetServer.stopNow();
      } catch (err) {
        this.log.error('Error closing fleet server process');
        this.log.verbose(err);
      }
      this.log.info('Fleet server process closed');
    }
  }
}
