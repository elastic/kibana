/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  canonicalProposalsMapping,
  evidenceMapping,
  incidentsMapping,
  investigationsMapping,
  proposalsMapping,
  workerEvaluationsMapping,
} from './mappings';

type Props = Record<string, { type?: string; properties?: Props }>;

const props = (mapping: { properties?: unknown }): Props => (mapping.properties ?? {}) as Props;

describe('PND index mappings', () => {
  const all = {
    investigations: investigationsMapping,
    proposals: proposalsMapping,
    incidents: incidentsMapping,
    canonicalProposals: canonicalProposalsMapping,
    evidence: evidenceMapping,
    workerEvaluations: workerEvaluationsMapping,
  };

  it.each(Object.entries(all))(
    '%s is explicitly mapped and does not fall back to dynamic mapping',
    (_name, mapping) => {
      // `dynamic: true` is what produced text+`.keyword` fields and let the
      // first-written document decide a field's type.
      expect(mapping.dynamic).toBe(false);
      expect(Object.keys(props(mapping)).length).toBeGreaterThan(0);
    }
  );

  describe('templated record discriminators', () => {
    it.each([
      ['investigations', investigationsMapping],
      ['proposals', proposalsMapping],
      ['incidents', incidentsMapping],
    ])('%s maps template_id/template_version so they can be filtered', (_name, mapping) => {
      expect(props(mapping).template_id.type).toBe('keyword');
      expect(props(mapping).template_version.type).toBe('integer');
    });
  });

  describe('regression: identifiers must be keyword, not text', () => {
    // Guards the `investigationId.keyword` term query that only worked because
    // dynamic mapping added a `.keyword` subfield. Under explicit mappings that
    // path does not exist and the query silently returns zero hits.
    it('proposals.investigationId is a keyword', () => {
      expect(props(proposalsMapping).investigationId.type).toBe('keyword');
    });

    it('proposals.parentConversationId is a keyword', () => {
      expect(props(proposalsMapping).parentConversationId.type).toBe('keyword');
    });

    it('incidents.forkedFromInvestigationId is a keyword', () => {
      expect(props(incidentsMapping).forkedFromInvestigationId.type).toBe('keyword');
    });
  });

  describe('regression: 0..1 scores must be float, not long', () => {
    // A confidence of `1` under dynamic mapping mapped the field as `long`, and
    // every later `0.85` was then indexed as `0` while `_source` still showed
    // 0.85 — a silent, invisible corruption of every range query and aggregation.
    it('proposals.confidence is a float', () => {
      expect(props(proposalsMapping).confidence.type).toBe('float');
    });

    it('canonical proposals.confidence is a float', () => {
      expect(props(canonicalProposalsMapping).confidence.type).toBe('float');
    });

    it('evidence.confidence is a float', () => {
      expect(props(evidenceMapping).confidence.type).toBe('float');
    });

    it('worker evaluations.confidence is a float', () => {
      expect(props(workerEvaluationsMapping).confidence.type).toBe('float');
    });

    it('detection change signal gap confidence is a float', () => {
      const signals = props(investigationsMapping).detectionChangeSignals;
      const gaps = props(signals).gaps;
      expect(props(gaps).confidence.type).toBe('float');
    });
  });

  describe('event arrays are nested', () => {
    // `object` would flatten the array and match "a triage event by watch-dark"
    // against a triage event by someone else plus a different event by watch-dark.
    it.each([
      ['investigations', investigationsMapping],
      ['proposals', proposalsMapping],
      ['incidents', incidentsMapping],
    ])('%s.events is nested', (_name, mapping) => {
      expect(props(mapping).events.type).toBe('nested');
    });

    it('detectionChangeSignals and its gaps are nested', () => {
      const signals = props(investigationsMapping).detectionChangeSignals;
      expect(signals.type).toBe('nested');
      expect(props(signals).gaps.type).toBe('nested');
    });
  });

  describe('analyst decision fields are aggregatable', () => {
    // InfoSec (customer zero) called structured closure metadata a blocker:
    // these back the TP/FP feedback loop, so they must be aggregatable keywords.
    it.each(['status', 'dismissalReason', 'assignee', 'sourceWatchId', 'type'])(
      'proposals.%s is a keyword',
      (field) => {
        expect(props(proposalsMapping)[field].type).toBe('keyword');
      }
    );

    it.each(['status', 'severity', 'assignee', 'watch_tier', 'recommendedAction'])(
      'investigations.%s is a keyword',
      (field) => {
        expect(props(investigationsMapping)[field].type).toBe('keyword');
      }
    );
  });

  it('priorityScore is numeric so queue sorting needs no unmapped_type fallback', () => {
    expect(props(investigationsMapping).priorityScore.type).toBe('integer');
  });

  it('date fields are mapped as dates', () => {
    expect(props(investigationsMapping).createdAt.type).toBe('date');
    expect(props(investigationsMapping).updatedAt.type).toBe('date');
    expect(props(proposalsMapping).sla.type).toBe('date');
  });

  it('decidedAt is mapped as date for post-approval sorting', () => {
    expect(props(proposalsMapping).decidedAt.type).toBe('date');
  });
});
