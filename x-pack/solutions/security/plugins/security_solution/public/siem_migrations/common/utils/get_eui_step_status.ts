/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiStepStatus } from '@elastic/eui';

export const getEuiStepStatus = (step: number, currentStep: number): EuiStepStatus => {
  if (step === currentStep) {
    return 'current';
  }
  if (step < currentStep) {
    return 'complete';
  }
  return 'incomplete';
};
