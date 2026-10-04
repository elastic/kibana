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

type ParamsResponse =
  | SyntheticsParams[]
  | SyntheticsParamsReadonly[]
  | SyntheticsParams
  | SyntheticsParamsReadonly;

const getParamsHandler: SyntheticsRouteHandler<ParamsResponse, { id?: string }> = async (
  routeContext
) => {
  const { savedObjectsClient, request, response, spaceId } = routeContext;
  try {
    const { id: paramId } = request.params;

    if (await canReadDecryptedParams(routeContext)) {
      return getDecryptedParams(routeContext, paramId);
    } else {
      if (paramId) {
        const savedObject = await savedObjectsClient.get<SyntheticsParamsReadonly>(
          syntheticsParamType,
          paramId
        );
        return toClientResponse(savedObject);
      }

      return findAllParams(routeContext);
    }
  } catch (error) {
    if (error.output?.statusCode === 404) {
      return response.notFound({ body: { message: `Kibana space '${spaceId}' does not exist` } });
    }

    throw error;
  }
};

export const getSyntheticsParamsRoute: SyntheticsRestApiRouteFactory<ParamsResponse> = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.PARAMS,
  validate: {},
  handler: getParamsHandler,
});

const RequestParamsSchema = z.strictObject({
  id: routeId,
});

export const getSyntheticsParamRoute: SyntheticsRestApiRouteFactory<
  ParamsResponse,
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
  handler: getParamsHandler,
});

const canReadDecryptedParams = async (routeContext: RouteContext) => {
  const { request, server } = routeContext;

  const capabilities = await server.coreStart.capabilities.resolveCapabilities(request, {
    capabilityPath: 'uptime.*',
  });

  return capabilities.uptime?.canReadParamValues ?? false;
};

const getDecryptedParams = async ({ server, spaceId }: RouteContext, paramId?: string) => {
  const encryptedSavedObjectsClient = server.encryptedSavedObjects.getClient();

  if (paramId) {
    const savedObject =
      await encryptedSavedObjectsClient.getDecryptedAsInternalUser<SyntheticsParams>(
        syntheticsParamType,
        paramId,
        { namespace: spaceId }
      );
    return toClientResponse(savedObject);
  }
  const finder =
    await encryptedSavedObjectsClient.createPointInTimeFinderDecryptedAsInternalUser<SyntheticsParams>(
      {
        type: syntheticsParamType,
        perPage: 1000,
        namespaces: [spaceId],
      }
    );

  const hits: Array<ReturnType<typeof toClientResponse>> = [];
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
