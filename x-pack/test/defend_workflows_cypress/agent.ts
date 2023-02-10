/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import os from 'node:os';
import execa from 'execa';
import { find } from 'lodash';
import { ToolingLog } from '@kbn/tooling-log';
import axios from 'axios';
import { agentRouteService, enrollmentAPIKeyRouteService } from '@kbn/fleet-plugin/common';
import { indexFleetEndpointPolicy } from '@kbn/security-solution-plugin/common/endpoint/data_loaders/index_fleet_endpoint_policy';
import { KbnClient } from '@kbn/test';
import { GetAgentsResponse, GetEnrollmentAPIKeysResponse } from '@kbn/fleet-plugin/common/types';
import { getLatestVersion } from './artifact_manager';
import { Manager } from './resource_manager';

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
  private vmName?: string;
  private kbnClient: KbnClient;
  private agentPolicyId?: string;
  constructor(params: AgentManagerParams, log: ToolingLog, kbnClient: KbnClient) {
    super();
    this.log = log;
    this.params = params;
    this.agentPolicyId = undefined;
    this.vmName = undefined;
    this.kbnClient = kbnClient;
  }

  public async setup() {
    this.log.info('Running agent preconfig');

    const agentVersion = await getLatestVersion();
    const { agentPolicies } = await indexFleetEndpointPolicy(this.kbnClient, 'endpoint', '8.7.0');

    this.agentPolicyId = agentPolicies[0].id;

    this.log.info(
      'Getting agent enrollment key',
      `${this.params.kibanaUrl}${enrollmentAPIKeyRouteService.getListPath()}?page=1&perPage=10000`
    );
    const apiKeys = await this.kbnClient.request<GetEnrollmentAPIKeysResponse>({
      method: 'GET',
      path: enrollmentAPIKeyRouteService.getListPath(),
      query: {
        page: 1,
        perPage: 10000,
      },
    });
    const enrollmentToken = find(
      apiKeys.data.items,
      (item) => item.policy_id === this.agentPolicyId
    )?.api_key;

    const hostIp = find(os.networkInterfaces().en0, { family: 'IPv4' })?.address ?? '0.0.0.0';

    this.vmName = 'endpoint' + Math.random().toString(36).slice(2);

    execa.commandSync(`multipass launch --name ${this.vmName}`);

    const { data: agentResponse } = await axios.get(
      `https://artifacts-api.elastic.co/v1/versions/${agentVersion}/builds/latest/projects/elastic-agent/packages/elastic-agent-${agentVersion}-linux-arm64.tar.gz`
    );

    execa.commandSync(
      `multipass exec ${this.vmName} -- curl -L ${agentResponse.package.url} -o elastic-agent-${agentVersion}-linux-arm64.tar.gz`
    );

    execa.commandSync(
      `multipass exec ${this.vmName} -- tar -zxf elastic-agent-${agentVersion}-linux-arm64.tar.gz`
    );

    execa.commandSync(
      `multipass exec ${this.vmName} --working-directory /home/ubuntu/elastic-agent-${agentVersion}-linux-arm64 -- sudo ./elastic-agent enroll --url=https://${hostIp}:8220 --enrollment-token=${enrollmentToken} --insecure`
    );

    this.log.info('Running the agent');

    execa.command(
      `multipass exec ${this.vmName} --working-directory /home/ubuntu/elastic-agent-${agentVersion}-linux-arm64 -- sudo ./elastic-agent &>/dev/null &`
    );

    // Wait til we see the agent is online
    let done = false;
    let retries = 0;
    while (!done) {
      await new Promise((r) => setTimeout(r, 5000));
      const { data: agents } = await this.kbnClient.request<GetAgentsResponse>({
        method: 'GET',
        path: agentRouteService.getListPath(),
      });
      done = agents.items[1]?.status === 'online';
      if (++retries > 50) {
        this.log.error('Giving up on enrolling the agent after a minute');
        // throw new Error('Agent timed out while coming online');
      }
    }

    return {};
  }

  protected _cleanup() {
    this.log.info('Cleaning up the agent process');
    if (this.vmName) {
      execa.commandSync(`multipass delete ${this.vmName}`);

      this.log.info('Agent process closed');
      execa.commandSync(`multipass purge`);
    }
    return;
  }
}
