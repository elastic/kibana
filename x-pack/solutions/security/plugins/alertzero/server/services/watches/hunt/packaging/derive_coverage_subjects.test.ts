/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deriveCoverageSubjects } from './derive_coverage_subjects';
import type { CoverageSubjectState } from './derive_coverage_subjects';

const baseState = (overrides: Partial<CoverageSubjectState> = {}): CoverageSubjectState => ({
  reportId: 'rpt-1',
  hasConfirmedHit: false,
  techniques: [],
  corroboratedTechniques: [],
  ...overrides,
});

describe('deriveCoverageSubjects', () => {
  it('claims a confirmed hit for a technique this run corroborated', () => {
    const subjects = deriveCoverageSubjects({
      spaceId: 'default',
      investigationConversationId: 'conv-1',
      state: baseState({
        hasConfirmedHit: true,
        techniques: ['T1078.004'],
        corroboratedTechniques: ['T1078.004'],
      }),
    });

    expect(subjects).toHaveLength(1);
    expect(subjects[0].content).toBe('Hunt confirmed a hit for T1078.004 on report rpt-1.');
  });

  /**
   * The bug this test guards: Tier 1 confirms the report but Tier 2 corroborates nothing, so
   * the report-scoped fallback SSE lists every proposed technique without having confirmed any
   * of them individually. A technique only on that list must not read as confirmed.
   */
  it('does not claim a confirmed hit for a technique that was only proposed', () => {
    const subjects = deriveCoverageSubjects({
      spaceId: 'default',
      investigationConversationId: 'conv-1',
      state: baseState({
        hasConfirmedHit: true,
        techniques: ['T1078.004', 'T1021.001'],
        corroboratedTechniques: [],
      }),
    });

    expect(subjects).toHaveLength(2);
    for (const subject of subjects) {
      expect(subject.content).toBe(
        `Hunt swept ${subject.technique} on report rpt-1 with no confirmed hit.`
      );
    }
  });

  it('tells a corroborated technique apart from a merely proposed one on the same run', () => {
    const subjects = deriveCoverageSubjects({
      spaceId: 'default',
      investigationConversationId: 'conv-1',
      state: baseState({
        hasConfirmedHit: true,
        techniques: ['T1078.004', 'T1021.001'],
        corroboratedTechniques: ['T1078.004'],
      }),
    });

    const corroborated = subjects.find((s) => s.technique === 'T1078.004');
    const proposedOnly = subjects.find((s) => s.technique === 'T1021.001');
    expect(corroborated?.content).toBe('Hunt confirmed a hit for T1078.004 on report rpt-1.');
    expect(proposedOnly?.content).toBe(
      'Hunt swept T1021.001 on report rpt-1 with no confirmed hit.'
    );
  });

  it('falls back to a report-scoped subject when the run named no techniques', () => {
    const confirmed = deriveCoverageSubjects({
      spaceId: 'default',
      investigationConversationId: 'conv-1',
      state: baseState({ hasConfirmedHit: true, techniques: [] }),
    });
    expect(confirmed).toHaveLength(1);
    expect(confirmed[0].technique).toBeUndefined();
    expect(confirmed[0].content).toBe('Hunt confirmed a hit for report on report rpt-1.');

    const clean = deriveCoverageSubjects({
      spaceId: 'default',
      investigationConversationId: 'conv-1',
      state: baseState({ hasConfirmedHit: false, techniques: [] }),
    });
    expect(clean[0].content).toBe('Hunt swept report on report rpt-1 with no confirmed hit.');
  });

  it('carries the caller-resolved threatSummary, dataSources, severity, and investigationSummary onto every subject', () => {
    const subjects = deriveCoverageSubjects({
      spaceId: 'default',
      investigationConversationId: 'conv-1',
      state: baseState({
        hasConfirmedHit: true,
        techniques: ['T1078.004'],
        corroboratedTechniques: ['T1078.004'],
        threatSummary: 'Shadow admin AssumeRole',
        dataSources: ['aws-cloudtrail'],
        severity: 'high',
        investigationSummary: 'Confirmed hit; host-a isolated.',
      }),
    });

    expect(subjects[0]).toMatchObject({
      threatSummary: 'Shadow admin AssumeRole',
      dataSources: ['aws-cloudtrail'],
      severity: 'high',
      investigationSummary: 'Confirmed hit; host-a isolated.',
    });
  });

  it('defaults dataSources to an empty array when the caller supplies none', () => {
    const subjects = deriveCoverageSubjects({
      spaceId: 'default',
      investigationConversationId: 'conv-1',
      state: baseState(),
    });

    expect(subjects[0].dataSources).toEqual([]);
  });

  it('sets hasConfirmedHit per subject from the same corroboration rule as content', () => {
    const subjects = deriveCoverageSubjects({
      spaceId: 'default',
      investigationConversationId: 'conv-1',
      state: baseState({
        hasConfirmedHit: true,
        techniques: ['T1078.004', 'T1021.001'],
        corroboratedTechniques: ['T1078.004'],
      }),
    });

    expect(subjects.find((s) => s.technique === 'T1078.004')?.hasConfirmedHit).toBe(true);
    expect(subjects.find((s) => s.technique === 'T1021.001')?.hasConfirmedHit).toBe(false);
  });
});
