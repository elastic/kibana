/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TriggerInvestigationStepId } from '../../../common/workflows/steps/trigger_investigation';
import { registerInvestigationsWorkflowSteps } from '.';

type Loader = () => Promise<{ id: string }>;

describe('registerInvestigationsWorkflowSteps', () => {
  it('registers the trigger investigation step as a lazy loader with an icon', async () => {
    const registerStepDefinition = jest.fn();
    registerInvestigationsWorkflowSteps({ registerStepDefinition });

    expect(registerStepDefinition).toHaveBeenCalledTimes(1);
    const [loader]: [Loader] = registerStepDefinition.mock.calls[0];
    expect(typeof loader).toBe('function');
    const definition = await loader();
    expect(definition.id).toBe(TriggerInvestigationStepId);
    expect(definition).toHaveProperty('icon');
  });

  it('does nothing when workflowsExtensions is unavailable', () => {
    expect(() => registerInvestigationsWorkflowSteps(undefined)).not.toThrow();
  });
});
