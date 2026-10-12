/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evidence } from '../../../../../common/entity_analytics/executive_brief/evidence';
import { EMPTY_EVIDENCE, FIXTURE_EVIDENCE } from '../verification/__fixtures__/evidence';
import { formatEvidence } from './format_evidence';

const lines = (evidence: Evidence = FIXTURE_EVIDENCE): string[] =>
  formatEvidence(evidence).split('\n');

describe('formatEvidence', () => {
  it('lists entities by ENT id with their attributes and never their names', () => {
    const text = formatEvidence(FIXTURE_EVIDENCE);
    expect(lines()).toContain(
      'ENT-1 user · risk Critical (score 92.5) · criticality high_impact · privileged · watchlists: Privileged users · 2 resolved aliases'
    );
    Object.values(FIXTURE_EVIDENCE.entities).forEach(({ name, euid }) => {
      expect(text).not.toContain(name);
      expect(text).not.toContain(euid);
    });
  });

  it('replaces names in fact titles with ENT ids and removes UUIDs', () => {
    expect(lines()).toContain(
      'F-2 [high] 2026-10-06T10:00Z "Alerts on ENT-1" | entities: ENT-1, ENT-2 | numbers: alerts=57, rules=4 | tactics: Credential Access'
    );
    expect(formatEvidence(FIXTURE_EVIDENCE)).not.toMatch(/8f14e45f/);
  });

  it('groups facts by signal and kind, in signal order, most severe first', () => {
    const headers = lines().filter((line) => line.startsWith('## '));
    expect(headers).toEqual([
      '## Entities (7)',
      '## Attack discoveries — attack_discovery (1)',
      '## Alert activity — alert_activity (3)',
      '## High-risk entities — high_risk_entity (1)',
      '## Relationships — relationship_first_seen (1)',
      '## Links (4)',
      '## Signals',
    ]);
    const all = lines();
    const alertSection = all
      .slice(all.indexOf('## Alert activity — alert_activity (3)') + 1)
      .slice(0, 3);
    expect(alertSection.map((line) => line.split(' ')[0])).toEqual(['F-2', 'F-4', 'F-6']);
  });

  it('renders links with the allowed wording', () => {
    expect(lines()).toContain(
      'L-2 ENT-1 → ENT-3: "logged on to (rarely)" (accesses_rarely) | backed by: F-5 | first seen: 2026-10-06T09:00Z'
    );
    expect(lines()).toContain('L-4 ENT-5 → ENT-6: "owns" (owns)');
  });

  it('says which signals were not checked and why', () => {
    expect(lines()).toEqual(
      expect.arrayContaining([
        '- Attack discoveries: checked, 1 fact, 1 link',
        '- Response status: not checked (unavailable: Cases are not available in this space)',
        '- Risk history: not checked (timed out)',
      ])
    );
  });

  it('renders a new signal and fact kind with no formatter changes', () => {
    const evidence: Evidence = {
      ...FIXTURE_EVIDENCE,
      facts: [
        ...FIXTURE_EVIDENCE.facts,
        {
          id: 'F-7',
          kind: 'lead',
          signalId: 'brand_new_signal',
          title: 'Lead about j.chen',
          entities: ['ENT-5'],
          numbers: { observations: 5 },
          details: { priority: 'high' },
        },
      ],
      signals: [
        ...FIXTURE_EVIDENCE.signals,
        {
          id: 'brand_new_signal',
          title: 'Brand new signal',
          capability: 'hunting_leads',
          status: 'empty',
          durationMs: 3,
          factCount: 0,
          linkCount: 0,
        },
      ],
    };
    const all = lines(evidence);
    expect(all).toContain('## Brand new signal — lead (1)');
    expect(all).toContain(
      'F-7 "Lead about ENT-5" | entities: ENT-5 | numbers: observations=5 | priority: high'
    );
    expect(all).toContain('- Brand new signal: checked, nothing found');
  });

  it('renders empty evidence', () => {
    expect(lines(EMPTY_EVIDENCE)).toEqual([
      '## Entities (0)',
      'None',
      '',
      '## Facts (0)',
      'None found in this window.',
      '',
      '## Links (0)',
      'None',
      '',
      '## Signals',
      'None ran',
    ]);
  });

  it('is deterministic', () => {
    expect(formatEvidence(FIXTURE_EVIDENCE)).toBe(formatEvidence(FIXTURE_EVIDENCE));
  });
});
