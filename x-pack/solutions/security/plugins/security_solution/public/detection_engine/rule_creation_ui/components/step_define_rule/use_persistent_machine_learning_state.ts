/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import usePrevious from 'react-use/lib/usePrevious';
import { isMlRule } from '../../../../../common/detection_engine/utils';
import type { FormHook } from '../../../../shared_imports';
import { useFormData } from '../../../../shared_imports';
import { type DefineStepRule } from '../../../../detections/pages/detection_engine/rules/types';

interface LastMachineLearningState {
  machineLearningJobId: string[];
  anomalyThreshold: number;
}

interface UsePersistentMachineLearningStateParams {
  form: FormHook<DefineStepRule>;
  ruleTypePath: string;
  machineLearningJobIdPath: string;
  anomalyThresholdPath: string;
}

export function usePersistentMachineLearningState({
  form,
  ruleTypePath,
  machineLearningJobIdPath,
  anomalyThresholdPath,
}: UsePersistentMachineLearningStateParams): void {
  const lastMlState = useRef<LastMachineLearningState | undefined>();
  const [formData] = useFormData({ form });

  const {
    [ruleTypePath]: ruleType,
    [machineLearningJobIdPath]: machineLearningJobId,
    [anomalyThresholdPath]: anomalyThreshold,
  } = formData;
  const previousRuleType = usePrevious(ruleType);

  useEffect(() => {
    if (isMlRule(ruleType) && !isMlRule(previousRuleType) && lastMlState.current) {
      form.updateFieldValues({
        [machineLearningJobIdPath]: lastMlState.current.machineLearningJobId,
        [anomalyThresholdPath]: lastMlState.current.anomalyThreshold,
      });

      return;
    }

    if (isMlRule(ruleType)) {
      lastMlState.current = { machineLearningJobId, anomalyThreshold };
    }
  }, [
    form,
    ruleType,
    previousRuleType,
    machineLearningJobIdPath,
    anomalyThresholdPath,
    machineLearningJobId,
    anomalyThreshold,
  ]);
}
