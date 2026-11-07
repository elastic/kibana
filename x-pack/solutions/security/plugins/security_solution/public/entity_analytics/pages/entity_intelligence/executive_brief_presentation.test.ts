/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BriefAgentFinding } from './executive_brief_agents';
import { briefCoverageStatusLabel, briefFindingDescription } from './executive_brief_presentation';

const finding: BriefAgentFinding = {
  kind: 'new_tool',
  toolName: 'exec_command',
  observed: 1,
  baseline: 0,
  threshold: 1,
  baselineSampleSize: 5,
};

describe('executive brief finding presentation', () => {
  it('labels capped source evidence as partial', () => {
    expect(briefCoverageStatusLabel('partial')).toBe('Partial evidence');
  });

  it('describes a newly observed tool relative to its comparable history', () => {
    expect(briefFindingDescription(finding)).toBe(
      'exec_command: 1 observation; absent from 5 comparable prior sessions.'
    );
  });

  it('converts failure rate fractions to percentages of known outcomes', () => {
    expect(
      briefFindingDescription({
        ...finding,
        kind: 'failure_rate_increase',
        observed: 0.45,
        baseline: 0.1,
      })
    ).toBe('Known-outcome failure rate: 45% versus 10% in the baseline.');
  });

  it('keeps missing baselines distinct from zero when formatting durations or observation counts', () => {
    expect(
      briefFindingDescription({
        ...finding,
        kind: 'duration_increase',
        observed: 12000,
        baseline: undefined,
      })
    ).toBe('Recorded duration: 12,000 ms versus a baseline median of — ms.');
    expect(
      briefFindingDescription({
        ...finding,
        kind: 'tool_volume_increase',
        observed: 50,
        baseline: 0,
        threshold: 20,
      })
    ).toBe('Tool observations: 50 versus a baseline median of 0; threshold 20.');
  });
});
