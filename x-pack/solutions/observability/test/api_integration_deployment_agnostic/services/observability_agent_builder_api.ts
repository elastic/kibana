/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { format } from 'url';
import type request from 'superagent';
import type { ClientRequestParamsOf, ReturnOf } from '@kbn/server-route-repository';
import { formatRequest } from '@kbn/server-route-repository';
import type { ObservabilityAgentBuilderServerRouteRepository } from '@kbn/observability-agent-builder-plugin/server';
import type { DeploymentAgnosticFtrProviderContext } from '../ftr_provider_context';
import { parseSseResponse } from '../apis/observability_agent_builder/utils/sse';

type APIEndpoint = keyof ObservabilityAgentBuilderServerRouteRepository;

type APIReturnType<TEndpoint extends APIEndpoint> = ReturnOf<
  ObservabilityAgentBuilderServerRouteRepository,
  TEndpoint
>;

type Options<TEndpoint extends APIEndpoint> = {
  endpoint: TEndpoint;
  spaceId?: string;
} & ClientRequestParamsOf<ObservabilityAgentBuilderServerRouteRepository, TEndpoint> & {
    params?: { query?: { _inspect?: boolean } };
  };

interface SupertestReturnType<TEndpoint extends APIEndpoint> {
  status: number;
  body: APIReturnType<TEndpoint>;
}

function createObservabilityAgentBuilderApiClient({
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
    const { endpoint } = options;

    const params = 'params' in options ? (options.params as Record<string, any>) : {};

    const { method, pathname, version } = formatRequest(
      endpoint as string,
      params.path as Record<string, string> | undefined
    );
    const pathnameWithSpaceId = options.spaceId ? `/s/${options.spaceId}${pathname}` : pathname;
    const url = format({ pathname: pathnameWithSpaceId, query: params?.query });

    logger.debug(`Calling observability_agent_builder API: ${method.toUpperCase()} ${url}`);

    if (version) {
      headers['Elastic-Api-Version'] = version;
    }

    let res: request.Response;

    if (params.body) {
      res = await supertestWithoutAuth[method](url).send(params.body).set(headers);
    } else {
      res = await supertestWithoutAuth[method](url).set(headers);
    }

    if (endpoint.includes('ai_insights') && Buffer.isBuffer(res.body)) {
      res.body = parseSseResponse(res.body);
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

  return {
    makeApiRequest,
  };
}

export function ObservabilityAgentBuilderApiProvider(
  context: DeploymentAgnosticFtrProviderContext
) {
  const observabilityAgentBuilderApiClient = createObservabilityAgentBuilderApiClient(context);
  return {
    admin: observabilityAgentBuilderApiClient.makeApiRequest('admin'),
    viewer: observabilityAgentBuilderApiClient.makeApiRequest('viewer'),
    editor: observabilityAgentBuilderApiClient.makeApiRequest('editor'),
  };
}

export type ObservabilityAgentBuilderApiClient = ReturnType<
  typeof ObservabilityAgentBuilderApiProvider
>;
