/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import execa from 'execa';
import { runFleetServerIfNeeded } from '@kbn/security-solution-plugin/scripts/endpoint/endpoint_agent_runner/fleet_server';
import { KbnClient } from '@kbn/test';
import { Manager } from './resource_manager';
import { addIntegrationToAgentPolicy } from './utils';

export class FleetManager extends Manager {
  private fleetContainerId?: string;
  private log: ToolingLog;
  private kbnClient: KbnClient;

  constructor(kbnClient: KbnClient, log: ToolingLog) {
    super();
    this.log = log;
    this.kbnClient = kbnClient;
  }

  public async setup(): Promise<void> {
    const fleetServerConfig = await runFleetServerIfNeeded();

    if (!fleetServerConfig) {
      throw new Error('Fleet server config not found');
    }

    await addIntegrationToAgentPolicy(
      this.kbnClient,
      'fleet-server-policy',
      'Default Fleet Server Policy',
      'osquery_manager'
    );

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
