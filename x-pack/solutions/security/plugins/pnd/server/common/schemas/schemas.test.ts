/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildProposalFromWorkerRun,
  proposalSchema,
  verdictToProposalStatus,
  buildProposalTitle,
  buildEvidencePackageFromWorkerRun,
  evidencePackageSchema,
  buildWorkerEvaluationRecord,
  workerEvaluationRecordSchema,
} from '.';

describe('PND canonical Daybreak schemas', () => {
  describe('buildProposalFromWorkerRun', () => {
    it('produces a schema-valid Proposal', () => {
      const p = buildProposalFromWorkerRun({
        id: 'prop-1',
        sourceWatch: 'watch-floor',
        investigationId: 'inv-1',
        ruleName: 'Suspicious Process',
        alertId: 'alert-1',
        verdict: 'true_positive',
        severity: 'critical',
        confidence: 0.92,
        reasoning: 'Confirmed C2 beaconing.',
        summary: 'Malicious beaconing to known C2.',
      });
      expect(() => proposalSchema.parse(p)).not.toThrow();
      expect(p.status).toBe('escalated');
      expect(p.title).toBe('Suspicious Process on alert-1');
      expect(p.recommendation).toMatch(/^Escalate —/);
    });

    it('maps verdict + severity to status', () => {
      expect(verdictToProposalStatus('true_positive', 'low')).toBe('new');
      expect(verdictToProposalStatus('true_positive', 'critical')).toBe('escalated');
      expect(verdictToProposalStatus('false_positive')).toBe('dismissed');
      expect(verdictToProposalStatus('inconclusive')).toBe('needs-evidence');
    });

    it('builds title in golden-dataset shape', () => {
      expect(buildProposalTitle('Rule X', 'a-9')).toBe('Rule X on a-9');
    });
  });

  describe('buildEvidencePackageFromWorkerRun', () => {
    it('produces a schema-valid EvidencePackage', () => {
      const e = buildEvidencePackageFromWorkerRun({
        id: 'ev-1',
        summary: 'Endpoint beaconing evidence',
        confidence: 0.9,
        alertId: 'alert-1',
        tactics: ['TA0011'],
      });
      expect(() => evidencePackageSchema.parse(e)).not.toThrow();
      expect(e.kind).toBe('alert');
      expect(e.provenance).toBe('capability');
    });
  });

  describe('buildWorkerEvaluationRecord', () => {
    it('produces a schema-valid record with provenance', () => {
      const r = buildWorkerEvaluationRecord({
        id: 'wer-1',
        watch: 'watch-floor',
        investigationId: 'inv-1',
        runId: 'run-1',
        verdict: 'true_positive',
        confidence: 0.92,
        proposalId: 'prop-1',
        provenance: {
          modelId: 'anthropic-claude-5-sonnet',
          connectorId: '.anthropic-claude-5-sonnet-chat_completion',
          latencyMs: 15200,
          inputTokens: 22000,
          outputTokens: 4000,
          totalTokens: 26000,
          costBasis: 'unknown',
        },
      });
      expect(() => workerEvaluationRecordSchema.parse(r)).not.toThrow();
      expect(r.provenance.costBasis).toBe('unknown');
      expect(r.evidenceRefs).toEqual([]);
    });

    it('carries real token counts with a self-hosted cost basis (gap #6)', () => {
      const r = buildWorkerEvaluationRecord({
        id: 'wer-2',
        watch: 'watch-dark',
        investigationId: 'inv-2',
        runId: 'run-2',
        verdict: 'true_positive',
        confidence: 0.88,
        proposalId: 'prop-2',
        provenance: {
          modelId: 'anthropic-claude-6-sonnet',
          connectorId: 'eis-anthropic-claude-4-6-sonnet',
          latencyMs: 18400,
          inputTokens: 31000,
          outputTokens: 5200,
          totalTokens: 36200,
          // No verified USD price for a self-hosted/EIS connector — the tokens
          // are authoritative, the dollar cost is not, so costUsd is omitted
          // and the basis is labelled rather than fabricated.
          costBasis: 'self-hosted',
        },
      });
      expect(() => workerEvaluationRecordSchema.parse(r)).not.toThrow();
      expect(r.provenance.inputTokens).toBe(31000);
      expect(r.provenance.outputTokens).toBe(5200);
      expect(r.provenance.totalTokens).toBe(36200);
      expect(r.provenance.costBasis).toBe('self-hosted');
      expect(r.provenance.costUsd).toBeUndefined();
    });
  });
});
