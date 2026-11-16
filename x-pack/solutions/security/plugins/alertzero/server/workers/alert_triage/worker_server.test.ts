/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTriageLoadAlertsStepDefinition } from './steps/alert_triage_steps';
import { createWorkerServerContextMock } from '../worker_server_context.mock';
import { TRIAGE_GROUPING_KILL_SWITCH, alertTriageServerDefinition } from './worker_server';

jest.mock('./steps/alert_triage_steps', () => {
  const actual = jest.requireActual('./steps/alert_triage_steps');
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
  it('declares the grouping kill switch, on where no flag provider exists', () => {
    expect(alertTriageServerDefinition.featureFlags).toEqual([
      { key: 'alertzero.triageGrouping', fallback: true },
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
});
