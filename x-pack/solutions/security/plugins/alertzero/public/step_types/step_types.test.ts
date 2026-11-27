/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';
import { ReportWorkerOutcomeStepId } from '../../common/step_types';
import {
  TRIAGE_GROUP_FP_CANDIDATES_STEP_ID,
  TRIAGE_HEADROOM_STEP_ID,
  TRIAGE_JOIN_PROPOSAL_STEP_ID,
  TRIAGE_LOAD_ALERTS_STEP_ID,
  TRIAGE_MATCH_FP_DECISIONS_STEP_ID,
  TRIAGE_PLAN_SWEEP_STEP_ID,
  TRIAGE_RETAG_PROPOSAL_ALERTS_STEP_ID,
  TRIAGE_REVOKE_FP_DECISION_STEP_ID,
  TRIAGE_STORE_FP_DECISIONS_STEP_ID,
  TRIAGE_TAG_PATTERN_KEYS_STEP_ID,
} from '../../common/step_types/alert_triage';
import { PACKAGE_REPORT_STEP_ID } from '../../common/step_types/package_report';
import { RESOLVE_PROPOSALS_STEP_ID } from '../../common/step_types/resolve_proposals';
import { SUMMARIZE_INVESTIGATION_STEP_ID } from '../../common/step_types/summarize_investigation';
import { AlertZeroStepIcon } from './alertzero_step_icon';
import { registerAlertZeroPublicStepDefinitions } from '.';

type Loader = () => Promise<{ icon?: unknown; id: string; exposure?: string } | undefined>;

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

    expect(registered).toHaveLength(14);
    registered.forEach((definition) => expect(typeof definition).toBe('function'));
  });

  // The workflow editor rejects a step type that the server registers but the client does not.
  it('resolves to every AlertZero step that a managed workflow uses in the editor', async () => {
    const resolved = await Promise.all(register().map((load) => load()));

    expect(resolved.map((definition) => definition?.id)).toEqual([
      ReportWorkerOutcomeStepId,
      TRIAGE_STORE_FP_DECISIONS_STEP_ID,
      TRIAGE_MATCH_FP_DECISIONS_STEP_ID,
      TRIAGE_REVOKE_FP_DECISION_STEP_ID,
      TRIAGE_HEADROOM_STEP_ID,
      TRIAGE_PLAN_SWEEP_STEP_ID,
      TRIAGE_LOAD_ALERTS_STEP_ID,
      TRIAGE_TAG_PATTERN_KEYS_STEP_ID,
      TRIAGE_GROUP_FP_CANDIDATES_STEP_ID,
      TRIAGE_JOIN_PROPOSAL_STEP_ID,
      TRIAGE_RETAG_PROPOSAL_ALERTS_STEP_ID,
      RESOLVE_PROPOSALS_STEP_ID,
      SUMMARIZE_INVESTIGATION_STEP_ID,
      PACKAGE_REPORT_STEP_ID,
    ]);
  });

  it('gives every step the AlertZero icon', async () => {
    const resolved = await Promise.all(register().map((load) => load()));

    resolved.forEach((definition) => expect(definition).toHaveProperty('icon', AlertZeroStepIcon));
  });

  it('marks every step internal, since they only exist for the AlertZero managed workflows', async () => {
    const resolved = await Promise.all(register().map((load) => load()));

    resolved.forEach((definition) => expect(definition).toHaveProperty('exposure', 'internal'));
  });
});
