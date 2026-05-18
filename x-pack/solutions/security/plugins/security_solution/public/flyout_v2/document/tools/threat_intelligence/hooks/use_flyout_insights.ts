/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { FlyoutInsightsResponse } from '../../../../../../common/threat_intelligence/hub';
import { FLYOUT_INSIGHTS_API_PATH } from '../../../../../../common/threat_intelligence/hub';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import { useKibana } from '../../../../../common/lib/kibana';
import {
  buildFlyoutInsightsRequest,
  isSecurityAlert,
} from '../utils/flyout_insights_alert_fields';

export interface UseFlyoutInsightsParams {
  hit: DataTableRecord;
}

export interface UseFlyoutInsightsResult {
  enabled: boolean;
  loading: boolean;
  error: string | undefined;
  data: FlyoutInsightsResponse | undefined;
  refetch: () => void;
}

export const useFlyoutInsights = ({ hit }: UseFlyoutInsightsParams): UseFlyoutInsightsResult => {
  const skillEnabled = useIsExperimentalFeatureEnabled('threatIntelligenceSkillEnabled');
  const { http } = useKibana().services;
  const isAlert = isSecurityAlert(hit);

  const requestBody = useMemo(() => buildFlyoutInsightsRequest(hit), [hit]);

  const requestKey = useMemo(
    () =>
      JSON.stringify({
        alert_id: requestBody.alert_id,
        indicator_reference: requestBody.indicator_reference,
        technique_ids: requestBody.technique_ids,
      }),
    [requestBody]
  );

  const enabled = skillEnabled && isAlert;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [data, setData] = useState<FlyoutInsightsResponse | undefined>();

  const fetchInsights = useCallback(async () => {
    if (!enabled) {
      return;
    }

    setLoading(true);
    setError(undefined);

    try {
      const response = await http.post<FlyoutInsightsResponse>(FLYOUT_INSIGHTS_API_PATH, {
        version: '2023-10-31',
        body: JSON.stringify(requestBody),
      });
      setData(response);
    } catch (err) {
      const message =
        err?.body?.message ?? err?.message ?? 'Failed to load related threat reports';
      setError(message);
      setData(undefined);
    } finally {
      setLoading(false);
    }
  }, [enabled, http, requestBody]);

  useEffect(() => {
    if (!enabled) {
      setData(undefined);
      setError(undefined);
      setLoading(false);
      return;
    }
    void fetchInsights();
  }, [enabled, fetchInsights, requestKey]);

  return {
    enabled,
    loading,
    error,
    data,
    refetch: fetchInsights,
  };
};
