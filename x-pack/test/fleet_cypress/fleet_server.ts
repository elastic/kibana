/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChildProcess, spawn } from 'child_process';
import { ToolingLog } from '@kbn/dev-utils';
import axios from 'axios';
import { Manager } from './resource_manager';
import { getLatestVersion } from './artifact_manager';

export interface ElasticsearchConfig {
  esHost: string;
  user: string;
  password: string;
  port: string;
}

export class FleetManager extends Manager {
  private fleetProcess?: ChildProcess;
  private esConfig: ElasticsearchConfig;
  private log: ToolingLog;
  constructor(esConfig: ElasticsearchConfig, log: ToolingLog) {
    super();
    this.esConfig = esConfig;
    this.log = log;
  }
  public async setup(): Promise<void> {
    this.log.info('Setting fleet up');
    return new Promise(async (res, rej) => {
      try {
        const response = await axios.post(
          `${this.esConfig.esHost}/_security/service/elastic/fleet-server/credential/token`
        );
        const serviceToken = response.data.token.value;
        const artifact = `docker.elastic.co/beats/elastic-agent:${await getLatestVersion()}`;
        this.log.info(artifact);

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
          `FLEET_SERVER_ELASTICSEARCH_HOST=http://${host}:${this.esConfig.port}`,
          '--env',
          `FLEET_SERVER_SERVICE_TOKEN=${serviceToken}`,
          '--rm',
          artifact,
        ];
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
