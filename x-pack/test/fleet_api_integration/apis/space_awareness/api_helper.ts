/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidV4 } from 'uuid';
import type { Agent } from 'supertest';
import {
  CreateAgentPolicyRequest,
  CreateAgentPolicyResponse,
  CreatePackagePolicyResponse,
  GetAgentPoliciesResponse,
  GetAgentsResponse,
  GetOneAgentPolicyResponse,
  GetOneAgentResponse,
  GetOnePackagePolicyResponse,
  GetPackagePoliciesResponse,
} from '@kbn/fleet-plugin/common';
import {
  GetEnrollmentAPIKeysResponse,
  GetOneEnrollmentAPIKeyResponse,
  PostEnrollmentAPIKeyResponse,
  PostEnrollmentAPIKeyRequest,
  GetEnrollmentSettingsResponse,
  GetInfoResponse,
  GetSpaceSettingsResponse,
  PutSpaceSettingsRequest,
  GetActionStatusResponse,
  PostNewAgentActionResponse,
  UpdateAgentPolicyResponse,
  UpdateAgentPolicyRequest,
  UpdatePackageResponse,
  UpdatePackageRequest,
  PostDownloadSourceRequest,
  GetOneDownloadSourceResponse,
  PostFleetServerHostsRequest,
  PostFleetServerHostsResponse,
  PostOutputRequest,
  GetOneOutputResponse,
} from '@kbn/fleet-plugin/common/types';
import {
  GetUninstallTokenResponse,
  GetUninstallTokensMetadataResponse,
} from '@kbn/fleet-plugin/common/types/rest_spec/uninstall_token';
import { SimplifiedPackagePolicy } from '@kbn/fleet-plugin/common/services/simplified_package_policy_helper';
import { type FleetUsage } from '@kbn/fleet-plugin/server/collectors/register';
import { testUsers } from '../test_users';

export class SpaceTestApiClient {
  constructor(
    private readonly supertest: Agent,
    private readonly auth = testUsers.fleet_all_int_all
  ) {}
  private getBaseUrl(spaceId?: string) {
    return spaceId ? `/s/${spaceId}` : '';
  }
  async setup(spaceId?: string): Promise<CreateAgentPolicyResponse> {
    const { body: res } = await this.supertest
      .post(`${this.getBaseUrl(spaceId)}/api/fleet/setup`)
      .auth(this.auth.username, this.auth.password)
      .set('kbn-xsrf', 'xxxx')
      .send({})
      .expect(200);

    return res;
  }
  // Agent policies
  async createAgentPolicy(
    spaceId?: string,
    data: Partial<CreateAgentPolicyRequest['body']> = {}
  ): Promise<CreateAgentPolicyResponse> {
    const { body: res, statusCode } = await this.supertest
      .post(`${this.getBaseUrl(spaceId)}/api/fleet/agent_policies`)
      .auth(this.auth.username, this.auth.password)
      .set('kbn-xsrf', 'xxxx')
      .send({
        name: `test ${uuidV4()}`,
        description: '',
        namespace: 'default',
        inactivity_timeout: 24 * 1000,
        ...data,
      });

    if (statusCode === 200) {
      return res;
    }

    if (statusCode === 404) {
      throw new Error('404 "Not Found"');
    } else {
      throw new Error(`${statusCode} ${res?.error} ${res.message}`);
    }
  }
  async createPackagePolicy(
    spaceId?: string,
    data: Partial<SimplifiedPackagePolicy & { package: { name: string; version: string } }> = {}
  ): Promise<CreatePackagePolicyResponse> {
    const { body: res, statusCode } = await this.supertest
      .post(`${this.getBaseUrl(spaceId)}/api/fleet/package_policies`)
      .set('kbn-xsrf', 'xxxx')
      .send(data);

    if (statusCode === 200) {
      return res;
    }

    if (statusCode === 404) {
      throw new Error('404 "Not Found"');
    } else {
      throw new Error(`${statusCode} "${res?.error}" ${res.message}`);
    }
  }
  async getPackagePolicy(
    packagePolicyId: string,
    spaceId?: string
  ): Promise<GetOnePackagePolicyResponse> {
    const { body: res } = await this.supertest
      .get(`${this.getBaseUrl(spaceId)}/api/fleet/package_policies/${packagePolicyId}`)
      .expect(200);

    return res;
  }
  async getPackagePolicies(spaceId?: string): Promise<GetPackagePoliciesResponse> {
    const { body: res } = await this.supertest
      .get(`${this.getBaseUrl(spaceId)}/api/fleet/package_policies`)
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
      .auth(this.auth.username, this.auth.password)
      .send({
        agentPolicyId,
      })
      .set('kbn-xsrf', 'xxxx')
      .expect(200);
  }
  async getAgentPolicy(policyId: string, spaceId?: string): Promise<GetOneAgentPolicyResponse> {
    const { body: res } = await this.supertest
      .get(`${this.getBaseUrl(spaceId)}/api/fleet/agent_policies/${policyId}`)
      .auth(this.auth.username, this.auth.password)
      .expect(200);

    return res;
  }
  async putAgentPolicy(
    policyId: string,
    data: Partial<UpdateAgentPolicyRequest['body']>,
    spaceId?: string
  ): Promise<UpdateAgentPolicyResponse> {
    const { body: res, statusCode } = await this.supertest
      .put(`${this.getBaseUrl(spaceId)}/api/fleet/agent_policies/${policyId}`)
      .auth(this.auth.username, this.auth.password)
      .send({
        ...data,
      })
      .set('kbn-xsrf', 'xxxx');

    if (statusCode === 200) {
      return res;
    }

    if (statusCode === 404) {
      throw new Error('404 "Not Found"');
    } else {
      throw new Error(`${statusCode} ${res?.error} ${res.message}`);
    }
  }
  async getAgentPolicies(spaceId?: string): Promise<GetAgentPoliciesResponse> {
    const { body: res } = await this.supertest
      .get(`${this.getBaseUrl(spaceId)}/api/fleet/agent_policies`)
      .auth(this.auth.username, this.auth.password)
      .expect(200);

    return res;
  }

