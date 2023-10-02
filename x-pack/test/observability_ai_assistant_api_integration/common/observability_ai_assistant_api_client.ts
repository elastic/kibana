/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  APIReturnType,
  ObservabilityAIAssistantAPIClientRequestParamsOf,
  ObservabilityAIAssistantAPIEndpoint,
} from '@kbn/observability-ai-assistant-plugin/public';
import { formatRequest } from '@kbn/server-route-repository';
import supertest from 'supertest';
import { format } from 'url';
import { Subtract } from 'utility-types';

export function createObservabilityAIAssistantApiClient(st: supertest.SuperTest<supertest.Test>) {
  return <TEndpoint extends ObservabilityAIAssistantAPIEndpoint>(
    options: {
      type?: 'form-data';
      endpoint: TEndpoint;
    } & ObservabilityAIAssistantAPIClientRequestParamsOf<TEndpoint> & {
        params?: { query?: { _inspect?: boolean } };
      }
  ): SupertestReturnType<TEndpoint> => {
    const { endpoint, type } = options;

    const params = 'params' in options ? (options.params as Record<string, any>) : {};

    const { method, pathname, version } = formatRequest(endpoint, params.path);
    const url = format({ pathname, query: params?.query });

    const headers: Record<string, string> = { 'kbn-xsrf': 'foo' };

    if (version) {
      headers['Elastic-Api-Version'] = version;
    }

    let res: supertest.Test;
    if (type === 'form-data') {
      const fields: Array<[string, any]> = Object.entries(params.body);
      const formDataRequest = st[method](url)
        .set(headers)
        .set('Content-type', 'multipart/form-data');

      for (const field of fields) {
        formDataRequest.field(field[0], field[1]);
      }

      res = formDataRequest;
    } else if (params.body) {
      res = st[method](url).send(params.body).set(headers);
    } else {
      res = st[method](url).set(headers);
    }

    return res as unknown as SupertestReturnType<TEndpoint>;
  };
}

export type ObservabilityAIAssistantAPIClient = ReturnType<
  typeof createObservabilityAIAssistantApiClient
>;

type WithoutPromise<T extends Promise<any>> = Subtract<T, Promise<any>>;

// this is a little intense, but without it, method overrides are lost
// e.g., {
//  end(one:string)
//  end(one:string, two:string)
// }
// would lose the first signature. This keeps up to four signatures.
type OverloadedParameters<T> = T extends {
  (...args: infer A1): any;
  (...args: infer A2): any;
  (...args: infer A3): any;
  (...args: infer A4): any;
}
  ? A1 | A2 | A3 | A4
  : T extends { (...args: infer A1): any; (...args: infer A2): any; (...args: infer A3): any }
  ? A1 | A2 | A3
  : T extends { (...args: infer A1): any; (...args: infer A2): any }
  ? A1 | A2
  : T extends (...args: infer A) => any
  ? A
  : any;

type OverrideReturnType<T extends (...args: any[]) => any, TNextReturnType> = (
  ...args: OverloadedParameters<T>
) => WithoutPromise<ReturnType<T>> & TNextReturnType;

type OverwriteThisMethods<T extends Record<string, any>, TNextReturnType> = TNextReturnType & {
  [key in keyof T]: T[key] extends (...args: infer TArgs) => infer TReturnType
    ? TReturnType extends Promise<any>
      ? OverrideReturnType<T[key], TNextReturnType>
      : (...args: TArgs) => TReturnType
    : T[key];
};

export type SupertestReturnType<TEndpoint extends ObservabilityAIAssistantAPIEndpoint> =
  OverwriteThisMethods<
    WithoutPromise<supertest.Test>,
    Promise<{
      text: string;
      status: number;
      body: APIReturnType<TEndpoint>;
    }>
  >;
