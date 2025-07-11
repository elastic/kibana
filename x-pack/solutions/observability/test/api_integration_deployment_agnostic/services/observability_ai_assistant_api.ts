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
import type { DeploymentAgnosticFtrProviderContext } from '../ftr_provider_context';

type Options<TEndpoint extends APIEndpoint> = {
  type?: 'form-data';
  endpoint: TEndpoint;
  spaceId?: string;
} & APIClientRequestParamsOf<TEndpoint> & {
    params?: { query?: { _inspect?: boolean } };
  };

function createObservabilityAIAssistantApiClient({
  getService,
}: DeploymentAgnosticFtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const samlAuth = getService('samlAuth');
  const logger = getService('log');

  async function sendApiRequest<TEndpoint extends APIEndpoint>({
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

    return res;
  }

  function makeApiRequest(role: string) {
    return async <TEndpoint extends APIEndpoint>(
      options: Options<TEndpoint>
    ): Promise<SupertestReturnType<TEndpoint>> => {
      const headers: Record<string, string> = {
        ...samlAuth.getInternalRequestHeader(),
        ...(await samlAuth.getM2MApiCookieCredentialsWithRoleScope(role)),
      };

      return sendApiRequest({
        options,
        headers,
      });
    };
  }

  async function deleteAllActionConnectors(): Promise<any> {
    const internalReqHeader = samlAuth.getInternalRequestHeader();
    const roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('editor');
    const res = await supertestWithoutAuth
      .get(`/api/actions/connectors`)
      .set(roleAuthc.apiKeyHeader)
      .set(internalReqHeader);

    const body = res.body as Array<{ id: string; connector_type_id: string; name: string }>;
    return Promise.all(body.map(({ id }) => deleteActionConnector({ actionId: id })));
  }

  async function deleteActionConnector({ actionId }: { actionId: string }) {
    const internalReqHeader = samlAuth.getInternalRequestHeader();
    const roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('editor');
    return supertestWithoutAuth
      .delete(`/api/actions/connector/${actionId}`)
      .set(roleAuthc.apiKeyHeader)
      .set(internalReqHeader);
  }

  async function createProxyActionConnector({ port }: { port: number }) {
    const internalReqHeader = samlAuth.getInternalRequestHeader();
    const roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('editor');
    try {
      const res = await supertestWithoutAuth
        .post('/api/actions/connector')
        .set(roleAuthc.apiKeyHeader)
        .set(internalReqHeader)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'OpenAI Proxy',
          connector_type_id: '.gen-ai',
          config: {
            apiProvider: 'OpenAI',
            apiUrl: `http://localhost:${port}`,
          },
          secrets: {
            apiKey: 'my-api-key',
          },
        })
        .expect(200);

      const connectorId = res.body.id as string;
      return connectorId;
    } catch (e) {
      logger.error(`Failed to create action connector due to: ${e}`);
      throw e;
    }
  }

  return {
    makeApiRequest,
    deleteAllActionConnectors,
    deleteActionConnector,
    createProxyActionConnector,
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
    admin: observabilityAIAssistantApiClient.makeApiRequest('admin'),
    viewer: observabilityAIAssistantApiClient.makeApiRequest('viewer'),
    editor: observabilityAIAssistantApiClient.makeApiRequest('editor'),
    deleteAllActionConnectors: observabilityAIAssistantApiClient.deleteAllActionConnectors,
    createProxyActionConnector: observabilityAIAssistantApiClient.createProxyActionConnector,
    deleteActionConnector: observabilityAIAssistantApiClient.deleteActionConnector,
  };
}

export type ObservabilityAIAssistantApiClient = ReturnType<
  typeof ObservabilityAIAssistantApiProvider
>;
