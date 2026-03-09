/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PREINSTALLED_WORKFLOWS_FEATURE_FLAG,
  PREINSTALLED_WORKFLOWS_FEATURE_FLAG_DEFAULT,
  REGISTER_ALERT_VALIDATION_STEPS_FEATURE_FLAG,
  REGISTER_ALERT_VALIDATION_STEP_FEATURE_FLAG_DEFAULT,
} from './constants';

describe('Preinstalled Workflows Feature Flag Constants', () => {
  it('should export the correct feature flag', () => {
    expect(PREINSTALLED_WORKFLOWS_FEATURE_FLAG).toBe(
      'securitySolution.preinstalledWorkflowsEnabled'
    );
  });

  it('should export the correct default value', () => {
    expect(PREINSTALLED_WORKFLOWS_FEATURE_FLAG_DEFAULT).toBe(false);
  });

  it('should export the correct register alert validation steps feature flag', () => {
    expect(REGISTER_ALERT_VALIDATION_STEPS_FEATURE_FLAG).toBe(
      'securitySolution.registerAlertValidationStepsEnabled'
    );
  });

  it('should export the correct register alert validation steps default value', () => {
    expect(REGISTER_ALERT_VALIDATION_STEP_FEATURE_FLAG_DEFAULT).toBe(false);
  });
});
