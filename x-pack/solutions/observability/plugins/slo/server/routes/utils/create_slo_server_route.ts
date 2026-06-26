/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createServerRouteFactory } from '@kbn/server-route-repository';
import type { Boom } from '@hapi/boom';
import { forbidden, notFound, conflict, badRequest } from '@hapi/boom';
import { addSpanLabels } from '@kbn/apm-utils';
import type { CreateServerRouteFactory } from '@kbn/server-route-repository-utils/src/typings';
import { inspectableEsQueriesMap } from '../../lib/inspect/inspectable_es_queries_map';
import type { SLORouteHandlerResources } from './types';
import {
  SLOError,
  SLONotFound,
  SLOIdConflict,
  SecurityException,
  SLOTemplateNotFound,
} from '../../errors';

function handleSLOError(error: SLOError): Boom {
  if (error instanceof SLONotFound) {
    return notFound(error.message);
  }

  if (error instanceof SLOTemplateNotFound) {
    return notFound(error.message);
  }

  if (error instanceof SLOIdConflict) {
    return conflict(error.message);
  }

  if (error instanceof SecurityException) {
    return forbidden(error.message);
  }

  return badRequest(error.message);
}

const createPlainSloServerRoute = createServerRouteFactory<SLORouteHandlerResources>();

export const createSloServerRoute: CreateServerRouteFactory<
  SLORouteHandlerResources,
  undefined
> = ({ handler, ...config }) => {
  return createPlainSloServerRoute({
    ...config,
    handler: async (options) => {
      addSpanLabels({ plugin: 'slo' });
      const { request } = options;
      inspectableEsQueriesMap.set(request, []);

      try {
        const result = await handler(options);

        const inspectData = inspectableEsQueriesMap.get(request);
        if (inspectData && inspectData.length > 0 && result && typeof result === 'object') {
          if (Array.isArray(result)) {
            return { _wrapped: result, _inspect: inspectData } as unknown as typeof result;
          }
          return {
            ...(result as Record<string, unknown>),
            _inspect: inspectData,
          } as unknown as typeof result;
        }

        return result;
      } catch (error) {
        if (error instanceof SLOError) {
          throw handleSLOError(error);
        }
        throw error;
      } finally {
        inspectableEsQueriesMap.delete(request);
      }
    },
  });
};
