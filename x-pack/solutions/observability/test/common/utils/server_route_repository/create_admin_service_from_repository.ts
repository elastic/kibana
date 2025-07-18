/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  formatRequest,
  ServerRouteRepository,
  EndpointOf,
  ReturnOf,
  ClientRequestParamsOf,
} from '@kbn/server-route-repository';
import { Subtract, RequiredKeys } from 'utility-types';
import { format } from 'url';
import supertest from 'supertest';
import {
  RoleScopedSupertestProvider,
  SupertestWithRoleScope,
} from '@kbn/test-suites-xpack-platform/api_integration_deployment_agnostic/services/role_scoped_supertest';
import { CustomRoleScopedSupertestProvider } from '@kbn/test-suites-xpack-platform/api_integration_deployment_agnostic/services/custom_role_scoped_supertest';

type MaybeOptional<TArgs extends Record<string, any>> = RequiredKeys<TArgs> extends never
  ? [TArgs] | []
  : [TArgs];

export interface RepositorySupertestClient<TServerRouteRepository extends ServerRouteRepository> {
  fetch: <TEndpoint extends EndpointOf<TServerRouteRepository>>(
    endpoint: TEndpoint,
    ...options: MaybeOptional<
      {
        type?: 'form-data';
      } & ClientRequestParamsOf<TServerRouteRepository, TEndpoint>
    >
  ) => RepositorySupertestReturnOf<TServerRouteRepository, TEndpoint>;

  sendFile: <TEndpoint extends EndpointOf<TServerRouteRepository>>(
    endpoint: TEndpoint,
    options: ClientRequestParamsOf<TServerRouteRepository, TEndpoint> & {
      file: { key: string; filename: string };
    }
  ) => RepositorySupertestReturnOf<TServerRouteRepository, TEndpoint>;
}

type RepositorySupertestReturnOf<
  TServerRouteRepository extends ServerRouteRepository,
  TEndpoint extends EndpointOf<TServerRouteRepository>
> = OverwriteThisMethods<
  WithoutPromise<supertest.Test>,
  Promise<{
    text: string;
    status: number;
    body: ReturnOf<TServerRouteRepository, TEndpoint>;
  }>
>;

async function getApiClient<TServerRouteRepository extends ServerRouteRepository>(
  supertestWithRoleScoped: SupertestWithRoleScope
): Promise<RepositorySupertestClient<TServerRouteRepository>> {
  return {
    fetch: (endpoint, ...rest) => {
      const options = rest.length ? rest[0] : { type: undefined };

      const { type } = options;

      const params = 'params' in options ? (options.params as Record<string, any>) : {};

      const { method, pathname, version } = formatRequest(endpoint, params.path);
      const url = format({ pathname, query: params?.query });

      const headers: Record<string, string> = {
        'kbn-xsrf': 'foo',
        'x-elastic-internal-origin': 'kibana',
      };

      if (version) {
        headers['Elastic-Api-Version'] = version;
      }

      let res: unknown;
      if (type === 'form-data') {
        const fields: Array<[string, any]> = Object.entries(params.body);
        const formDataRequest = supertestWithRoleScoped[method](url)
          .set(headers)
          .set('Content-type', 'multipart/form-data');

        for (const field of fields) {
          void formDataRequest.field(field[0], field[1]);
        }

        res = formDataRequest;
      } else if (params.body) {
        res = supertestWithRoleScoped[method](url).send(params.body).set(headers);
      } else {
        res = supertestWithRoleScoped[method](url).set(headers);
      }

      return res as RepositorySupertestReturnOf<
        TServerRouteRepository,
        EndpointOf<TServerRouteRepository>
      >;
    },

    sendFile: (endpoint, options) => {
      const params = 'params' in options ? (options.params as Record<string, any>) : {};
      const { method, pathname, version } = formatRequest(endpoint, params.path);
      const url = format({ pathname, query: params.query });

      const headers: Record<string, string> = {
        'kbn-xsrf': 'foo',
        'x-elastic-internal-origin': 'kibana',
      };

      if (version) {
        headers['Elastic-Api-Version'] = version;
      }

      const fields: Array<[string, any]> = Object.entries(params.body);
      const formDataRequest = supertestWithRoleScoped[method](url)
        .set(headers)
        .set('Content-type', 'multipart/form-data')
        .attach(options.file.key, params.body[options.file.key], {
          filename: options.file.filename,
        });

      for (const field of fields.filter(([key]) => key !== options.file.key)) {
        void formDataRequest.field(field[0], field[1]);
      }

      return formDataRequest as RepositorySupertestReturnOf<
        TServerRouteRepository,
        EndpointOf<TServerRouteRepository>
      >;
    },
  };
}

export async function getCustomRoleApiClient<TServerRouteRepository extends ServerRouteRepository>(
  st: ReturnType<typeof CustomRoleScopedSupertestProvider>
): Promise<RepositorySupertestClient<TServerRouteRepository>> {
  const supertestWithCustomRoleScoped = await st.getSupertestWithCustomRoleScope({
    useCookieHeader: true,
    withInternalHeaders: true,
  });
  return await getApiClient(supertestWithCustomRoleScoped);
}

export async function getAdminApiClient<TServerRouteRepository extends ServerRouteRepository>(
  st: ReturnType<typeof RoleScopedSupertestProvider>
): Promise<RepositorySupertestClient<TServerRouteRepository>> {
  const supertestWithRoleScoped = await st.getSupertestWithRoleScope('admin', {
    useCookieHeader: true,
    withInternalHeaders: true,
  });
  return await getApiClient(supertestWithRoleScoped);
}

export async function getEditorApiClient<TServerRouteRepository extends ServerRouteRepository>(
  st: ReturnType<typeof RoleScopedSupertestProvider>
): Promise<RepositorySupertestClient<TServerRouteRepository>> {
  const supertestWithRoleScoped = await st.getSupertestWithRoleScope('editor', {
    useCookieHeader: true,
    withInternalHeaders: true,
  });
  return await getApiClient(supertestWithRoleScoped);
}

export async function getViewerApiClient<TServerRouteRepository extends ServerRouteRepository>(
  st: ReturnType<typeof RoleScopedSupertestProvider>
): Promise<RepositorySupertestClient<TServerRouteRepository>> {
  const supertestWithRoleScoped = await st.getSupertestWithRoleScope('viewer', {
    useCookieHeader: true,
    withInternalHeaders: true,
  });
  return await getApiClient(supertestWithRoleScoped);
}

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
