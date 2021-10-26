/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/dev-utils';
import axios, { AxiosRequestConfig } from 'axios';
import { ChildProcess, exec, spawn } from 'child_process';
import { resolve } from 'path';
import { Manager } from './resource_manager';

interface AgentManagerParams {
  user: string;
  password: string;
  kibanaUrl: string;
  esHost: string;
}

export class AgentManager extends Manager {
  private directoryPath: string;
  private params: AgentManagerParams;
  private log: ToolingLog;
  private agentProcess?: ChildProcess;
  private requestOptions: AxiosRequestConfig;
  constructor(directoryPath: string, params: AgentManagerParams, log: ToolingLog) {
    super();
    // TODO: check if the file exists
    this.directoryPath = directoryPath;
    this.log = log;
    this.params = params;
    this.requestOptions = {
      headers: {
        'kbn-xsrf': 'kibana',
      },
      auth: {
        username: this.params.user,
        password: this.params.password,
      },
    };
  }

  public getBinaryPath() {
    return resolve(this.directoryPath, 'elastic-agent');
  }

  private execute(command: string, callback: Function) {
    exec(command, function (error, stdout, stderr) {
      callback(stdout);
    });
  }

  public async setup() {
    this.log.info('Running agent preconfig');
    await axios.post(`${this.params.kibanaUrl}/api/fleet/agents/setup`, {}, this.requestOptions);

    this.log.info('Updating the default agent output');
    const {
      data: {
        items: [defaultOutput],
      },
    } = await axios.get(this.params.kibanaUrl + '/api/fleet/outputs', this.requestOptions);

    await axios.put(
      `${this.params.kibanaUrl}/api/fleet/outputs/${defaultOutput.id}`,
      { hosts: [this.params.esHost] },
      this.requestOptions
    );

    this.log.info('Getting agent enrollment key');
    const { data: apiKeys } = await axios.get(
      this.params.kibanaUrl + '/api/fleet/enrollment-api-keys',
      this.requestOptions
    );
    const policy = apiKeys.list[1];

    this.log.info('Running the agent');
    await this.execute(
      `ifconfig | grep "inet " | grep -Fv 127.0.0.1 | awk '{print $2}'`,
      (ipAddress: string) => {
        ipAddress = ipAddress.trim();

        const args = [
          'run',
          '--env',
          'FLEET_ENROLL=1',
          '--env',
          `FLEET_URL=http://${ipAddress}:8220`,
          '--env',
          `FLEET_ENROLLMENT_TOKEN=${policy.api_key}`,
          '--env',
          'FLEET_INSECURE=true',
          'docker.elastic.co/beats/elastic-agent:8.0.0-SNAPSHOT',
        ];

        this.agentProcess = spawn('docker', args, { stdio: 'inherit' });
      }
    );

    // Wait til we see the agent is online
    let done = false;
    let retries = 0;
    while (!done) {
      await new Promise((r) => setTimeout(r, 5000));
      const { data: agents } = await axios.get(
        `${this.params.kibanaUrl}/api/fleet/agents`,
        this.requestOptions
      );
      done = agents.list[0]?.status === 'online';
      if (++retries > 12) {
        this.log.error('Giving up on enrolling the agent after a minute');
        throw new Error('Agent timed out while coming online');
      }
    }
    return { policyId: policy.policy_id as string };
  }

  protected _cleanup() {
    this.log.info('Cleaning up the agent process');
    if (this.agentProcess) {
      if (!this.agentProcess.kill(9)) {
        this.log.warning('Unable to kill agent process');
      }

      this.agentProcess.on('close', () => {
        this.log.info('Agent process closed');
      });
      delete this.agentProcess;
    }
    return;
  }
}
