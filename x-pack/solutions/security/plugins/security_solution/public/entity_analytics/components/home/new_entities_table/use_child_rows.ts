/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef, useState } from 'react';
import { useKibana } from '../../../../common/lib/kibana';
import { ENTITY_GRID_INTERNAL_URL } from '../../../../../common/entity_analytics/entity_analytics/constants';
import { buildResolutionFilter } from './resolution_helpers';
import type { EntityGridResponse, TimeRange } from './constants';

export const useChildRows = () => {
  const { http } = useKibana().services;
  const fetchingRef = useRef<Set<string>>(new Set());
  const childMapRef = useRef<Map<string, Array<Record<string, unknown>>>>(new Map());
  const [childMap, setChildMap] = useState<Map<string, Array<Record<string, unknown>>>>(new Map());

  const fetchChildren = useCallback(
    async (entityId: string, timeRange: TimeRange) => {
      if (childMapRef.current.has(entityId) || fetchingRef.current.has(entityId)) return;
      fetchingRef.current.add(entityId);
      try {
        const result = await http.post<EntityGridResponse>(ENTITY_GRID_INTERNAL_URL, {
          version: '1',
          body: JSON.stringify({
            sort: { field: 'entity.risk.calculated_score_norm', direction: 'desc' },
            page_size: 100,
            time_range: timeRange,
            view: 'raw',
            filter: buildResolutionFilter(entityId),
          }),
        });
        const next = new Map([...childMapRef.current, [entityId, result.entities]]);
        childMapRef.current = next;
        setChildMap(next);
      } catch {
        // silently ignore; user can retry by collapsing and re-expanding
      } finally {
        fetchingRef.current.delete(entityId);
      }
    },
    [http]
  );

  const resetChildren = useCallback(() => {
    childMapRef.current = new Map();
    setChildMap(new Map());
  }, []);

  return { childMap, fetchChildren, resetChildren };
};
