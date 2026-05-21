/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { IndexDocCount } from '@kbn/siem-readiness';
import { GET_SIEM_READINESS_MITRE_DATA_INDICES_DOCS_COUNT_API_PATH } from '@kbn/siem-readiness';

interface IndicesDocCountsResponse {
  indices: IndexDocCount[];
}

export const useMitreAttackIndicesDocCounts = (ruleIndices: string[] = []) => {
  const { http } = useKibana<CoreStart>().services;

  return useQuery(
    ['indicesDocCounts', ruleIndices],
    async (): Promise<IndexDocCount[]> => {
      if (!ruleIndices.length) return [];

      const response = await http.post<IndicesDocCountsResponse>(
        GET_SIEM_READINESS_MITRE_DATA_INDICES_DOCS_COUNT_API_PATH,
        {
          body: JSON.stringify({ indices: ruleIndices }),
        }
      );

      return response.indices;
    },
    {
      enabled: ruleIndices.length > 0,
    }
  );
};
