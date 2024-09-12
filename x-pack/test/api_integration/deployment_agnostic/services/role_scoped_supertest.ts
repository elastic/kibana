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
  useCookieHeader?: boolean;
  withInternalHeaders?: boolean;
  withCommonHeaders?: boolean;
  withCustomHeaders?: Record<string, string>;
}

export class SupertestWithRoleScope {
  private authValue: RoleCredentials | { Cookie: string } | null;
  private readonly supertestWithoutAuth: SupertestWithoutAuthProviderType;
  private samlAuth: SamlAuthProviderType;
  private readonly options: RequestHeadersOptions;

  constructor(
    authValue: RoleCredentials | { Cookie: string } | null,
    supertestWithoutAuth: SupertestWithoutAuthProviderType,
    samlAuth: SamlAuthProviderType,
    options: RequestHeadersOptions
  ) {
    this.authValue = authValue;
    this.supertestWithoutAuth = supertestWithoutAuth;
    this.samlAuth = samlAuth;
    this.options = options;
  }

  async destroy() {
    if (this.authValue && 'apiKeyHeader' in this.authValue) {
      await this.samlAuth.invalidateM2mApiKeyWithRoleScope(this.authValue);
      this.authValue = null;
    }
  }

  private addHeaders(agent: Test): Test {
    const { useCookieHeader, withInternalHeaders, withCommonHeaders, withCustomHeaders } =
      this.options;

    if (useCookieHeader) {
      if (!this.authValue || !('Cookie' in this.authValue)) {
        throw new Error('The instance has already been destroyed or cookieHeader is missing.');
      }
      // set cookie header
      void agent.set(this.authValue);
    } else {
      if (!this.authValue || !('apiKeyHeader' in this.authValue)) {
        throw new Error('The instance has already been destroyed or roleAuthc is missing.');
      }
      // set API key header
      void agent.set(this.authValue.apiKeyHeader);
    }

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
    if (!this.authValue) {
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
 *
 * Pass '{ useCookieHeader: true }' to use Cookie header for authentication instead of API key.
 * It is the correct way to perform HTTP requests for internal end-points.
 */
export function RoleScopedSupertestProvider({ getService }: DeploymentAgnosticFtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const samlAuth = getService('samlAuth');

  return {
    async getSupertestWithRoleScope(
      role: string,
      options: RequestHeadersOptions = {
        useCookieHeader: false,
        withCommonHeaders: false,
        withInternalHeaders: false,
      }
    ) {
      // if 'useCookieHeader' set to 'true', HTTP requests will be called with cookie Header (like in browser)
      if (options.useCookieHeader) {
        const cookieHeader = await samlAuth.getM2MApiCredentialsWithRoleScope(role);
        return new SupertestWithRoleScope(cookieHeader, supertestWithoutAuth, samlAuth, options);
      }

      // HTTP requests will be called with API key in header by default
      const roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope(role);
      return new SupertestWithRoleScope(roleAuthc, supertestWithoutAuth, samlAuth, options);
    },
  };
}
