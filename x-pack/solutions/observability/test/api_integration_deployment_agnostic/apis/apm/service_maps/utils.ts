/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GroupResourceNodesResponse } from '@kbn/apm-plugin/common/service_map';
import type { ServiceMapSpan } from '@kbn/apm-plugin/common/service_map/types';

export type ConnectionElements = GroupResourceNodesResponse['elements'];

export function extractExitSpansConnections(spans: ServiceMapSpan[]) {
  return spans.map((span) => {
    const { serviceName, spanDestinationServiceResource, destinationService } = span;
    return {
      serviceName,
      spanDestinationServiceResource,
      ...(destinationService
        ? {
            destinationService: {
              serviceName: destinationService.serviceName,
            },
          }
        : undefined),
    };
  });
}
