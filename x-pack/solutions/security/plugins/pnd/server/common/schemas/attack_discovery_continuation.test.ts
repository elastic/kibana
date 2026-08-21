/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscovery } from '@kbn/elastic-assistant-common';
import {
  buildProposalFromAttackDiscovery,
  isDiscoveryUnactionable,
} from './attack_discovery_continuation';
import { proposalSchema } from './proposal';
import { evaluateReadinessGate } from './gate';
import { DAYBREAK_PROPOSAL_SCHEMA_VERSION } from './versions';

const buildDiscovery = (overrides: Partial<AttackDiscovery> = {}): AttackDiscovery =>
  ({
    id: 'ad-uuid-1',
    alertIds: ['alert-a', 'alert-b'],
    title: 'Credential access then lateral movement on web-01',
    detailsMarkdown: '- {{ host.name web-01 }} saw {{ user.name svc }} run mimikatz',
    entitySummaryMarkdown: '{{ host.name web-01 }} {{ user.name svc }}',
    summaryMarkdown: 'Credential dumping followed by lateral movement to a domain controller.',
    mitreAttackTactics: ['Credential Access', 'Lateral Movement'],
    timestamp: '2026-08-01T12:00:00.000Z',
    ...overrides,
  } as AttackDiscovery);

const baseInput = {
  investigationId: 'inv-1',
  proposalId: 'prop-1',
  createdAt: '2026-08-01T12:05:00.000Z',
};

describe('attack_discovery_continuation (D11)', () => {
  describe('buildProposalFromAttackDiscovery', () => {
    it('projects a real AD 2.0 discovery into a schema-valid watch-ad proposal', () => {
      const proposal = buildProposalFromAttackDiscovery({
        discovery: buildDiscovery(),
        ...baseInput,
      });

      // Must satisfy the canonical proposal schema — no fabricated/invalid fields.
      expect(() => proposalSchema.parse(proposal)).not.toThrow();
      expect(proposal.sourceWatch).toBe('watch-ad');
      expect(proposal.schemaVersion).toBe(DAYBREAK_PROPOSAL_SCHEMA_VERSION);
      expect(proposal.investigationId).toBe('inv-1');
      expect(proposal.id).toBe('prop-1');
      expect(proposal.title).toBe('Credential access then lateral movement on web-01');
    });

    it('carries the real alert ids through as evidence provenance (never synthesised)', () => {
      const proposal = buildProposalFromAttackDiscovery({
        discovery: buildDiscovery({ alertIds: ['alert-x', 'alert-y', 'alert-z'] }),
        ...baseInput,
      });
      expect(proposal.evidenceRefs).toEqual(['alert-x', 'alert-y', 'alert-z']);
    });

    it('copies the discovery summary into the recommendation and details into reasoning', () => {
      const proposal = buildProposalFromAttackDiscovery({
        discovery: buildDiscovery({
          summaryMarkdown: 'SUM',
          detailsMarkdown: 'DET',
        }),
        ...baseInput,
      });
      expect(proposal.recommendation).toBe('Assess attack — SUM');
      expect(proposal.reasoning).toBe('DET');
    });

    it('emits confidence 0 (AD carries no numeric confidence) — fail-closed to human review', () => {
      const proposal = buildProposalFromAttackDiscovery({
        discovery: buildDiscovery(),
        ...baseInput,
      });
      expect(proposal.confidence).toBe(0);

      // Because confidence is 0, the shared readiness gate must refuse to let it
      // reach `approved` even though it has evidence + a recommendation.
      const gate = evaluateReadinessGate(proposal, 'approved');
      expect(gate.approved).toBe(false);
      if (!gate.approved) {
        expect(gate.failure.missingRequirements).toContain('confidence');
      }
    });

    it('falls back to an alert-count recommendation when the summary is empty', () => {
      const proposal = buildProposalFromAttackDiscovery({
        discovery: buildDiscovery({ summaryMarkdown: '', alertIds: ['a', 'b'] }),
        ...baseInput,
      });
      expect(proposal.recommendation).toBe('Assess attack — review 2 correlated alert(s)');
    });

    it('falls back to a synthetic title only from real ids when title is empty', () => {
      const proposal = buildProposalFromAttackDiscovery({
        discovery: buildDiscovery({ title: '', id: 'ad-77' }),
        ...baseInput,
      });
      expect(proposal.title).toBe('Attack Discovery ad-77');
    });

    it('throws (fail-closed) on an unactionable discovery — no alerts and no summary', () => {
      expect(() =>
        buildProposalFromAttackDiscovery({
          discovery: buildDiscovery({ alertIds: [], summaryMarkdown: '  ' }),
          ...baseInput,
        })
      ).toThrow(/unactionable/);
    });

    it('still builds when there are no alerts but a real summary exists', () => {
      const proposal = buildProposalFromAttackDiscovery({
        discovery: buildDiscovery({ alertIds: [], summaryMarkdown: 'threat narrative' }),
        ...baseInput,
      });
      expect(proposal.evidenceRefs).toEqual([]);
      expect(proposal.recommendation).toBe('Assess attack — threat narrative');
    });
  });

  describe('isDiscoveryUnactionable', () => {
    it('is true only when both alert basis and summary are absent', () => {
      const unactionable = (overrides: Partial<AttackDiscovery>) =>
        isDiscoveryUnactionable(buildDiscovery(overrides));

      expect(unactionable({ alertIds: [], summaryMarkdown: '' })).toBe(true);
      expect(unactionable({ alertIds: ['a'], summaryMarkdown: '' })).toBe(false);
      expect(unactionable({ alertIds: [], summaryMarkdown: 'x' })).toBe(false);
    });
  });
});
