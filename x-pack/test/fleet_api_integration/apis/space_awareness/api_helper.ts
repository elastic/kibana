/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidV4 } from 'uuid';
import type { Agent } from 'supertest';
import { CreateAgentPolicyResponse, GetOneAgentPolicyResponse } from '@kbn/fleet-plugin/common';
import {
  GetEnrollmentAPIKeysResponse,
  GetOneEnrollmentAPIKeyResponse,
} from '@kbn/fleet-plugin/common/types';

export class SpaceTestApiClient {
  constructor(private readonly supertest: Agent) {}
  async createAgentPolicy(spaceId?: string): Promise<CreateAgentPolicyResponse> {
    const { body: res } = await this.supertest
      .post(spaceId ? `/s/${spaceId}/api/fleet/agent_policies` : `/api/fleet/agent_policies`)
      .set('kbn-xsrf', 'xxxx')
      .send({
        name: `test ${uuidV4()}`,
        description: '',
        namespace: 'default',
      })
      .expect(200);

    return res;
  }

  async deleteAgentPolicy(agentPolicyId: string, spaceId?: string) {
    await this.supertest
      .post(
        spaceId
          ? `/s/${spaceId}/api/fleet/agent_policies/delete`
          : `/api/fleet/agent_policies/delete`
      )
      .send({
        agentPolicyId,
      })
      .set('kbn-xsrf', 'xxxx')
      .expect(200);
  }

  async getAgentPolicy(policyId: string, spaceId?: string): Promise<GetOneAgentPolicyResponse> {
    const { body: res } = await this.supertest
      .get(
        spaceId
          ? `/s/${spaceId}/api/fleet/agent_policies/${policyId}`
          : `/api/fleet/agent_policies/${policyId}`
      )
      .expect(200);

    return res;
  }

  async getEnrollmentApiKey(
    keyId: string,
    spaceId?: string
  ): Promise<GetOneEnrollmentAPIKeyResponse> {
    const { body: res } = await this.supertest
      .get(
        spaceId
          ? `/s/${spaceId}/api/fleet/enrollment_api_keys/${keyId}`
          : `/api/fleet/enrollment_api_keys/${keyId}`
      )
      .expect(200);

    return res;
  }

  async getEnrollmentApiKeys(spaceId?: string): Promise<GetEnrollmentAPIKeysResponse> {
    const { body: res } = await this.supertest
      .get(
        spaceId ? `/s/${spaceId}/api/fleet/enrollment_api_keys` : `/api/fleet/enrollment_api_keys`
      )
      .expect(200);

    return res;
  }
}
