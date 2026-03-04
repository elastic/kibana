/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  KibanaRoleDescriptors,
  RoleCredentials,
  SamlAuthProviderType,
  SupertestWithoutAuthProviderType,
} from '@kbn/ftr-common-functional-services';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import type { DeploymentAgnosticFtrProviderContext } from '../ftr_provider_context';
import type { SupertestWithRoleScopeType } from '.';

export interface ParamPayload {
  key: string;
  value: string;
  tags?: string[];
  description?: string;
  share_across_spaces?: boolean;
}

export type AuthType = SupertestWithRoleScopeType | KibanaRoleDescriptors;

/**
 * Service for interacting with Synthetics Global Params API
 * Supports SupertestWithRoleScopeType, or KibanaRoleDescriptors
 */
export class SyntheticsParamsApiService {
  private supertestWithoutAuth: SupertestWithoutAuthProviderType;
  private samlAuth: SamlAuthProviderType;
  private customRoleCredentials: Map<string, RoleCredentials> = new Map();

  constructor(getService: DeploymentAgnosticFtrProviderContext['getService']) {
    this.supertestWithoutAuth = getService('supertestWithoutAuth');
    this.samlAuth = getService('samlAuth');
  }

  /**
   * Type guards to determine authentication method
   */
  private isRoleCredentials(
    auth: RoleCredentials | SupertestWithRoleScopeType
  ): auth is RoleCredentials {
    return 'apiKeyHeader' in auth;
  }

  private isKibanaRoleDescriptors(auth: AuthType): auth is KibanaRoleDescriptors {
    return !('get' in auth) && 'kibana' in auth;
  }

  /**
   * Get or create RoleCredentials from role config
   * Always sets the custom role to ensure correct role definition in Kibana
   */
  private async getAuthCredentials(
    auth: AuthType
  ): Promise<RoleCredentials | SupertestWithRoleScopeType> {
    if (this.isKibanaRoleDescriptors(auth)) {
      const roleKey = JSON.stringify(auth);

      // Always set the role to ensure the definition matches the cached credentials
      await this.samlAuth.setCustomRole(auth);

      if (!this.customRoleCredentials.has(roleKey)) {
        const credentials = await this.samlAuth.createM2mApiKeyWithCustomRoleScope();
        this.customRoleCredentials.set(roleKey, credentials);
      }

      return this.customRoleCredentials.get(roleKey)!;
    }
    return auth;
  }

  /**
   * Clean up all custom role credentials created by this service
   */
  async cleanup() {
    for (const credentials of this.customRoleCredentials.values()) {
      await this.samlAuth.invalidateM2mApiKeyWithRoleScope(credentials);
    }
    this.customRoleCredentials.clear();
    await this.samlAuth.deleteCustomRole();
  }

  /**
   * Create a new global param
   */
  async createParam({
    param,
    auth,
    spaceId,
    expectedStatus = 200,
  }: {
    param: ParamPayload;
    auth: AuthType;
    spaceId?: string;
    expectedStatus?: number;
  }) {
    const path = spaceId
      ? `/s/${spaceId}${SYNTHETICS_API_URLS.PARAMS}`
      : SYNTHETICS_API_URLS.PARAMS;

    const authCredentials = await this.getAuthCredentials(auth);

    if (this.isRoleCredentials(authCredentials)) {
      return this.supertestWithoutAuth
        .post(path)
        .set(authCredentials.apiKeyHeader)
        .set(this.samlAuth.getInternalRequestHeader())
        .send(param)
        .expect(expectedStatus);
    } else {
      return authCredentials.post(path).send(param).expect(expectedStatus);
    }
  }

  /**
   * Get all global params
   */
  async getParams({
    auth,
    spaceId,
    expectedStatus = 200,
  }: {
    auth: AuthType;
    spaceId?: string;
    expectedStatus?: number;
  }) {
    const path = spaceId
      ? `/s/${spaceId}${SYNTHETICS_API_URLS.PARAMS}`
      : SYNTHETICS_API_URLS.PARAMS;

    const authCredentials = await this.getAuthCredentials(auth);

    if (this.isRoleCredentials(authCredentials)) {
      return this.supertestWithoutAuth
        .get(path)
        .set(authCredentials.apiKeyHeader)
        .set(this.samlAuth.getInternalRequestHeader())
        .expect(expectedStatus);
    } else {
      return authCredentials.get(path).expect(expectedStatus);
    }
  }

