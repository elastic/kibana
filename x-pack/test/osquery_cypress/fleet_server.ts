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
import { Manager } from './resource_manager';
export interface ElasticsearchConfig {
  esHost: string;
  user: string;
  password: string;
}

export class FleetManager extends Manager {
  private directoryPath: string;
  private fleetProcess?: ChildProcess;
  private esConfig: ElasticsearchConfig;
  private log: ToolingLog;
  constructor(directoryPath: string, esConfig: ElasticsearchConfig, log: ToolingLog) {
    super();
    // TODO: check if the file exists
    this.esConfig = esConfig;
    this.directoryPath = directoryPath;
    this.log = log;
  }
  public async setup(): Promise<void> {
    this.log.info('Setting fleet up');
    await copyFile(resolve(__dirname, 'fleet_server.yml'), resolve('.', 'fleet-server.yml'));
    return new Promise((res, rej) => {
      const env = {
        ELASTICSEARCH_HOSTS: this.esConfig.esHost,
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
    unlinkSync(resolve('.', 'fleet-server.yml'));
  }
}
