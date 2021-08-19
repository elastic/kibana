/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/dev-utils';
import axios from 'axios';
import { copyFile, readdir } from 'fs/promises';
import { ChildProcess, execFileSync, spawn } from 'child_process';
import { resolve } from 'path';
import { unlinkSync } from 'fs';

interface AgentManagerParams {
  user: string;
  password: string;
  kibanaUrl: string;
}

export class AgentManager {
  private directoryPath: string;
  private params: AgentManagerParams;
  private log: ToolingLog;
  private agentProcess: ChildProcess;
  public policyId: string;
  constructor(directoryPath: string, params: AgentManagerParams, log: ToolingLog) {
    // TODO: check if the file exists
    this.directoryPath = directoryPath;
    this.log = log;
    this.params = params;
  }

  public getBinaryPath() {
    return resolve(
      this.directoryPath,
      'elastic-agent'
    );
  }

  public async setup() {
    this.log.info('Setting the agent up');
    const agentBinPath = this.getBinaryPath();
    this.agentProcess = spawn(agentBinPath, ['run', '-v'], {stdio: 'inherit'})
    await axios.post(
      `${this.params.kibanaUrl}/api/fleet/agents/setup`,
      {},
      {
        headers: {
          'kbn-xsrf': 'kibana',
        },
        auth: {
          username: this.params.user,
          password: this.params.password,
        },
      }
    );
    const { data: apiKeys } = await axios.get(
      this.params.kibanaUrl + '/api/fleet/enrollment-api-keys',
      {
        auth: {
          username: this.params.user,
          password: this.params.password,
        },
      }
    );
    // TODO: push this policy id through to the test so it can assign the integration to the proper policy
    const policy = apiKeys.list[1]
    this.policyId = policy.policy_id
    const args = [
      'enroll',
      '--insecure',
      '-f',
      // TODO: parse the host/port out of the logs for the fleet server
      '--url=http://localhost:8220',
      `--enrollment-token=${policy.api_key}`,
    ];
    execFileSync(agentBinPath, args, { stdio: 'inherit' });
    await copyFile(resolve(__dirname, this.directoryPath, 'elastic-agent.yml'), resolve('.', 'elastic-agent.yml'));
    let done = false
    let retries = 0
    while (!done) {
      await new Promise(resolve => setTimeout(resolve, 5000))
      const {data: agents} = await axios.get(
        `${this.params.kibanaUrl}/api/fleet/agents`, {
          auth: {
            username: this.params.user,
            password: this.params.password,
          }
        }
      )
      done = agents.list[0]?.status === 'online'
      if (++retries > 12) {
        this.log.error('Giving up on enrolling the agent after an hour')
        throw new Error('Agent timed out while coming online')
      }
    }
  }

  public cleanup() {
    this.log.info('Cleaning up the agent process');
    this.agentProcess.kill(9);
    unlinkSync(resolve('.', 'elastic-agent.yml'));
    this.agentProcess.on('close', () => {
      console.log('Agent process closed')
    })
  }
}
