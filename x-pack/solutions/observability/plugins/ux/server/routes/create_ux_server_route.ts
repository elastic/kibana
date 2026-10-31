/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { enableInspectEsQueries } from '@kbn/observability-plugin/common';
import { createServerRouteFactory } from '@kbn/server-route-repository';
import type { CreateServerRouteFactory } from '@kbn/server-route-repository-utils/src/typings';
import { inspectableEsQueriesMap, isUxInspectDev } from '../lib/inspect/inspectable_es_queries_map';
import type { UxRouteHandlerResources } from './types';

const createPlainUxServerRoute = createServerRouteFactory<UxRouteHandlerResources>();

const shouldInspect = async (context: UxRouteHandlerResources['context']): Promise<boolean> => {
  if (isUxInspectDev()) {
    return true;
  }
  try {
    const { uiSettings } = await context.core;
    return Boolean(await uiSettings.client.get<boolean>(enableInspectEsQueries));
  } catch {
    return false;
  }
};

const attachInspect = <T>(result: T, inspectData: unknown[] | undefined): T => {
  if (!inspectData || inspectData.length === 0 || result == null || typeof result !== 'object') {
    return result;
  }
  if (Array.isArray(result)) {
    return { _wrapped: result, _inspect: inspectData } as unknown as T;
  }
  const record = result as Record<string, unknown>;
  if (Array.isArray(record._inspect) && record._inspect.length > 0) {
    return result;
  }
  return { ...record, _inspect: inspectData } as T;
};

export const createUxServerRoute: CreateServerRouteFactory<UxRouteHandlerResources, undefined> = ({
  handler,
  ...config
}) => {
  return createPlainUxServerRoute({
    ...config,
    handler: async (options) => {
      const { request, context } = options;
      const existed = inspectableEsQueriesMap.has(request);
      if (!existed && (await shouldInspect(context))) {
        inspectableEsQueriesMap.set(request, []);
      }

      try {
        const result = await handler(options);
        if (existed) {
          return result;
        }
        return attachInspect(result, inspectableEsQueriesMap.get(request));
      } finally {
        if (!existed) {
          inspectableEsQueriesMap.delete(request);
        }
      }
    },
  });
};