  async getAgentPoliciesSpaces(spaceId?: string) {
    const { body: res } = await this.supertest
      .get(`${this.getBaseUrl(spaceId)}/internal/fleet/agent_policies_spaces`)
      .auth(this.auth.username, this.auth.password)
      .set('kbn-xsrf', 'xxxx')
      .set('elastic-api-version', '1')
      .expect(200);

    return res;
  }

  // Enrollment API Keys
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
  async updateAgent(agentId: string, data: any, spaceId?: string) {
    const { body: res } = await this.supertest
      .put(`${this.getBaseUrl(spaceId)}/api/fleet/agents/${agentId}`)
      .set('kbn-xsrf', 'xxxx')
      .send(data)
      .expect(200);

    return res;
  }
  async deleteAgent(agentId: string, spaceId?: string) {
    const { body: res } = await this.supertest
      .delete(`${this.getBaseUrl(spaceId)}/api/fleet/agents/${agentId}`)
      .set('kbn-xsrf', 'xxxx')
      .expect(200);

    return res;
  }
  async reassignAgent(agentId: string, policyId: string, spaceId?: string) {
    const { body: res } = await this.supertest
      .post(`${this.getBaseUrl(spaceId)}/api/fleet/agents/${agentId}/reassign`)
      .set('kbn-xsrf', 'xxx')
      .send({
        policy_id: policyId,
      })
      .expect(200);

    return res;
  }
  async bulkReassignAgents(data: any, spaceId?: string) {
    const { body: res } = await this.supertest
      .post(`${this.getBaseUrl(spaceId)}/api/fleet/agents/bulk_reassign`)
      .set('kbn-xsrf', 'xxxx')
      .send(data)
      .expect(200);

    return res;
  }
  async upgradeAgent(agentId: string, data: any, spaceId?: string) {
    const { body: res } = await this.supertest
      .post(`${this.getBaseUrl(spaceId)}/api/fleet/agents/${agentId}/upgrade`)
      .set('kbn-xsrf', 'xxxx')
      .send(data)
      .expect(200);

    return res;
  }
  async bulkUpgradeAgents(data: any, spaceId?: string) {
    const { body: res } = await this.supertest
      .post(`${this.getBaseUrl(spaceId)}/api/fleet/agents/bulk_upgrade`)
      .set('kbn-xsrf', 'xxxx')
      .send(data)
      .expect(200);

    return res;
  }
  async requestAgentDiagnostics(agentId: string, spaceId?: string) {
    const { body: res } = await this.supertest
      .post(`${this.getBaseUrl(spaceId)}/api/fleet/agents/${agentId}/request_diagnostics`)
      .set('kbn-xsrf', 'xxxx')
      .expect(200);

    return res;
  }
  async bulkRequestDiagnostics(data: any, spaceId?: string) {
    const { body: res } = await this.supertest
      .post(`${this.getBaseUrl(spaceId)}/api/fleet/agents/bulk_request_diagnostics`)
      .set('kbn-xsrf', 'xxxx')
      .send(data)
      .expect(200);

    return res;
  }
  async unenrollAgent(agentId: string, spaceId?: string) {
    const { body: res } = await this.supertest
      .post(`${this.getBaseUrl(spaceId)}/api/fleet/agents/${agentId}/unenroll`)
      .set('kbn-xsrf', 'xxxx')
      .expect(200);

    return res;
  }
  async bulkUnenrollAgents(data: any, spaceId?: string) {
    const { body: res } = await this.supertest
      .post(`${this.getBaseUrl(spaceId)}/api/fleet/agents/bulk_unenroll`)
      .set('kbn-xsrf', 'xxxx')
      .send(data)
      .expect(200);

    return res;
  }
  async bulkUpdateAgentTags(data: any, spaceId?: string) {
    const { body: res } = await this.supertest
      .post(`${this.getBaseUrl(spaceId)}/api/fleet/agents/bulk_update_agent_tags`)
      .set('kbn-xsrf', 'xxxx')
      .send(data)
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
  // Fleet Usage
  async getFleetUsage(spaceId?: string): Promise<{ usage: FleetUsage }> {
    const { body: res } = await this.supertest
      .get(`${this.getBaseUrl(spaceId)}/internal/fleet/telemetry/usage`)
      .set('kbn-xsrf', 'xxxx')
      .set('elastic-api-version', '1')
      .expect(200);

    return res;
  }
  // Space Settings
  async getSpaceSettings(spaceId?: string): Promise<GetSpaceSettingsResponse> {
    const { body: res } = await this.supertest
      .get(`${this.getBaseUrl(spaceId)}/api/fleet/space_settings`)
      .expect(200);

    return res;
  }
  async putSpaceSettings(
    data: PutSpaceSettingsRequest['body'],
    spaceId?: string
  ): Promise<GetSpaceSettingsResponse> {
    const { body: res } = await this.supertest
      .put(`${this.getBaseUrl(spaceId)}/api/fleet/space_settings`)
      .set('kbn-xsrf', 'xxxx')
      .send(data)
      .expect(200);

    return res;
  }
  // Package install
  async getPackage(
    { pkgName, pkgVersion }: { pkgName: string; pkgVersion?: string },
    spaceId?: string
  ): Promise<GetInfoResponse> {
    const { body: res } = await this.supertest
      .get(
        pkgVersion
          ? `${this.getBaseUrl(spaceId)}/api/fleet/epm/packages/${pkgName}/${pkgVersion}`
          : `${this.getBaseUrl(spaceId)}/api/fleet/epm/packages/${pkgName}`
      )
      .expect(200);

    return res;
  }
  async updatePackage(
    {
      pkgName,
      pkgVersion,
      data,
    }: { pkgName: string; pkgVersion: string; data: UpdatePackageRequest['body'] },
    spaceId?: string
  ): Promise<UpdatePackageResponse> {
    const { body: res } = await this.supertest
      .put(`${this.getBaseUrl(spaceId)}/api/fleet/epm/packages/${pkgName}/${pkgVersion}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ ...data })
      .expect(200);

    return res;
  }
  async installPackage(
    { pkgName, pkgVersion, force }: { pkgName: string; pkgVersion: string; force?: boolean },
    spaceId?: string
  ) {
    const { body: res } = await this.supertest
      .post(`${this.getBaseUrl(spaceId)}/api/fleet/epm/packages/${pkgName}/${pkgVersion}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force })
      .expect(200);

    return res;
  }
  async uninstallPackage(
    { pkgName, pkgVersion, force }: { pkgName: string; pkgVersion: string; force?: boolean },
    spaceId?: string
  ) {
    const { body: res } = await this.supertest
      .delete(`${this.getBaseUrl(spaceId)}/api/fleet/epm/packages/${pkgName}/${pkgVersion}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force })
      .expect(200);

    return res;
  }
  async deletePackageKibanaAssets(
    { pkgName, pkgVersion }: { pkgName: string; pkgVersion: string },
    spaceId?: string
  ) {
    const { body: res } = await this.supertest
      .delete(
        `${this.getBaseUrl(spaceId)}/api/fleet/epm/packages/${pkgName}/${pkgVersion}/kibana_assets`
      )
      .set('kbn-xsrf', 'xxxx')
      .expect(200);

    return res;
  }
  async installPackageKibanaAssets(
    { pkgName, pkgVersion }: { pkgName: string; pkgVersion: string },
    spaceId?: string
  ) {
    const { body: res } = await this.supertest
      .post(
        `${this.getBaseUrl(spaceId)}/api/fleet/epm/packages/${pkgName}/${pkgVersion}/kibana_assets`
      )
      .set('kbn-xsrf', 'xxxx')
      .expect(200);

    return res;
  }
  // Actions
  async getActionStatus(spaceId?: string): Promise<GetActionStatusResponse> {
    const { body: res } = await this.supertest
      .get(`${this.getBaseUrl(spaceId)}/api/fleet/agents/action_status`)
      .expect(200);

    return res;
  }
  async postNewAgentAction(agentId: string, spaceId?: string): Promise<PostNewAgentActionResponse> {
    const { body: res } = await this.supertest
      .post(`${this.getBaseUrl(spaceId)}/api/fleet/agents/${agentId}/actions`)
      .set('kbn-xsrf', 'xxxx')
      .send({ action: { type: 'UNENROLL' } })
      .expect(200);

    return res;
  }
  async cancelAction(actionId: string, spaceId?: string): Promise<PostNewAgentActionResponse> {
    const { body: res } = await this.supertest
      .post(`${this.getBaseUrl(spaceId)}/api/fleet/agents/actions/${actionId}/cancel`)
      .set('kbn-xsrf', 'xxxx')
      .expect(200);
    return res;
  }
  // Enable space awareness
  async postEnableSpaceAwareness(spaceId?: string): Promise<any> {
    const { body: res } = await this.supertest
      .post(`${this.getBaseUrl(spaceId)}/internal/fleet/enable_space_awareness`)
      .auth(this.auth.username, this.auth.password)
      .set('kbn-xsrf', 'xxxx')
      .set('elastic-api-version', '1')
      .expect(200);

    return res;
  }
  // Download source
  async deleteDownloadSource(id: string, spaceId?: string) {
    const { body: res } = await this.supertest
      .delete(`${this.getBaseUrl(spaceId)}/api/fleet/agent_download_sources/${id}`)
      .set('kbn-xsrf', 'xxxx')
      .expect(200);

    return res;
  }
  async postDownloadSource(
    data: PostDownloadSourceRequest['body'],
    spaceId?: string
  ): Promise<GetOneDownloadSourceResponse> {
    const { body: res } = await this.supertest
      .post(`${this.getBaseUrl(spaceId)}/api/fleet/agent_download_sources`)
      .set('kbn-xsrf', 'xxxx')
      .send(data)
      .expect(200);

    return res;
  }
  // Fleet server hosts
  async deleteFleetServerHosts(id: string, spaceId?: string) {
    const { body: res } = await this.supertest
      .delete(`${this.getBaseUrl(spaceId)}/api/fleet/fleet_server_hosts/${id}`)
      .set('kbn-xsrf', 'xxxx')
      .expect(200);

    return res;
  }
  async postFleetServerHosts(
    data: PostFleetServerHostsRequest['body'],
    spaceId?: string
  ): Promise<PostFleetServerHostsResponse> {
    const { body: res } = await this.supertest
      .post(`${this.getBaseUrl(spaceId)}/api/fleet/fleet_server_hosts`)
      .set('kbn-xsrf', 'xxxx')
      .send(data)
      .expect(200);

    return res;
  }
  // Output
  async deleteOutput(id: string, spaceId?: string) {
    const { body: res } = await this.supertest
      .delete(`${this.getBaseUrl(spaceId)}/api/fleet/outputs/${id}`)
      .set('kbn-xsrf', 'xxxx')
      .expect(200);

    return res;
  }
  async postOutput(
    data: PostOutputRequest['body'],
    spaceId?: string
  ): Promise<GetOneOutputResponse> {
    const { body: res } = await this.supertest
      .post(`${this.getBaseUrl(spaceId)}/api/fleet/outputs`)
      .set('kbn-xsrf', 'xxxx')
      .send(data)
      .expect(200);

    return res;
  }

  async postStandaloneApiKey(name: string, spaceId?: string) {
    const { body: res, statusCode } = await this.supertest
      .post(`${this.getBaseUrl(spaceId)}/internal/fleet/create_standalone_agent_api_key`)
      .auth(this.auth.username, this.auth.password)
      .set('kbn-xsrf', 'xxxx')
      .set('elastic-api-version', '1')
      .send({ name });

    if (statusCode !== 200) {
      throw new Error(`${statusCode} ${res?.error} ${res.message}`);
    }

    return res;
  }
}
