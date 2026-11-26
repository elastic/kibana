/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTriageLoadAlertsStepDefinition } from '../step_types/alert_triage/alert_triage_steps';
import { WORKER_SERVER_DEFINITIONS } from '../workers';
import { createWorkerServerContextMock } from '../workers/worker_server_context.mock';
import { getTriageMatchFpDecisionsStepDefinition } from '../step_types/alert_triage/match_fp_decisions_step';
import { getTriageStoreFpDecisionsStepDefinition } from '../step_types/alert_triage/store_fp_decisions_step';
import {
  TRIAGE_DECISION_AUTO_CLOSE,
  TRIAGE_GROUPING_KILL_SWITCH,
  alertTriageServerDefinition,
} from './worker_server';

jest.mock('../step_types/alert_triage/store_fp_decisions_step', () => {
  const actual = jest.requireActual('../step_types/alert_triage/store_fp_decisions_step');
  return {
    ...actual,
    getTriageStoreFpDecisionsStepDefinition: jest.fn(
      actual.getTriageStoreFpDecisionsStepDefinition
    ),
  };
});

jest.mock('../step_types/alert_triage/match_fp_decisions_step', () => {
  const actual = jest.requireActual('../step_types/alert_triage/match_fp_decisions_step');
  return {
    ...actual,
    getTriageMatchFpDecisionsStepDefinition: jest.fn(
      actual.getTriageMatchFpDecisionsStepDefinition
    ),
  };
});

jest.mock('../step_types/alert_triage/alert_triage_steps', () => {
  const actual = jest.requireActual('../step_types/alert_triage/alert_triage_steps');
  return {
    ...actual,
    getTriageLoadAlertsStepDefinition: jest.fn(actual.getTriageLoadAlertsStepDefinition),
  };
});

const stepsFor = (context = createWorkerServerContextMock()) =>
  alertTriageServerDefinition.getStepDefinitions?.(context) ?? [];

const stepNamed = (steps: ReturnType<typeof stepsFor>, id: string) => {
  const step = steps.find((candidate) => 'id' in candidate && candidate.id === id);
  if (!step || !('handler' in step)) throw new Error(`No step ${id}`);
  return step;
};

describe('alertTriageServerDefinition', () => {
  it('is listed in WORKER_SERVER_DEFINITIONS, so its steps and flags are registered', () => {
    expect(WORKER_SERVER_DEFINITIONS).toContain(alertTriageServerDefinition);
  });

  it('declares the grouping kill switch, on where no flag provider exists, and the decision mode, off', () => {
    expect(alertTriageServerDefinition.featureFlags).toEqual([
      { key: 'alertzero.triageGrouping', fallback: true },
      { key: 'alertzero.triageDecisionAutoClose', fallback: 'off' },
    ]);
  });

  it('builds its steps without resolving any service before start', () => {
    const context = createWorkerServerContextMock();

    const steps = stepsFor(context);

    for (const getter of [
      context.getConversations,
      context.getProposalsPlugin,
      context.getTaskManager,
      context.getWorkflowsManagement,
      context.getFeatureFlag,
    ]) {
      expect(getter).not.toHaveBeenCalled();
    }
    expect(steps.map((step) => ('id' in step ? step.id : undefined))).toEqual([
      'alertzero.triage.headroom',
      'alertzero.triage.planSweep',
      'alertzero.triage.loadAlerts',
      'alertzero.triage.tagPatternKeys',
      'alertzero.triage.retagProposalAlerts',
      'alertzero.triage.groupFpCandidates',
      'alertzero.triage.joinProposal',
      'alertzero.triage.storeFpDecisions',
      'alertzero.triage.matchFpDecisions',
      'alertzero.triage.revokeFpDecision',
    ]);
  });

  it('joins no proposal while the grouping kill switch is off', async () => {
    const getFeatureFlag = jest.fn().mockReturnValue(false);
    const joinProposal = stepNamed(
      stepsFor(createWorkerServerContextMock({ getFeatureFlag })),
      'alertzero.triage.joinProposal'
    );

    const result = await joinProposal.handler({
      input: { proposal_id: 'p-1', alert_ids: ['a-1'], rule_name: 'Rule', confidence_floor: 0.8 },
    } as never);

    expect(getFeatureFlag).toHaveBeenCalledWith(TRIAGE_GROUPING_KILL_SWITCH);
    expect(result).toEqual({ output: expect.objectContaining({ joined: false }) });
  });

  it('gives loadAlerts workflows management, and throws when it is absent', () => {
    const management = {};
    const getWorkflowsManagement = jest.fn<unknown, []>(() => management);
    stepsFor(createWorkerServerContextMock({ getWorkflowsManagement } as never));
    const [loadAlertsDeps] = jest.mocked(getTriageLoadAlertsStepDefinition).mock.lastCall ?? [];
    if (!loadAlertsDeps) throw new Error('getTriageLoadAlertsStepDefinition was not called');

    expect(loadAlertsDeps.getWorkflowsManagement()).toBe(management);

    getWorkflowsManagement.mockReturnValue(undefined);
    expect(() => loadAlertsDeps.getWorkflowsManagement()).toThrow(
      'Workflows management is not available'
    );
  });

  it('hands the decision steps the live auto-close mode, and an unknown value as off', async () => {
    const mode = { value: 'shadow' };
    const getFeatureFlag = jest.fn(({ key }: { key: string }) =>
      key === TRIAGE_DECISION_AUTO_CLOSE.key ? mode.value : true
    );
    stepsFor(createWorkerServerContextMock({ getFeatureFlag } as never));
    const [storeDeps] = jest.mocked(getTriageStoreFpDecisionsStepDefinition).mock.lastCall ?? [];
    const [matchDeps] = jest.mocked(getTriageMatchFpDecisionsStepDefinition).mock.lastCall ?? [];
    if (!storeDeps || !matchDeps) throw new Error('decision steps were not built');

    await expect(storeDeps.getMode()).resolves.toBe('shadow');
    mode.value = 'on';
    await expect(matchDeps.getMode()).resolves.toBe('on');
    mode.value = 'unexpected';
    await expect(storeDeps.getMode()).resolves.toBe('off');
    await expect(matchDeps.getMode()).resolves.toBe('off');
  });
});
