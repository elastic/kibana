/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChildProcess, spawn } from 'child_process';
import { copyFile } from 'fs/promises';
import { unlinkSync } from 'fs';
import { resolve } from 'path';
import { ToolingLog } from '@kbn/dev-utils';
interface ElasticsearchConfig {
  host: string;
  user: string;
  password: string;
}

export class FleetManager {
  private directoryPath: string;
  private fleetProcess: ChildProcess;
  private esConfig: ElasticsearchConfig;
  private log: ToolingLog;
  constructor(directoryPath: string, esConfig: ElasticsearchConfig, log: ToolingLog) {
    // TODO: check if the file exists
    this.esConfig = esConfig;
    this.directoryPath = directoryPath;
    this.log = log;
    this.fleetProcess = null;
  }
  public async setup(): Promise<void> {
    this.log.info('Setting fleet up');
    await copyFile(resolve(__dirname, 'fleet_server.yml'), resolve('.', 'fleet-server.yml'));
    return new Promise((res, rej) => {
      const env = {
        ELASTICSEARCH_HOSTS: this.esConfig.host,
        ELASTICSEARCH_USERNAME: this.esConfig.user,
        ELASTICSEARCH_PASSWORD: this.esConfig.password,
      };
      const file = resolve(this.directoryPath, 'fleet-server');
      // TODO: handle logging properly
      this.fleetProcess = spawn(file, [], { stdio: 'inherit', env });
      this.fleetProcess.on('error', rej);
      // TODO: actually wait for the fleet server to start listening
      setTimeout(res, 15000);
    });
  }

  public cleanup() {
    this.log.info('Removing old fleet config');
    if (this.fleetProcess) {
      this.fleetProcess.kill(9);
    }
    unlinkSync(resolve('.', 'fleet-server.yml'));
  }
}
