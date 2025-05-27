/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChildProcess, spawn } from 'child_process';
import { ToolingLog } from '@kbn/tooling-log';
import axios, { AxiosRequestConfig } from 'axios';
import { Manager } from './resource_manager';
import { getLatestVersion } from './artifact_manager';
import { AgentManagerParams } from './agent';

export class FleetManager extends Manager {
  private fleetProcess?: ChildProcess;
  private config: AgentManagerParams;
  private log: ToolingLog;
  private requestOptions: AxiosRequestConfig;
  constructor(config: AgentManagerParams, log: ToolingLog, requestOptions: AxiosRequestConfig) {
    super();
    this.config = config;
    this.log = log;
    this.requestOptions = requestOptions;
  }
  public async setup(): Promise<void> {
    this.log.info('Setting fleet up');
    return new Promise(async (res, rej) => {
      try {
        const response = await axios.post(
          `${this.config.kibanaUrl}/api/fleet/service_tokens`,
          {},
          this.requestOptions
        );
        const serviceToken = response.data.value;
        const artifact = `docker.elastic.co/elastic-agent/elastic-agent:${await getLatestVersion()}`;
        this.log.info(artifact);

        // default fleet server policy no longer created by default
        const {
          data: {
            item: { id: policyId },
          },
        } = await axios.post(
          `${this.config.kibanaUrl}/api/fleet/agent_policies`,
          {
            name: 'Fleet Server policy',
            description: '',
            namespace: 'default',
            monitoring_enabled: [],
            has_fleet_server: true,
          },
          this.requestOptions
        );

        const host = 'host.docker.internal';

        const args = [
          'run',
          '-p',
          `8220:8220`,
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
        this.fleetProcess = spawn('docker', args, {
          stdio: 'inherit',
        });
        this.fleetProcess.on('error', rej);
        setTimeout(res, 15000);
      } catch (error) {
        rej(error);
      }
    });
  }

  protected _cleanup() {
    this.log.info('Removing old fleet config');
    if (this.fleetProcess) {
      this.log.info('Closing fleet process');
      if (!this.fleetProcess.kill(9)) {
        this.log.warning('Unable to kill fleet server process');
      }

      this.fleetProcess.on('close', () => {
        this.log.info('Fleet server process closed');
      });
      delete this.fleetProcess;
    }
  }
}
