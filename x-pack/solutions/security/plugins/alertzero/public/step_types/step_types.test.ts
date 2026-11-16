/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';
import { ReportWorkerOutcomeStepId } from '../../common/step_types';
import {
  TRIAGE_MATCH_FP_DECISIONS_STEP_ID,
  TRIAGE_REVOKE_FP_DECISION_STEP_ID,
  TRIAGE_STORE_FP_DECISIONS_STEP_ID,
} from '../../common/workers/alert_triage/step_types';
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

    expect(registered.map((definition) => typeof definition)).toEqual([
      'function',
      'function',
      'function',
      'function',
    ]);
  });

  // The workflow editor rejects a step type that the server registers but the client does not.
  it('resolves to every AlertZero step that a managed workflow uses in the editor', async () => {
    const resolved = await Promise.all(register().map((load) => load()));

    expect(resolved.map((definition) => definition?.id)).toEqual([
      ReportWorkerOutcomeStepId,
      TRIAGE_STORE_FP_DECISIONS_STEP_ID,
      TRIAGE_MATCH_FP_DECISIONS_STEP_ID,
      TRIAGE_REVOKE_FP_DECISION_STEP_ID,
    ]);
  });

  it('gives every step an icon', async () => {
    const resolved = await Promise.all(register().map((load) => load()));

    expect(resolved).toHaveLength(4);
    resolved.forEach((definition) => expect(definition).toHaveProperty('icon'));
  });
});
