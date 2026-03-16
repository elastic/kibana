/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

export interface CorrelationTypeRecommendation {
  type: 'temporal' | 'temporal_ordered' | 'event_count' | 'value_count';
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

interface UseCorrelationTypeRecommendationProps {
  selectedRules: string[];
  groupByFields: string[];
  currentType: string;
}

const NETWORK_FIELD_PATTERNS = ['ip', 'port', 'domain'];
const ENTITY_FIELD_PATTERNS = ['user', 'host'];

const hasFieldMatch = (fields: string[], patterns: string[]): boolean =>
  fields.some((field) => patterns.some((pattern) => field.includes(pattern)));

/**
 * Heuristic-based recommendation engine that analyzes the selected rules and
 * group-by fields to suggest the most appropriate correlation type. The
 * heuristics are derived from common security analytics patterns (kill chains,
 * brute force, lateral movement, etc.).
 */
export const useCorrelationTypeRecommendation = ({
  selectedRules,
  groupByFields,
  currentType,
}: UseCorrelationTypeRecommendationProps): CorrelationTypeRecommendation | undefined => {
  return useMemo(() => {
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
  }, [selectedRules, groupByFields]);
};
