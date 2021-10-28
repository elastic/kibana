/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/dev-utils';
import axios, { AxiosRequestConfig } from 'axios';
import { ChildProcess, spawn } from 'child_process';
import { networkInterfaces } from 'os';
import { getLatestVersion } from './artifact_manager';
import { Manager } from './resource_manager';

interface AgentManagerParams {
  user: string;
  password: string;
  kibanaUrl: string;
  esHost: string;
}

export class AgentManager extends Manager {
  private params: AgentManagerParams;
  private log: ToolingLog;
  private agentProcess?: ChildProcess;
  private requestOptions: AxiosRequestConfig;
  constructor(params: AgentManagerParams, log: ToolingLog) {
    super();
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

    const nis = networkInterfaces();
    const ipAddress = Object.values(nis)
      .flatMap((x) => x)
      .find((inf: any) => inf.family === 'IPv4' && inf.address !== '127.0.0.1')?.address;

    const fleetUrl = `http://${ipAddress}:8220`;
    this.log.info('Fleet url: ' + fleetUrl);

    const artifact = `docker.elastic.co/beats/elastic-agent:${await getLatestVersion()}`;
    this.log.info(artifact);

    const args = [
      'run',
      '--env',
      'FLEET_ENROLL=1',
      '--env',
      `FLEET_URL=${fleetUrl}`,
      '--env',
      `FLEET_ENROLLMENT_TOKEN=${policy.api_key}`,
      '--env',
      'FLEET_INSECURE=true',
      artifact,
    ];

    this.agentProcess = spawn('docker', args, { stdio: 'inherit' });

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
