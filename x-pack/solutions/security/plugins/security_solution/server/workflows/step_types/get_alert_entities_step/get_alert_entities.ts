/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { asSpaceId } from '@kbn/core-spaces-common';
import { isNotFoundError } from '@kbn/es-errors';
import { DEFAULT_ALERTS_INDEX } from '../../../../common/constants';
import { boundAlertEntities } from './bound_alert_entities';
import { buildEntityAggs } from './build_entity_aggs';
import { parseEntityAggs } from './parse_entity_aggs';
import type { AlertEntityType } from './types';

const NO_ENTITIES = { entities: [], total: 0, truncated: false };

/**
 * Resolves the entities a set of detection alerts are about, as Entity Store ids with display
 * names. The alerts index is always the one for `spaceId`, which the caller resolves from the
 * execution (see `resolveSpaceId`), and which is validated here so that a wildcard or a comma
 * cannot widen the search to other spaces' alerts.
 */
export const getAlertEntities = async ({
  abortSignal,
  alertIds,
  entityTypes,
  esClient,
  maxEntities,
  spaceId,
}: {
  abortSignal?: AbortSignal;
  alertIds: string[];
  entityTypes: readonly AlertEntityType[];
  esClient: ElasticsearchClient;
  maxEntities: number;
  spaceId: string;
}) => {
  const index = `${DEFAULT_ALERTS_INDEX}-${asSpaceId(spaceId)}`;
  const { aggs, runtime_mappings: runtimeMappings } = buildEntityAggs({
    entityTypes,
    maxEntities,
  });

  // No `ignore_unavailable`: it would turn an alerts index the principal may not read into an
  // empty result. Only a space with no alerts index at all reads as having no entities.
  const response = await esClient
    .search(
      {
        aggs,
        expand_wildcards: ['open', 'hidden'],
        index,
        query: { ids: { values: alertIds } },
        runtime_mappings: runtimeMappings,
        size: 0,
      },
      { signal: abortSignal }
    )
    .catch((error: unknown) => {
      if (isNotFoundError(error)) {
        return undefined;
      }

      throw error;
    });

  if (response == null) {
    return NO_ENTITIES;
  }

  return boundAlertEntities({
    found: entityTypes.map((entityType) =>
      parseEntityAggs({
        aggregations: response.aggregations as Parameters<
          typeof parseEntityAggs
        >[0]['aggregations'],
        entityType,
      })
    ),
    maxEntities,
  });
};