  /**
   * Get a single global param by ID
   */
  async getParam({
    paramId,
    auth,
    spaceId,
    expectedStatus = 200,
  }: {
    paramId: string;
    auth: AuthType;
    spaceId?: string;
    expectedStatus?: number;
  }) {
    const path = spaceId
      ? `/s/${spaceId}${SYNTHETICS_API_URLS.PARAMS}/${paramId}`
      : `${SYNTHETICS_API_URLS.PARAMS}/${paramId}`;

    const authCredentials = await this.getAuthCredentials(auth);

    if (this.isRoleCredentials(authCredentials)) {
      return this.supertestWithoutAuth
        .get(path)
        .set(authCredentials.apiKeyHeader)
        .set(this.samlAuth.getInternalRequestHeader())
        .expect(expectedStatus);
    } else {
      return authCredentials.get(path).expect(expectedStatus);
    }
  }

  /**
   * Update a global param
   */
  async updateParam({
    paramId,
    param,
    auth,
    spaceId,
    expectedStatus = 200,
  }: {
    paramId: string;
    param: Partial<ParamPayload>;
    auth: AuthType;
    spaceId?: string;
    expectedStatus?: number;
  }) {
    const path = spaceId
      ? `/s/${spaceId}${SYNTHETICS_API_URLS.PARAMS}/${paramId}`
      : `${SYNTHETICS_API_URLS.PARAMS}/${paramId}`;

    const authCredentials = await this.getAuthCredentials(auth);

    if (this.isRoleCredentials(authCredentials)) {
      return this.supertestWithoutAuth
        .put(path)
        .set(authCredentials.apiKeyHeader)
        .set(this.samlAuth.getInternalRequestHeader())
        .send(param)
        .expect(expectedStatus);
    } else {
      return authCredentials.put(path).send(param).expect(expectedStatus);
    }
  }

  /**
   * Delete a global param
   */
  async deleteParam({
    paramId,
    auth,
    spaceId,
    expectedStatus = 200,
  }: {
    paramId: string;
    auth: AuthType;
    spaceId?: string;
    expectedStatus?: number;
  }) {
    const path = spaceId
      ? `/s/${spaceId}${SYNTHETICS_API_URLS.PARAMS}/${paramId}`
      : `${SYNTHETICS_API_URLS.PARAMS}/${paramId}`;

    const authCredentials = await this.getAuthCredentials(auth);

    if (this.isRoleCredentials(authCredentials)) {
      return this.supertestWithoutAuth
        .delete(path)
        .set(authCredentials.apiKeyHeader)
        .set(this.samlAuth.getInternalRequestHeader())
        .expect(expectedStatus);
    } else {
      return authCredentials.delete(path).expect(expectedStatus);
    }
  }

  /**
   * Bulk delete global params
   */
  async bulkDeleteParams({
    ids,
    auth,
    spaceId,
    expectedStatus = 200,
  }: {
    ids: string[];
    auth: AuthType;
    spaceId?: string;
    expectedStatus?: number;
  }) {
    const path = spaceId
      ? `/s/${spaceId}${SYNTHETICS_API_URLS.PARAMS}/_bulk_delete`
      : `${SYNTHETICS_API_URLS.PARAMS}/_bulk_delete`;

    const authCredentials = await this.getAuthCredentials(auth);

    if (this.isRoleCredentials(authCredentials)) {
      return this.supertestWithoutAuth
        .post(path)
        .set(authCredentials.apiKeyHeader)
        .set(this.samlAuth.getInternalRequestHeader())
        .send({ ids })
        .expect(expectedStatus);
    } else {
      return authCredentials.post(path).send({ ids }).expect(expectedStatus);
    }
  }
}

export function SyntheticsParamsApiProvider(context: DeploymentAgnosticFtrProviderContext) {
  return new SyntheticsParamsApiService(context.getService);
}
