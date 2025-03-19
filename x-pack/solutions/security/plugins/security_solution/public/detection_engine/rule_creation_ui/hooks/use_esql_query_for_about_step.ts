/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo } from 'react';
import type { DefineStepRule } from '../../common/types';
import { RuleStep } from '../../common/types';
import { isEsqlRule } from '../../../../common/detection_engine/utils';

interface UseEsqlQueryForAboutStepArgs {
  defineStepData: DefineStepRule;
  activeStep: RuleStep;
}

/**
 *  If about step not active, return query as undefined to prevent unnecessary re-renders
 *  ES|QL query can change frequently when user types it, so we don't want it to trigger about form step re-render, when  *  this from step not active
 *  When it is active, query would not change, as it can be edit only in define form step
 */
export const useEsqlQueryForAboutStep = ({
  defineStepData,
  activeStep,
}: UseEsqlQueryForAboutStepArgs) => {
  const esqlQueryForAboutStep = useMemo(() => {
    if (activeStep !== RuleStep.aboutRule) {
      return undefined;
    }
    return typeof defineStepData.queryBar.query.query === 'string' &&
      isEsqlRule(defineStepData.ruleType)
      ? defineStepData.queryBar.query.query
      : undefined;
  }, [defineStepData.queryBar.query.query, defineStepData.ruleType, activeStep]);

  return esqlQueryForAboutStep;
};
