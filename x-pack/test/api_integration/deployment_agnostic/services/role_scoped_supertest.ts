/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RoleCredentials,
  SupertestWithoutAuthProviderType,
  SamlAuthProviderType,
} from '@kbn/ftr-common-functional-services';
import { Test } from 'supertest';
import { DeploymentAgnosticFtrProviderContext } from '../ftr_provider_context';

export interface RequestHeadersOptions {
  withInternalHeaders?: boolean;
  withCommonHeaders?: boolean;
  withCustomHeaders?: Record<string, string>;
}

export class SupertestWithRoleScope {
  private roleAuthc: RoleCredentials | null;
  private readonly supertestWithoutAuth: SupertestWithoutAuthProviderType;
  private samlAuth: SamlAuthProviderType;
  private readonly options: RequestHeadersOptions;

  constructor(
    roleAuthc: RoleCredentials,
    supertestWithoutAuth: SupertestWithoutAuthProviderType,
    samlAuth: SamlAuthProviderType,
    options: RequestHeadersOptions
  ) {
    this.roleAuthc = roleAuthc;
    this.supertestWithoutAuth = supertestWithoutAuth;
    this.samlAuth = samlAuth;
    this.options = options;
  }

  async destroy() {
    if (this.roleAuthc) {
      await this.samlAuth.invalidateM2mApiKeyWithRoleScope(this.roleAuthc);
      this.roleAuthc = null;
    }
  }

  private addHeaders(agent: Test): Test {
    const { withInternalHeaders, withCommonHeaders, withCustomHeaders } = this.options;

    if (!this.roleAuthc) {
      throw new Error('The instance has already been destroyed.');
    }
    // set role-based API key by default
    void agent.set(this.roleAuthc.apiKeyHeader);

    if (withInternalHeaders) {
      void agent.set(this.samlAuth.getInternalRequestHeader());
    }

    if (withCommonHeaders) {
      void agent.set(this.samlAuth.getCommonRequestHeader());
    }

    if (withCustomHeaders) {
      void agent.set(withCustomHeaders);
    }

    return agent;
  }

  private request(method: 'post' | 'get' | 'put' | 'delete', url: string): Test {
    if (!this.roleAuthc) {
      throw new Error('Instance has been destroyed and cannot be used for making requests.');
    }
    const agent = this.supertestWithoutAuth[method](url);
    return this.addHeaders(agent);
  }

  post(url: string) {
    return this.request('post', url);
  }

  get(url: string) {
    return this.request('get', url);
  }

  put(url: string) {
    return this.request('put', url);
  }

  delete(url: string) {
    return this.request('delete', url);
  }
}

/**
 * Provides a customized 'supertest' instance that is authenticated using a role-based API key
 * and enriched with the appropriate request headers. This service allows you to perform
 * HTTP requests with specific authentication and header configurations, ensuring that
 * the requests are scoped to the provided role and environment.
 *
 * Use this service to easily test API endpoints with role-specific authorization and
 * custom headers, both in serverless and stateful environments.
 */
export function RoleScopedSupertestProvider({ getService }: DeploymentAgnosticFtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const samlAuth = getService('samlAuth');

  return {
    async getSupertestWithRoleScope(
      role: string,
      options: RequestHeadersOptions = {
        withCommonHeaders: false,
        withInternalHeaders: false,
      }
    ) {
      const roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope(role);
      return new SupertestWithRoleScope(roleAuthc, supertestWithoutAuth, samlAuth, options);
    },
  };
}
