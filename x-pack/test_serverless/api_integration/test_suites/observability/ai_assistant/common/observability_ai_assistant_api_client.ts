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
import { Subtract } from 'utility-types';
import { format } from 'url';
import { Config } from '@kbn/test';
import { InheritedFtrProviderContext } from '../../../../services';
import type { InternalRequestHeader, RoleCredentials } from '../../../../../shared/services';

export function getObservabilityAIAssistantApiClient({
  svlSharedConfig,
}: {
  svlSharedConfig: Config;
}) {
  const kibanaServer = svlSharedConfig.get('servers.kibana');
  const cAuthorities = svlSharedConfig.get('servers.kibana.certificateAuthorities');

  const url = format({
    ...kibanaServer,
    auth: false, // don't use auth in serverless
  });

  return createObservabilityAIAssistantApiClient(supertest.agent(url, { ca: cAuthorities }));
}

type ObservabilityAIAssistantApiClientKey = 'slsUser';
export type ObservabilityAIAssistantApiClient = Record<
  ObservabilityAIAssistantApiClientKey,
  Awaited<ReturnType<typeof getObservabilityAIAssistantApiClient>>
>;
export function createObservabilityAIAssistantApiClient(st: supertest.Agent) {
  return <TEndpoint extends ObservabilityAIAssistantAPIEndpoint>(
    options: {
      type?: 'form-data';
      endpoint: TEndpoint;
      roleAuthc: RoleCredentials;
      internalReqHeader: InternalRequestHeader;
    } & ObservabilityAIAssistantAPIClientRequestParamsOf<TEndpoint> & {
        params?: { query?: { _inspect?: boolean } };
      }
  ): SupertestReturnType<TEndpoint> => {
    const { endpoint, type, roleAuthc, internalReqHeader } = options;

    const params = 'params' in options ? (options.params as Record<string, any>) : {};

    const { method, pathname, version } = formatRequest(endpoint, params.path);
    const url = format({ pathname, query: params?.query });

    const headers: Record<string, string> = { ...internalReqHeader, ...roleAuthc.apiKeyHeader };

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
        void formDataRequest.field(field[0], field[1]);
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
// would lose the first signature. This keeps up to eight signatures.
type OverloadedParameters<T> = T extends {
  (...args: infer A1): any;
  (...args: infer A2): any;
  (...args: infer A3): any;
  (...args: infer A4): any;
  (...args: infer A5): any;
  (...args: infer A6): any;
  (...args: infer A7): any;
  (...args: infer A8): any;
}
  ? A1 | A2 | A3 | A4 | A5 | A6 | A7 | A8
  : T extends {
      (...args: infer A1): any;
      (...args: infer A2): any;
      (...args: infer A3): any;
      (...args: infer A4): any;
      (...args: infer A5): any;
      (...args: infer A6): any;
      (...args: infer A7): any;
    }
  ? A1 | A2 | A3 | A4 | A5 | A6 | A7
  : T extends {
      (...args: infer A1): any;
      (...args: infer A2): any;
      (...args: infer A3): any;
      (...args: infer A4): any;
      (...args: infer A5): any;
      (...args: infer A6): any;
    }
  ? A1 | A2 | A3 | A4 | A5 | A6
  : T extends {
      (...args: infer A1): any;
      (...args: infer A2): any;
      (...args: infer A3): any;
      (...args: infer A4): any;
      (...args: infer A5): any;
    }
  ? A1 | A2 | A3 | A4 | A5
  : T extends {
      (...args: infer A1): any;
      (...args: infer A2): any;
      (...args: infer A3): any;
      (...args: infer A4): any;
    }
  ? A1 | A2 | A3 | A4
  : T extends {
      (...args: infer A1): any;
      (...args: infer A2): any;
      (...args: infer A3): any;
    }
  ? A1 | A2 | A3
  : T extends {
      (...args: infer A1): any;
      (...args: infer A2): any;
    }
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

export async function getObservabilityAIAssistantApiClientService({
  getService,
}: InheritedFtrProviderContext): Promise<ObservabilityAIAssistantApiClient> {
  const svlSharedConfig = getService('config');
  // defaults to elastic_admin user when used without auth
  return {
    slsUser: await getObservabilityAIAssistantApiClient({
      svlSharedConfig,
    }),
  };
}
