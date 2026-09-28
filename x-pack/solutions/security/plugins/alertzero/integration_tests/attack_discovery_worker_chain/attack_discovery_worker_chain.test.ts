/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/workflows';
import {
  createAttackDiscoveryChainFixture,
  FAKE_ATTACK_DISCOVERY_ID,
  FAKE_INVESTIGATION_ID,
} from './attack_discovery_chain_fixture';
import type { AttackDiscoveryChainFixture } from './attack_discovery_chain_fixture';

/**
 * Drives the REAL execution engine through the REAL, UNMODIFIED AlertZero
 * Attack Discovery chain: `attack_discovery_review.yaml` calling
 * `attack_discovery_fp_tp_analysis.yaml` via `workflow.execute`, which in turn
 * calls `system-create-proposal` (the shared escalation-gate workflow) via
 * `workflow.execute`. Only the `ai.agent` step's handler is faked (see
 * `chain_step_registry.ts`); every workflow-YAML step, schema, and branch is
 * the one that ships.
 *
 * L2 (per-step model-scored eval suites) already proves the FP/TP analysis's
 * classification QUALITY. This suite proves the chain's PLUMBING: given a
 * verdict, does the review take the right lifecycle action, park the right
 * gate, and read the right decision back.
 */
describe('AlertZero Attack Discovery worker chain (review -> fp/tp analysis -> escalation gate)', () => {
  let fixture: AttackDiscoveryChainFixture;

  beforeEach(() => {
    fixture = createAttackDiscoveryChainFixture();
    fixture.seedAttackDiscoveryDocument();
  });

  describe('false_positive verdict', () => {
    beforeEach(async () => {
      fixture.backend.queueAgentVerdict({
        verdict: 'false_positive',
        summary_markdown: 'Evidence contradicts the correlation.',
      });
      await fixture.runReview();
    });

    it('completes the review without escalating', () => {
      expect(fixture.reviewExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(fixture.proposals()).toHaveLength(0);
    });

    it('closes the attack as false_positive, leaving related alerts open', () => {
      expect(fixture.backend.attackStatusCalls).toContainEqual({
        ids: [FAKE_ATTACK_DISCOVERY_ID],
        status: 'closed',
        reason: 'false_positive',
      });
    });

    it('closes the Investigation', () => {
      const [investigation] = fixture.backend.conversations.values();
      expect(investigation.metadata.status).toBe('closed');
      expect(investigation.metadata.close_reason).toBe('false_positive');
    });

    it('emits the false_positive verdict on the review output', () => {
      expect(fixture.reviewOutput()).toMatchObject({ verdict: 'false_positive' });
    });
  });

  describe('true_positive verdict', () => {
    beforeEach(() => {
      fixture.backend.queueAgentVerdict({
        verdict: 'true_positive',
        summary_markdown: 'Evidence supports the correlation.',
      });
    });

    it('escalates: parks the gate rather than closing anything', async () => {
      await fixture.runReview();

      expect(fixture.reviewExecution()?.status).toBe(ExecutionStatus.WAITING_FOR_CHILD);
      expect(fixture.onlyProposal().status).toBe('pending');
      expect(fixture.backend.attackStatusCalls).toHaveLength(0);
      const [investigation] = fixture.backend.conversations.values();
      expect(investigation.metadata.status).not.toBe('closed');
    });

    describe('approved', () => {
      beforeEach(async () => {
        await fixture.runReview();
        await fixture.resumeEscalationGate({ approved: true, respondedBy: 'analyst-1' });
      });

      it('completes the review', () => {
        expect(fixture.reviewExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      });

      it('records the approval on the proposal', () => {
        const proposal = fixture.onlyProposal();
        expect(proposal.decision).toBe('approved');
        expect(proposal.status).toBe('succeeded');
      });

      it('asks the gate to approve this attack, at the analysed verdict', () => {
        // The payload the review hands the gate was otherwise unasserted: a
        // regression proposing the wrong attack, investigation or verdict kept
        // every other test green, because the gate's own assertions only read
        // back the decision it was given.
        expect(fixture.onlyProposal().actionInput).toMatchObject({
          ai_index_id: 'security-investigations',
          attack_discovery_id: FAKE_ATTACK_DISCOVERY_ID,
          investigation_id: FAKE_INVESTIGATION_ID,
          classification: 'true_positive',
        });
      });

      it('writes the forensics handoff knowledge indicator', () => {
        expect(fixture.backend.knowledgeIndicators.size).toBe(1);
        const [[, ki]] = [...fixture.backend.knowledgeIndicators];
        expect(ki.ai_index_id).toBe('security-investigations');
      });

      it('leaves the Investigation and the attack open for the forensics report', () => {
        expect(fixture.backend.attackStatusCalls).toHaveLength(0);
        const [investigation] = fixture.backend.conversations.values();
        expect(investigation.metadata.status).toBe('open');
      });

      it('emits proposal_status=succeeded and proposal_decision=approved', () => {
        expect(fixture.reviewOutput()).toMatchObject({
          verdict: 'true_positive',
          proposal_status: 'succeeded',
          proposal_decision: 'approved',
        });
      });
    });

    describe('dismissed', () => {
      beforeEach(async () => {
        await fixture.runReview();
        await fixture.resumeEscalationGate({
          approved: false,
          respondedBy: 'analyst-1',
        });
      });

      it('completes the review', () => {
        expect(fixture.reviewExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      });

      it('records the dismissal on the proposal', () => {
        const proposal = fixture.onlyProposal();
        expect(proposal.decision).toBe('dismissed');
        expect(proposal.status).toBe('no_action');
      });

      it('closes both the Investigation and the attack, without a false-positive reason', () => {
        expect(fixture.backend.attackStatusCalls).toContainEqual({
          ids: [FAKE_ATTACK_DISCOVERY_ID],
          status: 'closed',
        });
        // Stated outright rather than inferred from `toContainEqual`'s
        // extra-property inequality: a dismissal that wrongly closed the attack
        // as `false_positive` must fail here, not merely differ from the fixture.
        const [closeCall] = fixture.backend.attackStatusCalls;
        expect(closeCall.reason).toBeUndefined();
        const [investigation] = fixture.backend.conversations.values();
        expect(investigation.metadata.status).toBe('closed');
      });

      it('writes no forensics knowledge indicator', () => {
        expect(fixture.backend.knowledgeIndicators.size).toBe(0);
      });
    });
    describe('expired (nobody answers within the decision window)', () => {
      beforeEach(async () => {
        await fixture.runReview();
        await fixture.timeOutEscalationGate();
      });

      it('completes the review rather than failing it', () => {
        expect(fixture.reviewExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      });

      it('settles the proposal as expired with no decision', () => {
        const proposal = fixture.onlyProposal();
        expect(proposal.status).toBe('expired');
        expect(proposal.decision).toBeUndefined();
      });

      it('leaves the Investigation and the attack both open', () => {
        expect(fixture.backend.attackStatusCalls).toHaveLength(0);
        const [investigation] = fixture.backend.conversations.values();
        expect(investigation.metadata.status).toBe('open');
      });

      it('writes no forensics knowledge indicator', () => {
        expect(fixture.backend.knowledgeIndicators.size).toBe(0);
      });
    });
  });

  describe('inconclusive verdict', () => {
    beforeEach(() => {
      fixture.backend.queueAgentVerdict({
        verdict: 'inconclusive',
        summary_markdown: 'Insufficient evidence to decide.',
      });
    });

    it('escalates the same as true_positive (insufficient evidence is a reason to look harder)', async () => {
      await fixture.runReview();

      expect(fixture.reviewExecution()?.status).toBe(ExecutionStatus.WAITING_FOR_CHILD);
      expect(fixture.onlyProposal().status).toBe('pending');
    });

    it('approving hands off to forensics exactly like true_positive', async () => {
      await fixture.runReview();
      await fixture.resumeEscalationGate({ approved: true, respondedBy: 'analyst-1' });

      expect(fixture.reviewExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(fixture.reviewOutput()).toMatchObject({ verdict: 'inconclusive' });
      expect(fixture.backend.knowledgeIndicators.size).toBe(1);
    });
  });

  describe('failed execution-state arm', () => {
    // Per #292661's documented reachability table: pointing the review at an
    // attack_discovery_id with no persisted document is what reaches this arm
    // — `attack_discovery_fp_tp_analysis.yaml`'s `require_attack_discovery`
    // fails the child run, and the review's `resolve_analysis` degrades an
    // empty child output to `failed_verdict` rather than a classification.
    beforeEach(async () => {
      await fixture.runReview({ attack_discovery_id: 'does-not-exist' });
    });

    it('completes the review (a failed child is not a failed review)', () => {
      expect(fixture.reviewExecution()?.status).toBe(ExecutionStatus.COMPLETED);
    });

    it('records the failed execution state as the verdict, not a classification', () => {
      expect(fixture.reviewOutput()).toMatchObject({ verdict: 'failed' });
    });

    it('takes no lifecycle action and raises no proposal', () => {
      expect(fixture.backend.attackStatusCalls).toHaveLength(0);
      expect(fixture.proposals()).toHaveLength(0);
    });

    it('leaves the Investigation open for manual review', () => {
      const [investigation] = fixture.backend.conversations.values();
      expect(investigation.metadata.status).toBe('open');
    });

    it('never called the ai.agent step at all', () => {
      // The required-source failure happens before `analyze` runs.
      expect(fixture.backend.agentCallCount()).toBe(0);
    });
  });
});
