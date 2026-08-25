/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';
import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import { isSuppressibleAlertRule } from '../../../../common/detection_engine/utils';

export interface UseAlertSuppressionReturn {
  isSuppressionEnabled: boolean;
}

export const useAlertSuppression = (ruleType: Type | undefined): UseAlertSuppressionReturn => {
  const isSuppressionEnabledForRuleType = useCallback(() => {
    if (!ruleType) {
      return false;
    }

    return isSuppressibleAlertRule(ruleType);
  }, [ruleType]);

  return {
    isSuppressionEnabled: isSuppressionEnabledForRuleType(),
  };
};
