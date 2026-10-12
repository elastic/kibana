/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core-saved-objects-api-server';
import { z } from '@kbn/zod';
import { routeId } from '../../zod_query';
import type {
  RouteContext,
  SyntheticsRestApiRouteFactory,
  SyntheticsRouteHandler,
} from '../../types';
import { syntheticsParamType } from '../../../../common/types/saved_objects';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import type { SyntheticsParams, SyntheticsParamsReadonly } from '../../../../common/runtime_types';

type ParamResponse = ReturnType<typeof toClientResponse>;

const withSpaceNotFound = async <T>(
  { response, spaceId }: RouteContext,
  read: () => Promise<T>
) => {
  try {
    return await read();
  } catch (error) {
    if (error.output?.statusCode === 404) {
      return response.notFound({ body: { message: `Kibana space '${spaceId}' does not exist` } });
    }

    throw error;
  }
};

const getParamListHandler: SyntheticsRouteHandler<ParamResponse[]> = async (routeContext) =>
  withSpaceNotFound(routeContext, async () =>
    (await canReadDecryptedParams(routeContext))
      ? getDecryptedParamList(routeContext)
      : findAllParams(routeContext)
  );

const getParamHandler: SyntheticsRouteHandler<ParamResponse, { id: string }> = async (
  routeContext
) =>
  withSpaceNotFound(routeContext, async () => {
    const { id } = routeContext.request.params;

    if (await canReadDecryptedParams(routeContext)) {
      return getDecryptedParam(routeContext, id);
    }
    const savedObject = await routeContext.savedObjectsClient.get<SyntheticsParamsReadonly>(
      syntheticsParamType,
      id
    );
    return toClientResponse(savedObject);
  });

export const getSyntheticsParamsRoute: SyntheticsRestApiRouteFactory<ParamResponse[]> = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.PARAMS,
  validate: {},
  handler: getParamListHandler,
});

const RequestParamsSchema = z.strictObject({
  id: routeId,
});

export const getSyntheticsParamRoute: SyntheticsRestApiRouteFactory<
  ParamResponse,
  z.infer<typeof RequestParamsSchema>
> = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.PARAMS + '/{id}',
  validate: {},
  validation: {
    request: {
      params: RequestParamsSchema,
    },
  },
  handler: getParamHandler,
});

const canReadDecryptedParams = async (routeContext: RouteContext) => {
  const { request, server } = routeContext;

  const capabilities = await server.coreStart.capabilities.resolveCapabilities(request, {
    capabilityPath: 'uptime.*',
  });

  return capabilities.uptime?.canReadParamValues ?? false;
};

const getDecryptedParam = async ({ server, spaceId }: RouteContext, paramId: string) => {
  const encryptedSavedObjectsClient = server.encryptedSavedObjects.getClient();
  const savedObject =
    await encryptedSavedObjectsClient.getDecryptedAsInternalUser<SyntheticsParams>(
      syntheticsParamType,
      paramId,
      { namespace: spaceId }
    );
  return toClientResponse(savedObject);
};

const getDecryptedParamList = async ({ server, spaceId }: RouteContext) => {
  const encryptedSavedObjectsClient = server.encryptedSavedObjects.getClient();
  const finder =
    await encryptedSavedObjectsClient.createPointInTimeFinderDecryptedAsInternalUser<SyntheticsParams>(
      {
        type: syntheticsParamType,
        perPage: 1000,
        namespaces: [spaceId],
      }
    );

  const hits: ParamResponse[] = [];
  for await (const result of finder.find()) {
    hits.push(...result.saved_objects.map(toClientResponse));
  }

  finder.close().catch(() => {});

  return hits;
};

const findAllParams = async ({ savedObjectsClient }: RouteContext) => {
  const finder = savedObjectsClient.createPointInTimeFinder<SyntheticsParams>({
    type: syntheticsParamType,
    perPage: 1000,
  });

  const hits: Array<ReturnType<typeof toClientResponse>> = [];
  for await (const result of finder.find()) {
    hits.push(...result.saved_objects.map(toClientResponse));
  }

  finder.close().catch(() => {});

  return hits;
};

const toClientResponse = (
  savedObject: SavedObject<SyntheticsParams | SyntheticsParamsReadonly>
) => {
  const { id, attributes, namespaces } = savedObject;
  return {
    ...attributes,
    id,
    namespaces,
  };
};
