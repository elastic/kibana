/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Unit contract for the proposal-gate harness helpers in `workflow_task.ts`.
 *
 * The review no longer parks `waiting_for_input` itself: it settles into
 * `waiting_for_child` while a `system-create-investigation-proposal` child hosts the
 * actual `waitForApproval` gate. These tests pin that contract, because a status-string
 * regression here looks exactly like an infrastructure hang — every run sits parked until
 * the next task's stale-cancel kills it and no fixture ever scores.
 */

import { ExecutionStatus } from '@kbn/workflows';
import {
  isAwaitingApproval,
  isAwaitingProposalChild,
  neverRan,
  soleProposalChild,
} from './workflow_task';

describe('proposal gate harness helpers', () => {
  describe('isAwaitingProposalChild', () => {
    it('matches waiting_for_child — the review parked on its propose_* fan-out', () => {
      expect(isAwaitingProposalChild(ExecutionStatus.WAITING_FOR_CHILD)).toBe(true);
    });

    it('does NOT match the old review-level gate statuses', () => {
      expect(isAwaitingProposalChild(ExecutionStatus.WAITING_FOR_INPUT)).toBe(false);
      expect(isAwaitingProposalChild(ExecutionStatus.WAITING)).toBe(false);
    });

    it('does NOT match running or terminal statuses', () => {
      expect(isAwaitingProposalChild(ExecutionStatus.RUNNING)).toBe(false);
      expect(isAwaitingProposalChild(ExecutionStatus.COMPLETED)).toBe(false);
      expect(isAwaitingProposalChild(ExecutionStatus.FAILED)).toBe(false);
    });
  });

  describe('isAwaitingApproval', () => {
    // The proposal CHILD hosts the gate now; it reports waiting_for_input, not waiting —
    // an earlier bare-string check for 'waiting' alone never matched, so every run sat at
    // the gate until stale-cancel killed it.
    it('matches waiting_for_input', () => {
      expect(isAwaitingApproval(ExecutionStatus.WAITING_FOR_INPUT)).toBe(true);
    });

    it('matches waiting', () => {
      expect(isAwaitingApproval(ExecutionStatus.WAITING)).toBe(true);
    });

    it('does NOT match waiting_for_child — that is the REVIEW, not its proposal child', () => {
      expect(isAwaitingApproval(ExecutionStatus.WAITING_FOR_CHILD)).toBe(false);
    });

    it('does NOT match non-parked statuses', () => {
      expect(isAwaitingApproval(ExecutionStatus.RUNNING)).toBe(false);
      expect(isAwaitingApproval(ExecutionStatus.COMPLETED)).toBe(false);
    });
  });

  describe('soleProposalChild', () => {
    const child = (executionId: string, status: ExecutionStatus, workflowId = 'wf') => ({
      parentStepExecutionId: `step-${executionId}`,
      workflowId,
      workflowName: 'name',
      executionId,
      status,
      stepExecutions: [],
    });

    it('returns the single proposal child parked on its gate', () => {
      const pending = child('p1', ExecutionStatus.WAITING_FOR_INPUT);
      const settled = child('p0', ExecutionStatus.COMPLETED);
      expect(soleProposalChild([settled, pending])).toBe(pending);
    });

    it('returns undefined while no child is parked yet — the fan-out race, not an error', () => {
      expect(soleProposalChild([])).toBeUndefined();
      expect(
        soleProposalChild([child('p0', ExecutionStatus.COMPLETED, 'other-wf')])
      ).toBeUndefined();
    });

    it('does not let a running child pass as parked', () => {
      expect(soleProposalChild([child('p1', ExecutionStatus.RUNNING)])).toBeUndefined();
    });

    it('throws naming every child when more than one gate is pending', () => {
      expect(() =>
        soleProposalChild([
          child('p1', ExecutionStatus.WAITING_FOR_INPUT),
          child('p2', ExecutionStatus.WAITING_FOR_INPUT),
        ])
      ).toThrow(/found 2/);
    });
  });

  describe('neverRan', () => {
    it('matches skipped and cancelled — a concurrency collision, not a model result', () => {
      expect(neverRan(ExecutionStatus.SKIPPED)).toBe(true);
      expect(neverRan(ExecutionStatus.CANCELLED)).toBe(true);
    });

    it('does not match statuses the runtime actually ran', () => {
      expect(neverRan(ExecutionStatus.COMPLETED)).toBe(false);
      expect(neverRan(ExecutionStatus.FAILED)).toBe(false);
    });
  });
});
