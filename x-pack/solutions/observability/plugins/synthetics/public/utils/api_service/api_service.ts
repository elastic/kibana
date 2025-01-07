/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isRight } from 'fp-ts/lib/Either';
import { formatErrors } from '@kbn/securitysolution-io-ts-utils';
import { HttpFetchOptions, HttpFetchQuery, HttpSetup } from '@kbn/core/public';
import { FETCH_STATUS, AddInspectorRequest } from '@kbn/observability-shared-plugin/public';
import type { InspectorRequestProps } from '@kbn/observability-shared-plugin/public/contexts/inspector/inspector_context';
import { addSpaceIdToPath } from '@kbn/spaces-plugin/common';
import { kibanaService } from '../kibana_service';

type Params = HttpFetchQuery & { version?: string; spaceId?: string };

type FetchOptions = HttpFetchOptions & { asResponse?: true };

class ApiService {
  private static instance: ApiService;
  private _http!: HttpSetup;
  private _addInspectorRequest!: AddInspectorRequest;

  public get http() {
    return this._http;
  }

  public set http(httpSetup: HttpSetup) {
    this._http = httpSetup;
  }

  public get addInspectorRequest() {
    return this._addInspectorRequest;
  }

  public set addInspectorRequest(addInspectorRequest: AddInspectorRequest) {
    this._addInspectorRequest = addInspectorRequest;
  }

  private constructor() {}

  static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }

    return ApiService.instance;
  }

  private parseResponse<T>(response: Awaited<T>, apiUrl: string, decodeType?: any): T {
    if (decodeType) {
      const decoded = decodeType.decode(response);
      if (isRight(decoded)) {
        return decoded.right as T;
      } else {
        // This was changed from using template literals to using %s string
        // interpolation, but the previous version included the apiUrl value
        // twice. To ensure the log output doesn't change, this continues.
        //
        // eslint-disable-next-line no-console
        console.error(
          'API %s is not returning expected response, %s for response',
          apiUrl,
          formatErrors(decoded.left).toString(),
          apiUrl,
          response
        );
      }
    }
    return response;
  }

  private parseApiUrl(apiUrl: string, spaceId?: string) {
    if (spaceId) {
      const basePath = kibanaService.coreSetup.http.basePath;
      return addSpaceIdToPath(basePath.serverBasePath, spaceId, apiUrl);
    }
    return apiUrl;
  }

  public async get<T>(
    apiUrl: string,
    params: Params = {},
    decodeType?: any,
    options?: FetchOptions
  ) {
    const { version, spaceId, ...queryParams } = params;
    const response = await this._http!.fetch<T>({
      path: this.parseApiUrl(apiUrl, spaceId),
      query: queryParams,
      version,
      ...(options ?? {}),
      ...(spaceId ? { prependBasePath: false } : {}),
    });

    this.addInspectorRequest?.({
      data: response as InspectorRequestProps,
      status: FETCH_STATUS.SUCCESS,
      loading: false,
    });

    return this.parseResponse(response, apiUrl, decodeType);
  }

  public async post<T>(apiUrl: string, data?: any, decodeType?: any, params: Params = {}) {
    const { version, spaceId, ...queryParams } = params;

    const response = await this._http!.post<T>(this.parseApiUrl(apiUrl, spaceId), {
      method: 'POST',
      body: JSON.stringify(data),
      query: queryParams,
      version,
      ...(spaceId ? { prependBasePath: false } : {}),
    });

    this.addInspectorRequest?.({
      data: response as InspectorRequestProps,
      status: FETCH_STATUS.SUCCESS,
      loading: false,
    });

    return this.parseResponse(response, apiUrl, decodeType);
  }

  public async put<T>(
    apiUrl: string,
    data?: any,
    decodeType?: any,
    params: Params = {},
    options?: FetchOptions
  ) {
    const { version, spaceId, ...queryParams } = params;

    const response = await this._http!.put<T>(this.parseApiUrl(apiUrl, spaceId), {
      method: 'PUT',
      body: JSON.stringify(data),
      query: queryParams,
      version,
      ...(options ?? {}),
      ...(spaceId ? { prependBasePath: false } : {}),
    });

    return this.parseResponse(response, apiUrl, decodeType);
  }

  public async delete<T>(apiUrl: string, params: Params = {}, data?: any, options?: FetchOptions) {
    const { version, spaceId, ...queryParams } = params;

    const response = await this._http!.delete<T>({
      path: this.parseApiUrl(apiUrl, spaceId),
      query: queryParams,
      body: JSON.stringify(data),
      version,
      ...(options ?? {}),
      ...(spaceId ? { prependBasePath: false } : {}),
    });

    if (response instanceof Error) {
      throw response;
    }
    return response;
  }
}

export const apiService = ApiService.getInstance();
