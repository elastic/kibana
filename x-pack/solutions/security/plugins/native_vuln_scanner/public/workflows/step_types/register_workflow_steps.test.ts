/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicStepDefinition } from '@kbn/workflows-extensions/public';
import { workflowsExtensionsMock } from '@kbn/workflows-extensions/public/mocks';
import {
  FETCH_FEED_STEP_TYPE,
  MATCH_STEP_TYPE,
  SUMMARIZE_STEP_TYPE,
} from '../../../common/workflows/step_types';
import { fetchFeedStepDefinition } from './fetch_feed';
import { matchStepDefinition } from './match';
import { registerNativeVulnScannerWorkflowSteps } from './register_workflow_steps';
import { summarizeStepDefinition } from './summarize';

type StepLoader = () => Promise<PublicStepDefinition | undefined>;

describe('registerNativeVulnScannerWorkflowSteps (public)', () => {
  const register = () => {
    const workflowsExtensions = workflowsExtensionsMock.createSetup();
    registerNativeVulnScannerWorkflowSteps(workflowsExtensions);
    return workflowsExtensions.registerStepDefinition.mock.calls.map(([arg]) => arg as StepLoader);
  };

  it('registers one loader per step', () => {
    expect(register()).toHaveLength(3);
  });

  it('resolves the loaders to the three step definitions, with the ids the YAML uses', async () => {
    const definitions = await Promise.all(register().map((loader) => loader()));

    expect(definitions).toEqual([
      fetchFeedStepDefinition,
      matchStepDefinition,
      summarizeStepDefinition,
    ]);
    expect(definitions.map((definition) => definition?.id)).toEqual([
      FETCH_FEED_STEP_TYPE,
      MATCH_STEP_TYPE,
      SUMMARIZE_STEP_TYPE,
    ]);
  });
});
