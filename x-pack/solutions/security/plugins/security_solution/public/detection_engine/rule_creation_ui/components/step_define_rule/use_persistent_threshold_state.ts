/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import usePrevious from 'react-use/lib/usePrevious';
import { isThresholdRule } from '../../../../../common/detection_engine/utils';
import type { FormHook } from '../../../../shared_imports';
import { useFormData } from '../../../../shared_imports';
import { type DefineStepRule } from '../../../../detections/pages/detection_engine/rules/types';
import type { FieldValueThreshold } from '../threshold_input';

interface LastThresholdState {
  threshold: FieldValueThreshold;
}

interface UsePersistentThresholdStateParams {
  form: FormHook<DefineStepRule>;
  ruleTypePath: string;
  thresholdPath: string;
}

export function usePersistentThresholdState({
  form,
  ruleTypePath,
  thresholdPath,
}: UsePersistentThresholdStateParams): void {
  const lastThresholdState = useRef<LastThresholdState | undefined>();
  const [formData] = useFormData({ form });

  const { [ruleTypePath]: ruleType, [thresholdPath]: threshold } = formData;
  const previousRuleType = usePrevious(ruleType);

  useEffect(() => {
    if (
      isThresholdRule(ruleType) &&
      !isThresholdRule(previousRuleType) &&
      lastThresholdState.current
    ) {
      form.updateFieldValues({
        [thresholdPath]: lastThresholdState.current.threshold,
      });

      return;
    }

    if (isThresholdRule(ruleType)) {
      lastThresholdState.current = { threshold };
    }
  }, [form, ruleType, previousRuleType, threshold, thresholdPath]);
}
