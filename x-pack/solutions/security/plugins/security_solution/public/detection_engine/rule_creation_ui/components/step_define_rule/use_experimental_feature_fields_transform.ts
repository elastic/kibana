/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { DefineStepRule } from '../../../../detections/pages/detection_engine/rules/types';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { isEqlRule, isEqlSequenceQuery } from '../../../../../common/detection_engine/utils';
import {
  ALERT_SUPPRESSION_FIELDS_FIELD_NAME,
  ALERT_SUPPRESSION_DURATION_TYPE_FIELD_NAME,
  ALERT_SUPPRESSION_DURATION_FIELD_NAME,
  ALERT_SUPPRESSION_MISSING_FIELDS_FIELD_NAME,
} from '../../../rule_creation/components/alert_suppression_edit';

/**
 * transforms  DefineStepRule fields according to experimental feature flags
 */
export const useExperimentalFeatureFieldsTransform = <T extends Partial<DefineStepRule>>(): ((
  fields: T
) => T) => {
  const isAlertSuppressionForSequenceEqlRuleEnabled = useIsExperimentalFeatureEnabled(
    'alertSuppressionForSequenceEqlRuleEnabled'
  );
  const transformer = useCallback(
    (fields: T) => {
      const isSuppressionDisabled =
        isEqlRule(fields.ruleType) &&
        isEqlSequenceQuery(fields.queryBar?.query?.query as string) &&
        !isAlertSuppressionForSequenceEqlRuleEnabled;

      // reset any alert suppression values hidden behind feature flag
      if (isSuppressionDisabled) {
        return {
          ...fields,
          [ALERT_SUPPRESSION_FIELDS_FIELD_NAME]: [],
          [ALERT_SUPPRESSION_DURATION_TYPE_FIELD_NAME]: undefined,
          [ALERT_SUPPRESSION_DURATION_FIELD_NAME]: undefined,
          [ALERT_SUPPRESSION_MISSING_FIELDS_FIELD_NAME]: undefined,
        };
      }
      return fields;
    },
    [isAlertSuppressionForSequenceEqlRuleEnabled]
  );

  return transformer;
};
