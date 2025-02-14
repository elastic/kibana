/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HealthRuleParams, Optional, ValidationHealthRuleResult } from './types';

export function validateHealthRule(
  ruleParams: Optional<HealthRuleParams>
): ValidationHealthRuleResult {
  const validationResult: ValidationHealthRuleResult = {
    errors: {
      sloIds: new Array<string>(),
      staleTime: new Array<string>(),
      delay: new Array<string>(),
    },
  };

  // @ts-ignore use or don't use them for UI validation
  const { sloIds, staleTime, delay } = ruleParams;

  return validationResult;
}
