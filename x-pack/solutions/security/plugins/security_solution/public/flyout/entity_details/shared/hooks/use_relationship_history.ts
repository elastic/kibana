/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from '../../../../common/lib/kibana';
import { API_VERSIONS } from '../../../../../common/entity_analytics/constants';

export interface RelationshipHistorySummary {
  entity_id: string;
  rel_type: string;
  target_euid: string;
  first_seen: string;
  last_seen: string;
  seen_count: number;
}

export type RelationshipHistoryByType = Record<string, RelationshipHistorySummary[]>;

interface RelationshipHistoryResponse {
  records: RelationshipHistorySummary[];
}

export const useRelationshipHistory = (entityId: string | undefined) => {
  const { http } = useKibana().services;

  return useQuery({
    queryKey: ['relationship-history', entityId],
    enabled: !!entityId,
    queryFn: async (): Promise<RelationshipHistoryByType> => {
      const response = await http.fetch<RelationshipHistoryResponse>(
        `/api/entity_store/entities/${encodeURIComponent(entityId!)}/relationship_history`,
        { version: API_VERSIONS.public.v1, method: 'GET' }
      );
      const grouped: RelationshipHistoryByType = {};
      for (const record of response.records) {
        if (!grouped[record.rel_type]) {
          grouped[record.rel_type] = [];
        }
        grouped[record.rel_type].push(record);
      }
      return grouped;
    },
  });
};
