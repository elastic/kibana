/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common/constants';

export function getUrlPrefix(spaceId?: string) {
  return spaceId && spaceId !== DEFAULT_SPACE_ID ? `/s/${spaceId}` : ``;
}

export function getIdPrefix(spaceId?: string) {
  return spaceId === DEFAULT_SPACE_ID ? '' : `${spaceId}-`;
}

export function getTestScenariosForSpace(spaceId: string) {
  const explicitScenario = {
    spaceId,
    urlPrefix: `/s/${spaceId}`,
    scenario: `when referencing the ${spaceId} space explicitly in the URL`,
  };

  if (spaceId === DEFAULT_SPACE_ID) {
    return [
      {
        spaceId,
        urlPrefix: ``,
        scenario: 'when referencing the default space implicitly',
      },
      explicitScenario,
    ];
  }

  return [explicitScenario];
}

export function getAggregatedSpaceData(es: Client, objectTypes: string[]) {
  return es.search({
    index: '.kibana',
    body: {
      size: 0,
      runtime_mappings: {
        normalized_namespace: {
          type: 'keyword',
          script: `
          if (doc["namespaces"].size() > 0) {
            emit(doc["namespaces"].value);
          } else if (doc["namespace"].size() > 0) {
            emit(doc["namespace"].value);
          } else if (doc["legacy-url-alias.targetNamespace"].size() > 0) {
            emit(doc["legacy-url-alias.targetNamespace"].value);
          }
        `,
        },
      },
      query: { terms: { type: objectTypes } },
      aggs: {
        count: {
          terms: { field: 'normalized_namespace', missing: DEFAULT_SPACE_ID, size: 10 },
          aggs: { countByType: { terms: { field: 'type', missing: 'UNKNOWN', size: 10 } } },
        },
      },
    },
  });
}
