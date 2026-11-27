/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TriggerInvestigationStepId } from '../../../common/workflows/steps/trigger_investigation';
import { TrackAlertOutcomeStepId } from '../../../common/workflows/steps/track_alert_outcome';
import { registerInvestigationsWorkflowSteps } from '.';

type Loader = () => Promise<{ id: string }>;

describe('registerInvestigationsWorkflowSteps', () => {
  it('registers the public steps as lazy loaders with icons', async () => {
    const registerStepDefinition = jest.fn();
    registerInvestigationsWorkflowSteps({ registerStepDefinition });

    const loaders: Loader[] = registerStepDefinition.mock.calls.map(([loader]) => loader);
    const definitions = await Promise.all(loaders.map((loader) => loader()));
    expect(definitions.map(({ id }) => id)).toEqual([
      TriggerInvestigationStepId,
      TrackAlertOutcomeStepId,
    ]);
    for (const definition of definitions) expect(definition).toHaveProperty('icon');
  });

  it('does nothing when workflowsExtensions is unavailable', () => {
    expect(() => registerInvestigationsWorkflowSteps(undefined)).not.toThrow();
  });
});
