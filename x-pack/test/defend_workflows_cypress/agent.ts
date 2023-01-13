/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import execa from 'execa';
import { find } from 'lodash';
import { ToolingLog } from '@kbn/tooling-log';
import axios, { AxiosRequestConfig } from 'axios';
import { ChildProcess } from 'child_process';
// import { getLatestVersion } from './artifact_manager';
import { Manager } from './resource_manager';

const VM_NAME = 'endpoint10';

export interface AgentManagerParams {
  user: string;
  password: string;
  kibanaUrl: string;
  esHost: string;
  esPort: string;
}

export class AgentManager extends Manager {
  private params: AgentManagerParams;
  private log: ToolingLog;
  private agentProcess?: ChildProcess;
  private requestOptions: AxiosRequestConfig;
  private agentPolicyId?: string;
  constructor(params: AgentManagerParams, log: ToolingLog, requestOptions: AxiosRequestConfig) {
    super();
    this.log = log;
    this.params = params;
    this.requestOptions = requestOptions;
    this.agentPolicyId = undefined;
  }

  public async setup() {
    this.log.info('Running agent preconfig');

    const {
      data: { items: packages },
    } = await axios.post(
      `${this.params.kibanaUrl}/api/fleet/epm/packages/_bulk`,
      {
        packages: ['endpoint'],
      },
      this.requestOptions
    );

    const {
      data: {
        item: { id: agentPolicyId },
      },
    } = await axios.post(
      `${this.params.kibanaUrl}/api/fleet/agent_policies?sys_monitoring=true`,
      {
        name: 'endpoint',
        description: '',
        namespace: 'default',
        monitoring_enabled: ['logs', 'metrics'],
      },
      this.requestOptions
    );

    await axios.post(
      `${this.params.kibanaUrl}/api/fleet/package_policies`,
      {
        name: 'endpoint',
        description: '',
        namespace: 'default',
        policy_id: agentPolicyId,
        enabled: true,
        inputs: [
          {
            enabled: true,
            streams: [],
            type: 'ENDPOINT_INTEGRATION_CONFIG',
            config: {
              _config: {
                value: {
                  type: 'endpoint',
                  endpointConfig: {
                    preset: 'NGAV',
                  },
                },
              },
            },
          },
        ],
        package: {
          name: 'endpoint',
          title: 'Elastic Defend',
          version: packages[0].version,
        },
      },
      this.requestOptions
    );

    this.agentPolicyId = agentPolicyId;

    this.log.info('Getting agent enrollment key');
    const apiKeys = await axios.get(
      `${this.params.kibanaUrl}/api/fleet/enrollment_api_keys?page=1&perPage=10000`,
      this.requestOptions
    );
    const enrollmentToken = find(
      apiKeys.data.items,
      (item) => item.policy_id === agentPolicyId
    ).api_key;

    // TODO: Receive the name of the VM and store in the variable
    execa.commandSync(`multipass launch --name ${VM_NAME}`, { forceKillAfterTimeout: false });

    // TODO: Allow to pass agent version as env variable
    // TODO: Try to use direct file download link or use the artifact manager to retrieve the latest version
    // https://artifacts-api.elastic.co/v1/versions/8.7.0-SNAPSHOT/builds/latest/projects/elastic-agent/packages/elastic-agent-8.6.0-SNAPSHOT-linux-arm64.tar.gz/file
    await execa.command(
      `multipass exec ${VM_NAME} -- curl -L https://snapshots.elastic.co/8.6.0-9105192d/downloads/beats/elastic-agent/elastic-agent-8.6.0-SNAPSHOT-linux-arm64.tar.gz -o elastic-agent-8.6.0-SNAPSHOT-linux-arm64.tar.gz`,
      { forceKillAfterTimeout: false }
    );

    execa.commandSync(
      `multipass exec ${VM_NAME} -- tar -zxf elastic-agent-8.6.0-SNAPSHOT-linux-arm64.tar.gz`,
      { forceKillAfterTimeout: false }
    );

    // TODO: Use config service to retrieve the proper --url
    execa.commandSync(
      `multipass exec ${VM_NAME} --working-directory /home/ubuntu/elastic-agent-8.6.0-SNAPSHOT-linux-arm64 -- sudo ./elastic-agent enroll --url=https://192.168.1.15:8220 --enrollment-token=${enrollmentToken} --insecure`,
      { forceKillAfterTimeout: false }
    );

    this.log.info('Running the agent');

    execa.command(
      `multipass exec ${VM_NAME} --working-directory /home/ubuntu/elastic-agent-8.6.0-SNAPSHOT-linux-arm64 -- sudo ./elastic-agent &>/dev/null &`
    );

    // TODO: try to wait for the endpoint agent to be online

    // // Wait til we see the agent is online
    // let done = false;
    // let retries = 0;
    // while (!done) {
    //   await new Promise((r) => setTimeout(r, 5000));
    //   const { data: agents } = await axios.get(
    //     `${this.params.kibanaUrl}/api/fleet/agents`,
    //     this.requestOptions
    //   );
    //   done = agents.items[1]?.status === 'online';
    //   // if (++retries > 50) {
    //   //   this.log.error('Giving up on enrolling the agent after a minute');
    //   //   throw new Error('Agent timed out while coming online');
    //   // }
    // }

    // return { policyId: policy.policy_id as string };
    return {};
  }

  protected _cleanup() {
    this.log.info('Cleaning up the agent process');
    execa.command(`multipass delete ${VM_NAME} && multipass purge`);
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
