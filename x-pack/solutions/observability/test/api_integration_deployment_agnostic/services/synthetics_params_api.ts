/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
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

/**
 * Service for interacting with Synthetics Global Params API
 * Supports both RoleCredentials (custom roles) and SupertestWithRoleScopeType (standard roles)
 */
export class SyntheticsParamsApiService {
  private supertestWithoutAuth: SupertestWithoutAuthProviderType;
  private samlAuth: SamlAuthProviderType;

  constructor(getService: DeploymentAgnosticFtrProviderContext['getService']) {
    this.supertestWithoutAuth = getService('supertestWithoutAuth');
    this.samlAuth = getService('samlAuth');
  }

  /**
   * Type guard to determine authentication method
   */
  private isRoleCredentials(
    auth: RoleCredentials | SupertestWithRoleScopeType
  ): auth is RoleCredentials {
    return 'apiKeyHeader' in auth;
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
    auth: RoleCredentials | SupertestWithRoleScopeType;
    spaceId?: string;
    expectedStatus?: number;
  }) {
    const path = spaceId
      ? `/s/${spaceId}${SYNTHETICS_API_URLS.PARAMS}`
      : SYNTHETICS_API_URLS.PARAMS;

    if (this.isRoleCredentials(auth)) {
      return this.supertestWithoutAuth
        .post(path)
        .set(auth.apiKeyHeader)
        .set(this.samlAuth.getInternalRequestHeader())
        .send(param)
        .expect(expectedStatus);
    } else {
      return auth.post(path).send(param).expect(expectedStatus);
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
    auth: RoleCredentials | SupertestWithRoleScopeType;
    spaceId?: string;
    expectedStatus?: number;
  }) {
    const path = spaceId
      ? `/s/${spaceId}${SYNTHETICS_API_URLS.PARAMS}`
      : SYNTHETICS_API_URLS.PARAMS;

    if (this.isRoleCredentials(auth)) {
      return this.supertestWithoutAuth
        .get(path)
        .set(auth.apiKeyHeader)
        .set(this.samlAuth.getInternalRequestHeader())
        .expect(expectedStatus);
    } else {
      return auth.get(path).expect(expectedStatus);
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
    auth: RoleCredentials | SupertestWithRoleScopeType;
    spaceId?: string;
    expectedStatus?: number;
  }) {
    const path = spaceId
      ? `/s/${spaceId}${SYNTHETICS_API_URLS.PARAMS}/${paramId}`
      : `${SYNTHETICS_API_URLS.PARAMS}/${paramId}`;

    if (this.isRoleCredentials(auth)) {
      return this.supertestWithoutAuth
        .get(path)
        .set(auth.apiKeyHeader)
        .set(this.samlAuth.getInternalRequestHeader())
        .expect(expectedStatus);
    } else {
      return auth.get(path).expect(expectedStatus);
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
    auth: RoleCredentials | SupertestWithRoleScopeType;
    spaceId?: string;
    expectedStatus?: number;
  }) {
    const path = spaceId
      ? `/s/${spaceId}${SYNTHETICS_API_URLS.PARAMS}/${paramId}`
      : `${SYNTHETICS_API_URLS.PARAMS}/${paramId}`;

    if (this.isRoleCredentials(auth)) {
      return this.supertestWithoutAuth
        .put(path)
        .set(auth.apiKeyHeader)
        .set(this.samlAuth.getInternalRequestHeader())
        .send(param)
        .expect(expectedStatus);
    } else {
      return auth.put(path).send(param).expect(expectedStatus);
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
    auth: RoleCredentials | SupertestWithRoleScopeType;
    spaceId?: string;
    expectedStatus?: number;
  }) {
    const path = spaceId
      ? `/s/${spaceId}${SYNTHETICS_API_URLS.PARAMS}/${paramId}`
      : `${SYNTHETICS_API_URLS.PARAMS}/${paramId}`;

    if (this.isRoleCredentials(auth)) {
      return this.supertestWithoutAuth
        .delete(path)
        .set(auth.apiKeyHeader)
        .set(this.samlAuth.getInternalRequestHeader())
        .expect(expectedStatus);
    } else {
      return auth.delete(path).expect(expectedStatus);
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
    auth: RoleCredentials | SupertestWithRoleScopeType;
    spaceId?: string;
    expectedStatus?: number;
  }) {
    const path = spaceId
      ? `/s/${spaceId}${SYNTHETICS_API_URLS.PARAMS}/_bulk_delete`
      : `${SYNTHETICS_API_URLS.PARAMS}/_bulk_delete`;

    if (this.isRoleCredentials(auth)) {
      return this.supertestWithoutAuth
        .post(path)
        .set(auth.apiKeyHeader)
        .set(this.samlAuth.getInternalRequestHeader())
        .send({ ids })
        .expect(expectedStatus);
    } else {
      return auth.post(path).send({ ids }).expect(expectedStatus);
    }
  }
}

export function SyntheticsParamsApiProvider(context: DeploymentAgnosticFtrProviderContext) {
  return new SyntheticsParamsApiService(context.getService);
}
