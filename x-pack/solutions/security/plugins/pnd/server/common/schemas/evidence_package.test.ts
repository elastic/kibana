/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  evidencePackageSchema,
  buildEvidencePackageFromWorkerRun,
  validateForensicEvidencePackage,
} from './evidence_package';

describe('evidence_package forensic sufficiency (FR-DP-04, issue #17955)', () => {
  const validForensic = {
    id: 'ev-1',
    schemaVersion: '1.0.0',
    kind: 'forensic' as const,
    summary: 'Forensic reconstruction of phishing attack',
    provenance: 'capability' as const,
    confidence: 0.8,
    stance: 'for' as const,
    sensitivityLabel: 'internal' as const,
    createdAt: '2026-08-18T12:00:00Z',
    scope: {
      hosts: ['WKSTN-EVAL01'],
      timeRange: { from: '2026-08-18T10:00:00Z', to: '2026-08-18T12:00:00Z' },
    },
    evidence: [{ type: 'process', description: 'PowerShell execution', source: 'logs-*' }],
    unresolvedQuestions: ['Was WMI used for lateral movement?'],
  };

  describe('evidencePackageSchema', () => {
    it('parses a valid forensic package with extended fields', () => {
      const result = evidencePackageSchema.parse(validForensic);
      expect(result.scope?.hosts).toEqual(['WKSTN-EVAL01']);
      expect(result.evidence).toHaveLength(1);
      expect(result.unresolvedQuestions).toHaveLength(1);
    });

    it('parses a non-forensic package without extended fields', () => {
      const alertPkg = {
        ...validForensic,
        kind: 'alert',
        scope: undefined,
        evidence: undefined,
        unresolvedQuestions: undefined,
      };
      expect(() => evidencePackageSchema.parse(alertPkg)).not.toThrow();
    });
  });

  describe('validateForensicEvidencePackage', () => {
    it('does not throw for a sufficient forensic package', () => {
      expect(() => validateForensicEvidencePackage(validForensic as any)).not.toThrow();
    });

    it('throws when scope is missing', () => {
      const noScope = { ...validForensic, scope: undefined };
      expect(() => validateForensicEvidencePackage(noScope as any)).toThrow('scope');
    });

    it('throws when evidence is empty', () => {
      const noEvidence = { ...validForensic, evidence: [] };
      expect(() => validateForensicEvidencePackage(noEvidence as any)).toThrow('evidence');
    });

    it('throws when unresolvedQuestions is empty', () => {
      const noQuestions = { ...validForensic, unresolvedQuestions: [] };
      expect(() => validateForensicEvidencePackage(noQuestions as any)).toThrow(
        'unresolvedQuestions'
      );
    });

    it('does not throw for non-forensic packages regardless of fields', () => {
      const alertPkg = { ...validForensic, kind: 'alert' };
      expect(() => validateForensicEvidencePackage(alertPkg as any)).not.toThrow();
    });
  });

  describe('buildEvidencePackageFromWorkerRun', () => {
    it('builds a basic evidence package', () => {
      const pkg = buildEvidencePackageFromWorkerRun({
        id: 'ev-2',
        kind: 'forensic',
        summary: 'Test forensic package',
      });
      expect(pkg.kind).toBe('forensic');
      expect(pkg.id).toBe('ev-2');
    });
  });
});
