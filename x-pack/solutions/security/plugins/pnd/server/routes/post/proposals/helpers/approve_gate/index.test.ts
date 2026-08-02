/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import {
  PND_GATE_STEP_IDS,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
} from '@kbn/pnd-common';

import { approveGate } from '.';

const request = httpServerMock.createKibanaRequest();

const resumeWorkflowExecution = jest.fn().mockResolvedValue({ resumedBy: 'analyst' });

const ctx = {
  channel: 'pnd-autonomy-auto',
  managementClient: { resumeWorkflowExecution },
  rationale: 'Auto-accepted by PND autonomy at level supervised (auto)',
  request,
  spaceId: 'agent-3',
};

const gate = ({
  stepId,
  workflowId = SYSTEM_SECURITY_WATCH_FLOOR_ID,
}: {
  stepId: string;
  workflowId?: string;
}) => ({
  stepExecutionId: `exec-${stepId}`,
  stepId,
  workflowId,
  workflowRunId: `run-${stepId}`,
});

describe('approveGate', () => {
  beforeEach(() => {
    resumeWorkflowExecution.mockClear();
  });

  it('resumes a non-alwaysGate with the registry autoApproveResponse plus the given rationale', async () => {
    await approveGate(gate({ stepId: PND_GATE_STEP_IDS.awaitPromoteIncident }), ctx);

    expect(resumeWorkflowExecution).toHaveBeenCalledWith(
      'run-await_promote_incident',
      'agent-3',
      {
        decision: 'approve',
        rationale: ctx.rationale,
      },
      request,
      { channel: 'pnd-autonomy-auto', stepExecutionId: 'exec-await_promote_incident' }
    );
  });

  it('never resumes await_incident_contained', async () => {
    await approveGate(gate({ stepId: PND_GATE_STEP_IDS.awaitIncidentContained }), ctx).catch(
      () => undefined
    );

    expect(resumeWorkflowExecution).not.toHaveBeenCalled();
  });

  it('never resumes await_apply_tuning', async () => {
    await approveGate(
      gate({
        stepId: PND_GATE_STEP_IDS.awaitApplyTuning,
        workflowId: SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
      }),
      ctx
    ).catch(() => undefined);

    expect(resumeWorkflowExecution).not.toHaveBeenCalled();
  });

  it('never resumes an unregistered (workflowId, stepId) pair', async () => {
    await approveGate(gate({ stepId: 'await_something_unknown' }), ctx).catch(() => undefined);

    expect(resumeWorkflowExecution).not.toHaveBeenCalled();
  });

  it('rejects when the registry re-read finds an alwaysGate', async () => {
    await expect(
      approveGate(gate({ stepId: PND_GATE_STEP_IDS.awaitIncidentContained }), ctx)
    ).rejects.toThrow(/alwaysGate|autoApproveResponse|unset/);
  });
});
