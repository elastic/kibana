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
  const { nightshiftInvestigations } = useKibana().services;
  const { data } = useQuery({
    queryKey: ['investigationAvailability'],
    queryFn: ({ signal }) => {
      if (!nightshiftInvestigations) {
        return { available: false };
      }
      return nightshiftInvestigations.investigationsClient.fetch(
        'GET /internal/nightshift/investigations/availability',
        { signal: signal ?? null }
      );
    },
    context: skipAlertsQueryContext ? undefined : AlertsQueryContext,
    enabled: enabled && Boolean(nightshiftInvestigations),
    retry: false,
    staleTime: Infinity,
  });

  return data?.available === true;
};
