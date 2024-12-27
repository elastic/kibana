/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { format } from 'url';
import request from 'superagent';
import type {
  APIReturnType,
  ObservabilityAIAssistantAPIClientRequestParamsOf as APIClientRequestParamsOf,
  ObservabilityAIAssistantAPIEndpoint as APIEndpoint,
} from '@kbn/observability-ai-assistant-plugin/public';
import { formatRequest } from '@kbn/server-route-repository';
import { RoleCredentials } from '@kbn/ftr-common-functional-services';
import type { DeploymentAgnosticFtrProviderContext } from '../ftr_provider_context';

type Options<TEndpoint extends APIEndpoint> = {
  type?: 'form-data';
  endpoint: TEndpoint;
  spaceId?: string;
} & APIClientRequestParamsOf<TEndpoint> & {
    params?: { query?: { _inspect?: boolean } };
  };

type InternalEndpoint<T extends APIEndpoint> = T extends `${string} /internal/${string}`
  ? T
  : never;

type PublicEndpoint<T extends APIEndpoint> = T extends `${string} /api/${string}` ? T : never;

function createObservabilityAIAssistantApiClient({
  getService,
}: DeploymentAgnosticFtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const samlAuth = getService('samlAuth');
  const logger = getService('log');

  async function makeApiRequest<TEndpoint extends APIEndpoint>({
    options,
    headers,
  }: {
    options: Options<TEndpoint>;
    headers: Record<string, string>;
  }): Promise<SupertestReturnType<TEndpoint>> {
    const { endpoint, type } = options;

    const params = 'params' in options ? (options.params as Record<string, any>) : {};

    const { method, pathname, version } = formatRequest(endpoint, params.path);
    const pathnameWithSpaceId = options.spaceId ? `/s/${options.spaceId}${pathname}` : pathname;
    const url = format({ pathname: pathnameWithSpaceId, query: params?.query });

    logger.debug(`Calling observability_ai_assistant API: ${method.toUpperCase()} ${url}`);

    if (version) {
      headers['Elastic-Api-Version'] = version;
    }

    let res: request.Response;

    if (type === 'form-data') {
      const fields: Array<[string, any]> = Object.entries(params.body);
      const formDataRequest = supertestWithoutAuth[method](url)
        .set(headers)
        .set('Content-type', 'multipart/form-data');

      for (const field of fields) {
        void formDataRequest.field(field[0], field[1]);
      }

      res = await formDataRequest;
    } else if (params.body) {
      res = await supertestWithoutAuth[method](url).send(params.body).set(headers);
    } else {
      res = await supertestWithoutAuth[method](url).set(headers);
    }

    if (res?.status !== 200) {
      throw new ApiError(res, endpoint);
    }

    return res;
  }

  function makeInternalApiRequest(role: string) {
    return async <TEndpoint extends InternalEndpoint<APIEndpoint>>(
      options: Options<TEndpoint>
    ): Promise<SupertestReturnType<TEndpoint>> => {
      const headers: Record<string, string> = {
        ...samlAuth.getInternalRequestHeader(),
        ...(await samlAuth.getM2MApiCookieCredentialsWithRoleScope(role)),
      };

      return makeApiRequest({
        options,
        headers,
      });
    };
  }

  function makePublicApiRequest() {
    return async <TEndpoint extends PublicEndpoint<APIEndpoint>>(
      options: Options<TEndpoint> & {
        roleAuthc: RoleCredentials;
      }
    ): Promise<SupertestReturnType<TEndpoint>> => {
      const headers: Record<string, string> = {
        ...samlAuth.getInternalRequestHeader(),
        ...options.roleAuthc.apiKeyHeader,
      };

      return makeApiRequest({
        options,
        headers,
      });
    };
  }

  return {
    makeInternalApiRequest,
    makePublicApiRequest,
  };
}

export type ApiSupertest = ReturnType<typeof createObservabilityAIAssistantApiClient>;

export class ApiError extends Error {
  status: number;

  constructor(res: request.Response, endpoint: string) {
    super(`Error calling ${endpoint}: ${res.status} - ${res.text}`);
    this.name = 'ApiError';
    this.status = res.status;
  }
}

export interface SupertestReturnType<TEndpoint extends APIEndpoint> {
  status: number;
  body: APIReturnType<TEndpoint>;
}

export function ObservabilityAIAssistantApiProvider(context: DeploymentAgnosticFtrProviderContext) {
  const observabilityAIAssistantApiClient = createObservabilityAIAssistantApiClient(context);
  return {
    admin: observabilityAIAssistantApiClient.makeInternalApiRequest('admin'),
    viewer: observabilityAIAssistantApiClient.makeInternalApiRequest('viewer'),
    editor: observabilityAIAssistantApiClient.makeInternalApiRequest('editor'),
    publicApi: observabilityAIAssistantApiClient.makePublicApiRequest(),
  };
}

export type ObservabilityAIAssistantApiClient = ReturnType<
  typeof ObservabilityAIAssistantApiProvider
>;
