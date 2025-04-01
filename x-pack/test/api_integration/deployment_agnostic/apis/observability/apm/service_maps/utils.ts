/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APIReturnType } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { GroupResourceNodesResponse } from '@kbn/apm-plugin/common/service_map';
import { ServiceMapSpan } from '@kbn/apm-plugin/common/service_map/types';

export function getElements({ body }: { body: APIReturnType<'GET /internal/apm/service-map'> }) {
  if ('elements' in body) {
    return body.elements;
  }

  return [];
}

export function getSpans({ body }: { body: APIReturnType<'GET /internal/apm/service-map'> }) {
  if ('spans' in body) {
    return body.spans;
  }

  return [];
}

export type ConnectionElements = GroupResourceNodesResponse['elements'];

export function partitionElements(elements: ConnectionElements) {
  const edges = elements.filter(({ data }) => 'source' in data && 'target' in data);
  const nodes = elements.filter((element) => !edges.includes(element));
  return { edges, nodes };
}

export function getIds(elements: ConnectionElements) {
  return elements.map(({ data }) => data.id).sort();
}

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
