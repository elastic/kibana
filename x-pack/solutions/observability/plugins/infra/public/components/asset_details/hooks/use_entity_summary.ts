/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as z from '@kbn/zod';
import {
  EntityDataStreamType,
  BUILT_IN_ENTITY_TYPES,
} from '@kbn/observability-shared-plugin/common';
import { useFetcher } from '../../../hooks/use_fetcher';

const EntityFilterTypeSchema = z.union([
  z.literal(BUILT_IN_ENTITY_TYPES.HOST),
  z.literal(BUILT_IN_ENTITY_TYPES.CONTAINER),
]);
const EntityTypeSchema = z.union([
  z.literal(BUILT_IN_ENTITY_TYPES.HOST_V2),
  z.literal(BUILT_IN_ENTITY_TYPES.CONTAINER_V2),
]);
const EntityDataStreamSchema = z.union([
  z.literal(EntityDataStreamType.METRICS),
  z.literal(EntityDataStreamType.LOGS),
]);

const EntitySummarySchema = z.object({
  entityFilterType: EntityFilterTypeSchema,
  entityType: EntityTypeSchema,
  entityId: z.string(),
  sourceDataStreams: z.array(EntityDataStreamSchema),
});

export type EntitySummary = z.infer<typeof EntitySummarySchema>;

export function useEntitySummary({
  entityType,
  entityId,
  from,
  to,
}: {
  entityType: string;
  entityId: string;
  from: string;
  to: string;
}) {
  const { data, status } = useFetcher(
    async (callApi) => {
      if (!entityType || !entityId) {
        return undefined;
      }

      const response = await callApi(`/api/infra/entities/${entityType}/${entityId}/summary`, {
        method: 'GET',
        query: {
          to,
          from,
        },
      });

      return EntitySummarySchema.parse(response);
    },
    [entityType, entityId, to, from]
  );

  return { dataStreams: data?.sourceDataStreams ?? [], status };
}
