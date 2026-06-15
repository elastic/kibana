/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback } from 'react';
import type { CorrelationFindings } from '../../../../../common/threat_intelligence/correlation';
import { CORRELATE_THREAT_API_PATH } from '../../../../../common/threat_intelligence/hub';
import { useKibana } from '../../../../common/lib/kibana';

export interface UseCorrelationFindingsState {
  loading: boolean;
  data: CorrelationFindings | null;
  error: string | null;
  correlate: (reportId: string) => Promise<void>;
}

export const useCorrelationFindings = (): UseCorrelationFindingsState => {
  const { http } = useKibana().services;
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CorrelationFindings | null>(null);
  const [error, setError] = useState<string | null>(null);

  const correlate = useCallback(
    async (reportId: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await http.post<CorrelationFindings>(CORRELATE_THREAT_API_PATH, {
          version: '2023-10-31',
          body: JSON.stringify({ report_id: reportId }),
        });
        setData(result);
      } catch (err) {
        const msg =
          (err as { body?: { message?: string }; message?: string }).body?.message ??
          (err as Error).message ??
          'Unknown error';
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [http]
  );

  return { loading, data, error, correlate };
};
