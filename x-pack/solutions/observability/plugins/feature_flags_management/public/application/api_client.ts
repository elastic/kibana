/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildPath, type HttpFetchQuery, type HttpStart } from '@kbn/core-http-browser';
import {
  API_PATHS,
  API_VERSION,
  LIMITS,
  type App,
  type CreateAppRequest,
  type CreateEnvironmentRequest,
  type CreateFlagRequest,
  type Credential,
  type Environment,
  type Flag,
  type FlagHistoryResponse,
  type ListAppsResponse,
  type ListCredentialsResponse,
  type ListEnvironmentsResponse,
  type ListFlagsResponse,
  type ListObservedContextsResponse,
  type ObservedAttributesResponse,
  type ObservedValuesResponse,
  type RotateCredentialResponse,
  type UpdateAppRequest,
  type UpdateEnvironmentRequest,
  type UpdateFlagRequest,
} from '../../common';
import { toFeatureFlagsApiError } from './api_error';

export interface ListFlagsFilters {
  app?: string;
  environment?: string;
  tag?: string;
  teamOwner?: string;
  search?: string;
  page?: number;
  perPage?: number;
}

const definedQuery = (query: Record<string, string | number | undefined>): HttpFetchQuery => {
  const result: HttpFetchQuery = {};
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') {
      result[key] = value;
    }
  }
  return result;
};

/**
 * Client for the public `/api/feature_flags` routes.
 * Every call sends `version: API_VERSION`, which Kibana turns into the elastic-api-version header.
 */
export class FeatureFlagsApiClient {
  constructor(private readonly http: HttpStart) {}

  public listEnvironments(page = 1, perPage = 100): Promise<ListEnvironmentsResponse> {
    return this.get(API_PATHS.environments, { page, per_page: perPage });
  }

  public createEnvironment(body: CreateEnvironmentRequest): Promise<Environment> {
    return this.send('post', API_PATHS.environments, body);
  }

  public updateEnvironment(
    environment: string,
    body: UpdateEnvironmentRequest
  ): Promise<Environment> {
    return this.send('put', buildPath(API_PATHS.environment, { environment }), body);
  }

  public deleteEnvironment(environment: string, version?: string): Promise<void> {
    return this.remove(buildPath(API_PATHS.environment, { environment }), version);
  }

  public listApps(page = 1, perPage = 100): Promise<ListAppsResponse> {
    return this.get(API_PATHS.apps, { page, per_page: perPage });
  }

  public getApp(app: string): Promise<App> {
    return this.get(buildPath(API_PATHS.app, { app }));
  }

  public createApp(body: CreateAppRequest): Promise<App> {
    return this.send('post', API_PATHS.apps, body);
  }

  public updateApp(app: string, body: UpdateAppRequest): Promise<App> {
    return this.send('put', buildPath(API_PATHS.app, { app }), body);
  }

  public deleteApp(app: string, version?: string): Promise<void> {
    return this.remove(buildPath(API_PATHS.app, { app }), version);
  }

  public listCredentials(app: string): Promise<ListCredentialsResponse> {
    return this.get(buildPath(API_PATHS.appCredentials, { app }));
  }

  public rotateCredential(
    app: string,
    environment: string,
    rotateClientId: boolean
  ): Promise<RotateCredentialResponse> {
    return this.send(
      'post',
      buildPath(API_PATHS.appCredentialRotate, { app, environment }),
      rotateClientId ? { rotate_client_id: true } : {}
    );
  }

  public deleteCredential(app: string, environment: string): Promise<void> {
    return this.remove(buildPath(API_PATHS.appCredential, { app, environment }));
  }

  public listFlags(filters: ListFlagsFilters = {}): Promise<ListFlagsResponse> {
    return this.get(API_PATHS.flags, {
      app: filters.app,
      environment: filters.environment,
      tag: filters.tag,
      team_owner: filters.teamOwner,
      search: filters.search,
      page: filters.page,
      per_page: filters.perPage,
    });
  }

  /**
   * Pages through flags for prerequisite cycle checks. Stops after 10 pages;
   * the server still rejects any cycle this slice missed.
   */
  public async listAllFlags(
    filters: Omit<ListFlagsFilters, 'page' | 'perPage'> = {}
  ): Promise<Flag[]> {
    const flags: Flag[] = [];
    const perPage = LIMITS.maxPerPage;
    for (let page = 1; page <= 10; page++) {
      const response = await this.listFlags({ ...filters, page, perPage });
      flags.push(...response.items);
      if (response.items.length < perPage || flags.length >= response.total) {
        break;
      }
    }
    return flags;
  }

  public getFlag(key: string): Promise<Flag> {
    return this.get(buildPath(API_PATHS.flag, { key }));
  }

  public createFlag(body: CreateFlagRequest): Promise<Flag> {
    return this.send('post', API_PATHS.flags, body);
  }

  public updateFlag(key: string, body: UpdateFlagRequest): Promise<Flag> {
    return this.send('put', buildPath(API_PATHS.flag, { key }), body);
  }

  public deleteFlag(key: string, version?: string): Promise<void> {
    return this.remove(buildPath(API_PATHS.flag, { key }), version);
  }

  public getFlagHistory(key: string, page = 1, perPage = 20): Promise<FlagHistoryResponse> {
    return this.get(buildPath(API_PATHS.flagHistory, { key }), { page, per_page: perPage });
  }

  public listObservedAttributes(query: {
    app: string;
    environment: string;
    prefix?: string;
    size?: number;
  }): Promise<ObservedAttributesResponse> {
    return this.get(API_PATHS.observedContextAttributes, query);
  }

  public listObservedValues(query: {
    app: string;
    environment: string;
    attribute: string;
    prefix?: string;
    size?: number;
  }): Promise<ObservedValuesResponse> {
    return this.get(API_PATHS.observedContextValues, query);
  }

  public listObservedContexts(query: {
    app: string;
    environment: string;
    contextKey?: string;
    page?: number;
    perPage?: number;
  }): Promise<ListObservedContextsResponse> {
    return this.get(API_PATHS.observedContexts, {
      app: query.app,
      environment: query.environment,
      context_key: query.contextKey,
      page: query.page,
      per_page: query.perPage,
    });
  }

  private get<T>(path: string, query?: Record<string, string | number | undefined>): Promise<T> {
    return this.request(() =>
      this.http.get<T>(path, {
        version: API_VERSION,
        query: query ? definedQuery(query) : undefined,
      })
    );
  }

  private send<T>(method: 'post' | 'put', path: string, body: unknown): Promise<T> {
    return this.request(() =>
      this.http[method]<T>(path, {
        version: API_VERSION,
        body: JSON.stringify(body),
      })
    );
  }

  private remove(path: string, version?: string): Promise<void> {
    return this.request(async () => {
      await this.http.delete(path, {
        version: API_VERSION,
        query: version ? { version } : undefined,
      });
    });
  }

  private async request<T>(run: () => Promise<T>): Promise<T> {
    try {
      return await run();
    } catch (error) {
      throw toFeatureFlagsApiError(error);
    }
  }
}

export type { Credential };
