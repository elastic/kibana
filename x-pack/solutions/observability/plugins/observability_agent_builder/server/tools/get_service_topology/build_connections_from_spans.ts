/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_TYPE,
  SPAN_SUBTYPE,
} from '@kbn/apm-types';
import type { ExitSpanSample } from '../../data_registry/data_registry_types';
import type { ConnectionWithKey } from './types';

export const buildConnectionKey = (sourceName: string, dependencyName: string): string =>
  `${sourceName}::${dependencyName}`;

export function buildConnectionsFromSpans(spans: ExitSpanSample[]): ConnectionWithKey[] {
  const connectionMap = new Map<string, ConnectionWithKey>();

  for (const span of spans) {
    const source = { [SERVICE_NAME]: span.serviceName };

    const target = span.destinationService
      ? { [SERVICE_NAME]: span.destinationService.serviceName }
      : {
          [SPAN_DESTINATION_SERVICE_RESOURCE]: span.spanDestinationServiceResource,
          [SPAN_TYPE]: span.spanType,
          [SPAN_SUBTYPE]: span.spanSubtype,
        };

    const sourceName = source[SERVICE_NAME];
    const dependencyName = span.spanDestinationServiceResource;
    const connectionKey = buildConnectionKey(sourceName, dependencyName);

    if (!connectionMap.has(connectionKey)) {
      connectionMap.set(connectionKey, {
        source,
        target,
        metrics: undefined,

        // internal fields, not part of the public API
        _key: connectionKey, // deduplication key
        _sourceName: sourceName,
        _dependencyName: dependencyName,
      });
    }
  }

  return Array.from(connectionMap.values());
}
