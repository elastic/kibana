/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback } from 'react';
import { SYNTHETICS_API_URLS } from '../../../../../../../common/constants';
import { apiService } from '../../../../../../utils/api_service/api_service';

export interface LocationDiagnostic {
  locationId: string;
  locationName: string;
  agentPolicyId: string;
  policySizeBytes: number;
  policySizeFormatted: string;
  inputCount: number;
  defaultMaxCheckinBytes: number;
  defaultMaxCheckinFormatted: string;
  exceedsDefault: boolean;
  utilizationPercent: number;
  error?: string;
}

export interface AllPolicySizesData {
  locations: LocationDiagnostic[];
  totalLocations: number;
  locationsWithIssues: number;
}

export const useAllPolicySizes = () => {
  const [data, setData] = useState<AllPolicySizesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchAllPolicySizes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiService.get<AllPolicySizesData>(
        SYNTHETICS_API_URLS.PRIVATE_LOCATIONS_DIAGNOSTICS
      );
      setData(result);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, fetchAllPolicySizes };
};
