/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import execa from 'execa';
import { ToolingLog } from '@kbn/tooling-log';
import { KbnClient } from '@kbn/test';
import { agentPolicyRouteService, appRoutesService } from '@kbn/fleet-plugin/common';
import {
  CreateAgentPolicyResponse,
  GenerateServiceTokenResponse,
} from '@kbn/fleet-plugin/common/types';
import { Manager } from './resource_manager';
import { getLatestVersion } from './artifact_manager';

export interface AgentManagerParams {
  user: string;
  password: string;
  kibanaUrl: string;
  esHost: string;
  esPort: string;
}

export class FleetManager extends Manager {
  private fleetContainerId?: string;
  private config: AgentManagerParams;
  private log: ToolingLog;
  private kbnClient: KbnClient;
  constructor(config: AgentManagerParams, log: ToolingLog, kbnClient: KbnClient) {
    super();
    this.config = config;
    this.log = log;
    this.kbnClient = kbnClient;
  }
  public async setup(): Promise<void> {
    this.log.info('Setting fleet up');
    return new Promise(async (res, rej) => {
      try {
        // default fleet server policy no longer created by default
        const {
          data: {
            item: { id: policyId },
          },
        } = await this.kbnClient.request<CreateAgentPolicyResponse>({
          method: 'POST',
          path: agentPolicyRouteService.getCreatePath(),
          body: {
            name: 'Default Fleet Server policy',
            description: '',
            namespace: 'default',
            monitoring_enabled: ['logs', 'metrics'],
            has_fleet_server: true,
          },
        });

        const {
          data: { value: serviceToken },
        } = await this.kbnClient.request<GenerateServiceTokenResponse>({
          method: 'POST',
          path: appRoutesService.getRegenerateServiceTokenPath(),
          body: {},
        });
        const artifact = `docker.elastic.co/beats/elastic-agent:${await getLatestVersion()}`;
        this.log.info(artifact);

        const host = 'host.docker.internal';

        const args = [
          'run',
          '--detach',
          '-p',
          '8220:8220',
          '--add-host',
          'host.docker.internal:host-gateway',
          '--env',
          'FLEET_SERVER_ENABLE=true',
          '--env',
          `FLEET_SERVER_ELASTICSEARCH_HOST=http://${host}:${this.config.esPort}`,
          '--env',
          `FLEET_SERVER_SERVICE_TOKEN=${serviceToken}`,
          '--env',
          `FLEET_SERVER_POLICY=${policyId}`,
          '--rm',
          artifact,
        ];
        this.log.info('docker ' + args.join(' '));
        const { stdout } = await execa('docker', args);
        this.fleetContainerId = stdout;
        setTimeout(res, 15000);
      } catch (error) {
        rej(error);
      }
    });
  }

  protected _cleanup() {
    this.log.info('Removing old fleet config');
    if (this.fleetContainerId) {
      this.log.info('Closing fleet process');

      execa.sync('docker', ['kill', this.fleetContainerId]);
      this.log.info('Fleet server process closed');

      delete this.fleetContainerId;
    }
  }
}
