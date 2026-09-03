/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { AlertsQueryContext } from '@kbn/alerts-ui-shared/src/common/contexts/alerts_query_context';
import { useKibana } from '../utils/kibana_react';

export const useInvestigationAvailability = ({
  enabled,
  skipAlertsQueryContext = false,
}: {
  enabled: boolean;
  skipAlertsQueryContext?: boolean;
}): boolean => {
  const { http } = useKibana().services;
  const { data } = useQuery({
    queryKey: ['investigationAvailability', http.basePath.get?.() ?? ''],
    queryFn: ({ signal }) =>
      http.get<{ available: boolean }>(
        '/internal/observability/alerts/investigation/availability',
        { signal }
      ),
    context: skipAlertsQueryContext ? undefined : AlertsQueryContext,
    enabled,
    retry: false,
    staleTime: 30_000,
  });

  return data?.available === true;
};
