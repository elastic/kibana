/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback } from 'react';
import { SYNTHETICS_API_URLS } from '../../../../../../../common/constants';
import { apiService } from '../../../../../../utils/api_service/api_service';

export interface PolicySizeData {
  locationId: string;
  agentPolicyId: string;
  policySizeBytes: number;
  policySizeFormatted: string;
  inputCount: number;
  defaultMaxCheckinBytes: number;
  defaultMaxCheckinFormatted: string;
  exceedsDefault: boolean;
  utilizationPercent: number;
}

export const usePolicySize = () => {
  const [data, setData] = useState<PolicySizeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchPolicySize = useCallback(async (locationId: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiService.get<PolicySizeData>(
        SYNTHETICS_API_URLS.PRIVATE_LOCATIONS_POLICY_SIZE.replace('{locationId}', locationId)
      );
      setData(result);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, fetchPolicySize };
};
