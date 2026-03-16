/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useKibana } from '../../../../common/lib/kibana';

export interface CorrelationTypeRecommendation {
  type: 'temporal' | 'temporal_ordered' | 'event_count' | 'value_count';
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

interface RecommendationStats {
  alertCountPerRule: Record<string, number>;
  groupByCardinality: Record<string, number>;
  avgTimeBetweenAlerts: number | null;
}

export interface CorrelationTypeRecommendationWithStats extends CorrelationTypeRecommendation {
  stats?: RecommendationStats;
}

interface UseCorrelationTypeRecommendationProps {
  selectedRules: string[];
  groupByFields: string[];
  currentType: string;
  timespan?: string;
}

const DEBOUNCE_MS = 500;
const API_URL = '/internal/security_solution/correlation/recommend_type';
const API_VERSION = '1';

const NETWORK_FIELD_PATTERNS = ['ip', 'port', 'domain'];
const ENTITY_FIELD_PATTERNS = ['user', 'host'];

const hasFieldMatch = (fields: string[], patterns: string[]): boolean =>
  fields.some((field) => patterns.some((pattern) => field.includes(pattern)));

export const getClientSideFallback = (
  selectedRules: string[],
  groupByFields: string[]
): CorrelationTypeRecommendation | undefined => {
  if (selectedRules.length === 0) {
    return undefined;
  }

  if (selectedRules.length === 1) {
    if (hasFieldMatch(groupByFields, NETWORK_FIELD_PATTERNS)) {
      return {
        type: 'value_count',
        confidence: 'medium',
        reason:
          'Single rule with network fields suggests detecting breadth of impact (e.g., port scanning, credential stuffing)',
      };
    }
    return {
      type: 'event_count',
      confidence: 'medium',
      reason: 'Single rule suggests detecting volume spikes (e.g., brute force, spray attacks)',
    };
  }

  if (selectedRules.length >= 3) {
    return {
      type: 'temporal_ordered',
      confidence: 'high',
      reason:
        'Multiple rules suggest detecting an attack chain where stage ordering matters (e.g., recon → exploit → persist)',
    };
  }

  if (hasFieldMatch(groupByFields, ENTITY_FIELD_PATTERNS)) {
    return {
      type: 'temporal',
      confidence: 'high',
      reason:
        'Two rules with entity fields suggest detecting signal convergence on the same user/host',
    };
  }

  return {
    type: 'temporal',
    confidence: 'low',
    reason:
      'Two rules suggest temporal correlation — consider adding entity fields to group-by for higher precision',
  };
};

export const useCorrelationTypeRecommendation = ({
  selectedRules,
  groupByFields,
  currentType,
  timespan = '5m',
}: UseCorrelationTypeRecommendationProps): {
  recommendation: CorrelationTypeRecommendationWithStats | undefined;
  isLoading: boolean;
} => {
  const { http } = useKibana().services;
  const [recommendation, setRecommendation] = useState<
    CorrelationTypeRecommendationWithStats | undefined
  >();
  const [isLoading, setIsLoading] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);

  const rulesKey = useMemo(() => selectedRules.join(','), [selectedRules]);
  const fieldsKey = useMemo(() => groupByFields.join(','), [groupByFields]);

  const fetchRecommendation = useCallback(async () => {
    if (selectedRules.length === 0) {
      setRecommendation(undefined);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const result = await http.post<CorrelationTypeRecommendationWithStats>(API_URL, {
        version: API_VERSION,
        body: JSON.stringify({
          rules: selectedRules,
          groupByFields,
          timespan,
        }),
      });

      if (!cancelledRef.current) {
        setRecommendation(result);
      }
    } catch (_e) {
      if (!cancelledRef.current) {
        const fallback = getClientSideFallback(selectedRules, groupByFields);
        setRecommendation(fallback);
      }
    } finally {
      if (!cancelledRef.current) {
        setIsLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http, rulesKey, fieldsKey, timespan]);

  useEffect(() => {
    cancelledRef.current = false;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (selectedRules.length === 0) {
      setRecommendation(undefined);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    debounceTimerRef.current = setTimeout(() => {
      fetchRecommendation();
    }, DEBOUNCE_MS);

    return () => {
      cancelledRef.current = true;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchRecommendation, rulesKey]);

  return { recommendation, isLoading };
};
