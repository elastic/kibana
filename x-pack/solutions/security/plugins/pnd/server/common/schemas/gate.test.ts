/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Proposal } from './proposal';
import { evaluateReadinessGate, requireReadinessGate, ReadinessGateError } from './gate';
import {
  evaluateSharedApprovalGate,
  requireSharedApprovalGate,
  SHARED_APPROVAL_GATE_PLATFORM_ISSUE,
} from './shared_approval_gate_adapter';

const buildProposal = (overrides: Partial<Proposal> = {}): Proposal => ({
  id: 'prop-1',
  schemaVersion: '1',
  sourceWatch: 'watch-floor',
  investigationId: 'inv-1',
  title: 'Suspicious auth burst on FIN-WS-04',
  status: 'new',
  confidence: 0.9,
  recommendation: 'Escalate — credential compromise confirmed.',
  reasoning: 'Brute force succeeded.',
  evidenceRefs: ['ev-0'],
  approvals: [{ approver: 'analyst', approvedAt: '2026-08-01T00:00:00.000Z' }],
  requiredApproverCount: 1,
  draft: false,
  approvalRequired: true,
  createdAt: '2026-08-01T00:00:00.000Z',
  ...overrides,
});

describe('readiness gate (gap #7)', () => {
  describe('evaluateReadinessGate', () => {
    it('passes a complete proposal targeting approved', () => {
      const result = evaluateReadinessGate(buildProposal(), 'approved');
      expect(result.approved).toBe(true);
    });

    it('fails closed when evidence is missing', () => {
      const result = evaluateReadinessGate(buildProposal({ evidenceRefs: [] }), 'approved');
      expect(result.approved).toBe(false);
      if (!result.approved) {
        expect(result.failure.missingRequirements).toContain('evidence');
      }
    });

    it('fails closed when recommendation is empty', () => {
      const result = evaluateReadinessGate(buildProposal({ recommendation: '   ' }), 'approved');
      expect(result.approved).toBe(false);
      if (!result.approved) {
        expect(result.failure.missingRequirements).toContain('recommendation');
      }
    });

    it('does not check approver-count at the readiness stage (that is the adapter human-approval phase)', () => {
      const result = evaluateReadinessGate(
        buildProposal({ approvals: [], requiredApproverCount: 1 }),
        'approved'
      );
      // Readiness only substantiates the proposal (evidence + recommendation);
      // approver-count is enforced by the shared approval gate adapter.
      expect(result.approved).toBe(true);
    });

    it('aggregates every missing readiness requirement', () => {
      const result = evaluateReadinessGate(
        buildProposal({ evidenceRefs: [], recommendation: '', approvals: [], confidence: 0.1 }),
        'approved'
      );
      expect(result.approved).toBe(false);
      if (!result.approved) {
        expect(result.failure.missingRequirements.sort()).toEqual([
          'confidence',
          'evidence',
          'recommendation',
        ]);
      }
    });

    it('rejects a proposal below the confidence threshold', () => {
      const result = evaluateReadinessGate(buildProposal({ confidence: 0.79 }), 'approved');
      expect(result.approved).toBe(false);
      if (!result.approved) {
        expect(result.failure.missingRequirements).toContain('confidence');
      }
    });

    it('admits a proposal exactly at the confidence threshold (inclusive)', () => {
      const result = evaluateReadinessGate(buildProposal({ confidence: 0.8 }), 'approved');
      expect(result.approved).toBe(true);
    });

    it('does not gate non-approved transitions', () => {
      const bare = buildProposal({ evidenceRefs: [], recommendation: '', approvals: [] });
      expect(evaluateReadinessGate(bare, 'dismissed').approved).toBe(true);
      expect(evaluateReadinessGate(bare, 'escalated').approved).toBe(true);
      expect(evaluateReadinessGate(bare, undefined).approved).toBe(true);
    });
  });

  describe('requireReadinessGate', () => {
    it('throws ReadinessGateError on a failing gate', () => {
      expect(() => requireReadinessGate(buildProposal({ evidenceRefs: [] }), 'approved')).toThrow(
        ReadinessGateError
      );
    });

    it('does not throw on a passing gate', () => {
      expect(() => requireReadinessGate(buildProposal(), 'approved')).not.toThrow();
    });
  });
});

describe('shared approval gate adapter (gap #7 / security-team#17944)', () => {
  it('exposes the platform issue reference', () => {
    expect(SHARED_APPROVAL_GATE_PLATFORM_ISSUE).toBe('security-team#17944');
  });

  it('allows a complete proposal at the platform-hitl phase', () => {
    const decision = evaluateSharedApprovalGate(buildProposal(), 'approved');
    expect(decision.allowed).toBe(true);
    expect(decision.phase).toBe('platform-hitl');
    expect(decision.spikeFallback).toBe(true);
  });

  it('blocks at the readiness phase when evidence is missing', () => {
    const decision = evaluateSharedApprovalGate(buildProposal({ evidenceRefs: [] }), 'approved');
    expect(decision.allowed).toBe(false);
    expect(decision.phase).toBe('readiness');
    expect(decision.missingRequirements).toContain('evidence');
  });

  it('blocks at the human-approval phase when approver count is short', () => {
    const decision = evaluateSharedApprovalGate(
      buildProposal({ approvals: [], requiredApproverCount: 2 }),
      'approved'
    );
    expect(decision.allowed).toBe(false);
    expect(decision.phase).toBe('human-approval');
    expect(decision.missingRequirements).toContain('approver-count');
  });

  it('requireSharedApprovalGate throws when the gate blocks', () => {
    expect(() =>
      requireSharedApprovalGate(buildProposal({ evidenceRefs: [] }), 'approved')
    ).toThrow(ReadinessGateError);
  });

  it('requireSharedApprovalGate fails CLOSED on a human-approval (approver-count) block', () => {
    // Regression: a proposal that passes readiness but lacks approvals must
    // still throw. Previously this fell open because the require-wrapper
    // re-delegated to the readiness gate, which the proposal already passed.
    let thrown: unknown;
    try {
      requireSharedApprovalGate(
        buildProposal({ approvals: [], requiredApproverCount: 2 }),
        'approved'
      );
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(ReadinessGateError);
    expect((thrown as ReadinessGateError).failure.missingRequirements).toContain('approver-count');
  });

  it('requireSharedApprovalGate fails CLOSED on a confidence block below threshold', () => {
    expect(() => requireSharedApprovalGate(buildProposal({ confidence: 0.5 }), 'approved')).toThrow(
      ReadinessGateError
    );
  });

  it('requireSharedApprovalGate is a no-op for a passing gate', () => {
    expect(() => requireSharedApprovalGate(buildProposal(), 'approved')).not.toThrow();
  });
});
