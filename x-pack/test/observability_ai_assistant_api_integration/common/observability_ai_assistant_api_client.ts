/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { format } from 'url';
import supertest from 'supertest';
import request from 'superagent';
import type {
  ObservabilityAIAssistantAPIEndpoint,
  ObservabilityAIAssistantAPIClientRequestParamsOf,
  APIReturnType,
} from '@kbn/observability-ai-assistant-plugin/public';
import { formatRequest } from '@kbn/server-route-repository';

export function createObservabilityAIAssistantApiClient(st: supertest.SuperTest<supertest.Test>) {
  return async <TEndpoint extends ObservabilityAIAssistantAPIEndpoint>(
    options: {
      type?: 'form-data';
      endpoint: TEndpoint;
    } & ObservabilityAIAssistantAPIClientRequestParamsOf<TEndpoint> & {
        params?: { query?: { _inspect?: boolean } };
      }
  ): Promise<SupertestReturnType<TEndpoint>> => {
    const { endpoint, type } = options;

    const params = 'params' in options ? (options.params as Record<string, any>) : {};

    const { method, pathname, version } = formatRequest(endpoint, params.path);
    const url = format({ pathname, query: params?.query });

    const headers: Record<string, string> = { 'kbn-xsrf': 'foo' };

    if (version) {
      headers['Elastic-Api-Version'] = version;
    }

    let res: request.Response;
    if (type === 'form-data') {
      const fields: Array<[string, any]> = Object.entries(params.body);
      const formDataRequest = st[method](url)
        .set(headers)
        .set('Content-type', 'multipart/form-data');

      for (const field of fields) {
        formDataRequest.field(field[0], field[1]);
      }

      res = await formDataRequest;
    } else if (params.body) {
      res = await st[method](url).send(params.body).set(headers);
    } else {
      res = await st[method](url).set(headers);
    }

    // supertest doesn't throw on http errors
    if (res?.status !== 200) {
      throw new Error(`Request to ${endpoint} failed with status code ${res?.status ?? 0}`);
    }

    return res;
  };
}

export type ObservabilityAIAssistantAPIClient = ReturnType<
  typeof createObservabilityAIAssistantApiClient
>;

export interface SupertestReturnType<TEndpoint extends ObservabilityAIAssistantAPIEndpoint> {
  text: string;
  status: number;
  body: APIReturnType<TEndpoint>;
}
