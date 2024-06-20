/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidV4 } from 'uuid';
import type { Agent } from 'supertest';
import {
  CreateAgentPolicyResponse,
  GetAgentPoliciesResponse,
  GetAgentsResponse,
  GetOneAgentPolicyResponse,
  GetOneAgentResponse,
} from '@kbn/fleet-plugin/common';
import {
  GetEnrollmentAPIKeysResponse,
  GetOneEnrollmentAPIKeyResponse,
  PostEnrollmentAPIKeyResponse,
  PostEnrollmentAPIKeyRequest,
  GetEnrollmentSettingsResponse,
} from '@kbn/fleet-plugin/common/types';
import {
  GetUninstallTokenResponse,
  GetUninstallTokensMetadataResponse,
} from '@kbn/fleet-plugin/common/types/rest_spec/uninstall_token';

export class SpaceTestApiClient {
  constructor(private readonly supertest: Agent) {}
  private getBaseUrl(spaceId?: string) {
    return spaceId ? `/s/${spaceId}` : '';
  }
  async setup(spaceId?: string): Promise<CreateAgentPolicyResponse> {
    const { body: res } = await this.supertest
      .post(`${this.getBaseUrl(spaceId)}/api/fleet/setup`)
      .set('kbn-xsrf', 'xxxx')
      .send({})
      .expect(200);

    return res;
  }
  // Agent policies
  async createAgentPolicy(spaceId?: string): Promise<CreateAgentPolicyResponse> {
    const { body: res } = await this.supertest
      .post(`${this.getBaseUrl(spaceId)}/api/fleet/agent_policies`)
      .set('kbn-xsrf', 'xxxx')
      .send({
        name: `test ${uuidV4()}`,
        description: '',
        namespace: 'default',
        inactivity_timeout: 24 * 1000,
      })
      .expect(200);

    return res;
  }
  async createFleetServerPolicy(spaceId?: string): Promise<CreateAgentPolicyResponse> {
    const { body: res } = await this.supertest
      .post(`${this.getBaseUrl(spaceId)}/api/fleet/agent_policies`)
      .set('kbn-xsrf', 'xxxx')
      .send({
        name: `test ${uuidV4()}`,
        description: '',
        namespace: 'default',
        inactivity_timeout: 24 * 1000,
        has_fleet_server: true,
        force: true,
      })
      .expect(200);

    return res;
  }
  async deleteAgentPolicy(agentPolicyId: string, spaceId?: string) {
    await this.supertest
      .post(`${this.getBaseUrl(spaceId)}/api/fleet/agent_policies/delete`)
      .send({
        agentPolicyId,
      })
      .set('kbn-xsrf', 'xxxx')
      .expect(200);
  }
  async getAgentPolicy(policyId: string, spaceId?: string): Promise<GetOneAgentPolicyResponse> {
    const { body: res } = await this.supertest
      .get(`${this.getBaseUrl(spaceId)}/api/fleet/agent_policies/${policyId}`)
      .expect(200);

    return res;
  }
  async getAgentPolicies(spaceId?: string): Promise<GetAgentPoliciesResponse> {
    const { body: res } = await this.supertest
      .get(`${this.getBaseUrl(spaceId)}/api/fleet/agent_policies`)
      .expect(200);

    return res;
  }
  // Enrollmennt API Keys
  async getEnrollmentApiKey(
    keyId: string,
    spaceId?: string
  ): Promise<GetOneEnrollmentAPIKeyResponse> {
    const { body: res } = await this.supertest
      .get(`${this.getBaseUrl(spaceId)}/api/fleet/enrollment_api_keys/${keyId}`)
      .expect(200);

    return res;
  }
  async getEnrollmentApiKeys(spaceId?: string): Promise<GetEnrollmentAPIKeysResponse> {
    const { body: res } = await this.supertest
      .get(`${this.getBaseUrl(spaceId)}/api/fleet/enrollment_api_keys`)
      .expect(200);

    return res;
  }
  async deleteEnrollmentApiKey(
    keyId: string,
    spaceId?: string
  ): Promise<PostEnrollmentAPIKeyResponse> {
    const { body: res } = await this.supertest
      .delete(`${this.getBaseUrl(spaceId)}/api/fleet/enrollment_api_keys/${keyId}`)
      .set('kbn-xsrf', 'xxxx')
      .expect(200);

    return res;
  }
  async postEnrollmentApiKeys(
    body: PostEnrollmentAPIKeyRequest['body'],
    spaceId?: string
  ): Promise<PostEnrollmentAPIKeyResponse> {
    const { body: res } = await this.supertest
      .post(`${this.getBaseUrl(spaceId)}/api/fleet/enrollment_api_keys`)
      .set('kbn-xsrf', 'xxxx')
      .send(body)
      .expect(200);

    return res;
  }
  // Uninstall tokens
  async getUninstallTokens(spaceId?: string): Promise<GetUninstallTokensMetadataResponse> {
    const { body: res } = await this.supertest
      .get(`${this.getBaseUrl(spaceId)}/api/fleet/uninstall_tokens`)
      .expect(200);

    return res;
  }
  async getUninstallToken(tokenId: string, spaceId?: string): Promise<GetUninstallTokenResponse> {
    const { body: res } = await this.supertest
      .get(`${this.getBaseUrl(spaceId)}/api/fleet/uninstall_tokens/${tokenId}`)
      .expect(200);

    return res;
  }
  // Agents
  async getAgent(agentId: string, spaceId?: string): Promise<GetOneAgentResponse> {
    const { body: res } = await this.supertest
      .get(`${this.getBaseUrl(spaceId)}/api/fleet/agents/${agentId}`)
      .expect(200);

    return res;
  }
  async getAgents(spaceId?: string): Promise<GetAgentsResponse> {
    const { body: res } = await this.supertest
      .get(`${this.getBaseUrl(spaceId)}/api/fleet/agents`)
      .expect(200);

    return res;
  }
  // Enrollment Settings
  async getEnrollmentSettings(spaceId?: string): Promise<GetEnrollmentSettingsResponse> {
    const { body: res } = await this.supertest
      .get(`${this.getBaseUrl(spaceId)}/internal/fleet/settings/enrollment`)
      .expect(200);

    return res;
  }
}
