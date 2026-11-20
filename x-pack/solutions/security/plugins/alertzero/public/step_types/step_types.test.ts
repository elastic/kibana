/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';
import { ReportWorkerOutcomeStepId } from '../../common/step_types';
import { registerAlertZeroPublicStepDefinitions } from '.';

type Loader = () => Promise<{ icon?: unknown; id: string } | undefined>;

const register = () => {
  const registerStepDefinition = jest.fn();
  registerAlertZeroPublicStepDefinitions({
    registerStepDefinition,
  } as unknown as WorkflowsExtensionsPublicPluginSetup);

  return registerStepDefinition.mock.calls.map(([definition]) => definition as Loader);
};

describe('AlertZero public step definitions', () => {
  it('registers every step as a loader, so none reaches the page-load bundle', () => {
    const registered = register();

    expect(registered.map((definition) => typeof definition)).toEqual(['function']);
  });

  it('resolves to the reportWorkerOutcome step id', async () => {
    const resolved = await Promise.all(register().map((load) => load()));

    expect(resolved.map((definition) => definition?.id)).toEqual([ReportWorkerOutcomeStepId]);
  });

  it('gives the step an icon', async () => {
    const [definition] = await Promise.all(register().map((load) => load()));

    expect(definition).toHaveProperty('icon');
  });
});
