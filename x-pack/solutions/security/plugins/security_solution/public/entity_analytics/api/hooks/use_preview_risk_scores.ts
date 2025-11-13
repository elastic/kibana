/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery } from '@kbn/react-query';
import dateMath from '@kbn/datemath';
import type { RiskScoresPreviewRequest } from '../../../../common/api/entity_analytics/risk_engine/preview_route.gen';
import { useEntityAnalyticsRoutes } from '../api';

export type UseRiskScorePreviewParams = Omit<RiskScoresPreviewRequest, 'data_view_id'> & {
  data_view_id?: RiskScoresPreviewRequest['data_view_id'];
};

export const useRiskScorePreview = ({
  data_view_id: dataViewId,
  range,
  filter,
  exclude_alert_statuses: excludeAlertStatuses,
  filters,
  ...otherParams
}: UseRiskScorePreviewParams) => {
  const { fetchRiskScorePreview } = useEntityAnalyticsRoutes();
  const serializedOtherParams = otherParams ? JSON.stringify(otherParams) : null;

  return useQuery(
    [
      'POST',
      'FETCH_PREVIEW_RISK_SCORE',
      range,
      filter,
      excludeAlertStatuses,
      filters,
      serializedOtherParams,
    ],
    async ({ signal }) => {
      if (!dataViewId) {
        return;
      }

      const params: RiskScoresPreviewRequest = {
        data_view_id: dataViewId,
        ...otherParams,
      };
      if (range) {
        const startTime = dateMath.parse(range.start)?.utc().toISOString();
        const endTime = dateMath
          .parse(range.end, {
            roundUp: true,
          })
          ?.utc()
          .toISOString();

        if (startTime && endTime) {
          params.range = {
            start: startTime,
            end: endTime,
          };
        }
      }

      if (filter) {
        params.filter = filter;
      }

      if (excludeAlertStatuses) {
        params.exclude_alert_statuses = excludeAlertStatuses;
      }

      if (filters && filters.length > 0) {
        params.filters = filters;
      }

      const response = await fetchRiskScorePreview({ signal, params });

      return response;
    },
    { enabled: !!dataViewId }
  );
};
