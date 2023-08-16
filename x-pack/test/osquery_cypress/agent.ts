/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import execa from 'execa';
import { KbnClient } from '@kbn/test';
import {
  GetEnrollmentAPIKeysResponse,
  CreateAgentPolicyResponse,
} from '@kbn/fleet-plugin/common/types';
import { getLatestVersion } from './artifact_manager';
import { Manager } from './resource_manager';
import { addIntegrationToAgentPolicy, DEFAULT_HEADERS } from './utils';

export class AgentManager extends Manager {
  private log: ToolingLog;
  private kbnClient: KbnClient;
  private fleetServerPort: string;
  private agentContainerId?: string;

  constructor(kbnClient: KbnClient, fleetServerPort: string, log: ToolingLog) {
    super();
    this.log = log;
    this.fleetServerPort = fleetServerPort;
    this.kbnClient = kbnClient;
  }

  public async setup() {
    this.log.info('Running agent preconfig');
    const agentPolicyName = 'Osquery policy';

    const {
      data: {
        item: { id: agentPolicyId },
      },
    } = await this.kbnClient.request<CreateAgentPolicyResponse>({
      method: 'POST',
      path: `/api/fleet/agent_policies?sys_monitoring=true`,
      headers: DEFAULT_HEADERS,
      body: {
        name: agentPolicyName,
        description: '',
        namespace: 'default',
        monitoring_enabled: ['logs', 'metrics'],
        inactivity_timeout: 1209600,
      },
    });

    this.log.info(`Adding integration to ${agentPolicyId}`);

    await addIntegrationToAgentPolicy(this.kbnClient, agentPolicyId, agentPolicyName);

    this.log.info('Getting agent enrollment key');
    const { data: apiKeys } = await this.kbnClient.request<GetEnrollmentAPIKeysResponse>({
      method: 'GET',
      path: '/api/fleet/enrollment_api_keys',
    });
    const policy = apiKeys.items[0];

    this.log.info('Running the agent');

    const artifact = `docker.elastic.co/beats/elastic-agent:${await getLatestVersion()}`;
    this.log.info(artifact);

    const dockerArgs = [
      'run',
      '--detach',
      '--add-host',
      'host.docker.internal:host-gateway',
      '--env',
      'FLEET_ENROLL=1',
      '--env',
      `FLEET_URL=https://host.docker.internal:${this.fleetServerPort}`,
      '--env',
      `FLEET_ENROLLMENT_TOKEN=${policy.api_key}`,
      '--env',
      'FLEET_INSECURE=true',
      '--rm',
      artifact,
    ];

    this.agentContainerId = (await execa('docker', dockerArgs)).stdout;

    return { policyId: policy.policy_id as string };
  }

  public cleanup() {
    super.cleanup();
    this.log.info('Cleaning up the agent process');
    if (this.agentContainerId) {
      this.log.info('Closing fleet process');

      try {
        execa.sync('docker', ['kill', this.agentContainerId]);
      } catch (err) {
        this.log.error('Error closing fleet agent process');
      }
      this.log.info('Fleet agent process closed');
    }
  }
}
