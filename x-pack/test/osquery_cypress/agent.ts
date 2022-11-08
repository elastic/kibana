/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/dev-utils';
import axios, { AxiosRequestConfig } from 'axios';
import { copyFile } from 'fs/promises';
import { ChildProcess, execFileSync, spawn } from 'child_process';
import { resolve } from 'path';
import { unlinkSync } from 'fs';
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

    this.log.info('Enrolling the agent');
    const args = [
      'enroll',
      '--insecure',
      '-f',
      // TODO: parse the host/port out of the logs for the fleet server
      '--url=http://localhost:8220',
      `--enrollment-token=${policy.api_key}`,
    ];
    const agentBinPath = this.getBinaryPath();
    execFileSync(agentBinPath, args, { stdio: 'inherit' });

    // Copy the config file
    const configPath = resolve(__dirname, this.directoryPath, 'elastic-agent.yml');
    this.log.info(`Copying agent config from ${configPath}`);
    await copyFile(configPath, resolve('.', 'elastic-agent.yml'));

    this.log.info('Running the agent');
    this.agentProcess = spawn(agentBinPath, ['run', '-v'], { stdio: 'inherit' });

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
    unlinkSync(resolve('.', 'elastic-agent.yml'));
  }
}
