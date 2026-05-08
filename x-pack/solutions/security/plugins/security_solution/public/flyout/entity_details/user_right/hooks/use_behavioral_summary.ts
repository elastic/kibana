/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { BehavioralSummaryResponse } from '../../../../../common/api/entity_analytics';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';

const BEHAVIORAL_SUMMARY_QUERY_KEY = 'behavioral_summary';

export const useBehavioralSummary = (entityId?: string) => {
  const { http } = useKibana().services;

  return useQuery(
    [BEHAVIORAL_SUMMARY_QUERY_KEY, entityId],
    async ({ signal }) => {
      const encodedId = encodeURIComponent(entityId!);
      return http.fetch<BehavioralSummaryResponse>(
        `/internal/entity_analytics/entities/${encodedId}/behavioral_summary`,
        { version: '1', signal }
      );
    },
    { enabled: !!entityId }
  );
};
