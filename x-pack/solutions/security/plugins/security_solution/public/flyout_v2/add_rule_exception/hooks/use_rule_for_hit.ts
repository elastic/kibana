/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { ALERT_RULE_PARAMETERS, ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import type { Rule } from '../../../detection_engine/rule_management/logic/types';
import { useRuleWithFallback } from '../../../detection_engine/rule_management/logic/use_rule_with_fallback';

export interface UseRuleForHitResult {
  rules: Rule[] | null;
  ruleIndices: string[] | undefined;
  ruleDataViewId: string | undefined;
  loading: boolean;
}

const toStringArray = (value: unknown): string[] | undefined => {
  if (value == null) return undefined;
  return Array.isArray(value) ? (value as string[]) : [String(value)];
};

/**
 * Resolves rule details and parameters needed by the Add Exception form from a `DataTableRecord`.
 */
export const useRuleForHit = (hit: DataTableRecord): UseRuleForHitResult => {
  const ruleId = useMemo(
    () => (getFieldValue(hit, ALERT_RULE_UUID) as string) ?? '',
    [hit]
  );

  const { rule: maybeRule, loading } = useRuleWithFallback(ruleId);

  const rules: Rule[] | null = useMemo(() => (maybeRule ? [maybeRule] : null), [maybeRule]);

  const ruleIndices = useMemo<string[] | undefined>(() => {
    const fromParams = getFieldValue(hit, `${ALERT_RULE_PARAMETERS}.index`);
    const fromSignal = getFieldValue(hit, 'signal.rule.index');
    return toStringArray(fromParams ?? fromSignal);
  }, [hit]);

  const ruleDataViewId = useMemo<string | undefined>(() => {
    const fromParams = getFieldValue(hit, `${ALERT_RULE_PARAMETERS}.data_view_id`);
    const fromSignal = getFieldValue(hit, 'signal.rule.data_view_id');
    const value = fromParams ?? fromSignal;
    if (value == null) return undefined;
    return Array.isArray(value) ? (value[0] as string) : (value as string);
  }, [hit]);

  return { rules, ruleIndices, ruleDataViewId, loading };
};
