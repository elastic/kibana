/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseCsvString, securitySkillsExamples } from './security_skills_dataset';

const HEADER =
  'category,query_intent,query,expected_skill,should_not_activate_skill,expected_only_tool_id,tool_sequence,dataset_split,is_distractor,reference,notes';

const validRow = (overrides: Record<string, string> = {}) => {
  const defaults: Record<string, string> = {
    category: 'find-rules',
    query_intent: 'Rule Discovery',
    query: 'List all enabled detection rules.',
    expected_skill: 'find-security-rules',
    should_not_activate_skill: '',
    expected_only_tool_id: 'security.find_rules',
    tool_sequence: 'security.find_rules',
    dataset_split: 'base',
    is_distractor: '',
    reference: 'Found enabled detection rules.',
    notes: '',
  };
  const merged = { ...defaults, ...overrides };
  return [
    merged.category,
    merged.query_intent,
    merged.query,
    merged.expected_skill,
    merged.should_not_activate_skill,
    merged.expected_only_tool_id,
    merged.tool_sequence,
    merged.dataset_split,
    merged.is_distractor,
    merged.reference,
    merged.notes,
  ].join(',');
};

const csvOf = (...rows: string[]) => [HEADER, ...rows].join('\n');

describe('security_skills_dataset CSV parsing', () => {
  it('parses a well-formed row into a SecuritySkillsExample', () => {
    const examples = parseCsvString(csvOf(validRow()));
    expect(examples).toHaveLength(1);
    expect(examples[0]).toEqual({
      input: { question: 'List all enabled detection rules.' },
      expected: {
        reference: 'Found enabled detection rules.',
        expectedSkill: 'find-security-rules',
        tool_sequence: ['security.find_rules'],
      },
      metadata: {
        category: 'find-rules',
        query_intent: 'Rule Discovery',
        dataset_split: ['base'],
        expectedOnlyToolId: 'security.find_rules',
        tool_sequence: ['security.find_rules'],
      },
    });
  });

  it('parses a distractor row using shouldNotActivateSkill', () => {
    const examples = parseCsvString(
      csvOf(
        validRow({
          category: 'distractor',
          expected_skill: '',
          should_not_activate_skill: 'find-security-rules',
          expected_only_tool_id: '',
          tool_sequence: '',
          dataset_split: 'distractor',
          is_distractor: 'true',
          query: 'Show me the available dashboards.',
          reference: 'This is a platform query, not a security skill task.',
        })
      )
    );
    expect(examples).toHaveLength(1);
    expect(examples[0].expected.shouldNotActivateSkill).toBe('find-security-rules');
    expect(examples[0].expected.expectedSkill).toBeUndefined();
    expect(examples[0].metadata.is_distractor).toBe(true);
    expect(examples[0].metadata.dataset_split).toEqual(['distractor']);
  });

  it('splits pipe-delimited tool_sequence and dataset_split lists', () => {
    const examples = parseCsvString(
      csvOf(
        validRow({
          tool_sequence: 'security.find_rules|security.enable_rule',
          dataset_split: 'base|regression',
        })
      )
    );
    expect(examples[0].expected.tool_sequence).toEqual([
      'security.find_rules',
      'security.enable_rule',
    ]);
    expect(examples[0].metadata.dataset_split).toEqual(['base', 'regression']);
  });

  it('throws when query is missing', () => {
    expect(() => parseCsvString(csvOf(validRow({ query: '' })))).toThrow(/"query" is required/);
  });

  it('throws when reference is missing', () => {
    expect(() => parseCsvString(csvOf(validRow({ reference: '' })))).toThrow(
      /"reference" is required/
    );
  });

  it('throws when category is not find-rules or distractor', () => {
    expect(() => parseCsvString(csvOf(validRow({ category: 'bogus' })))).toThrow(
      /"category" must be one of/
    );
  });

  it('throws when neither expected_skill nor should_not_activate_skill is set', () => {
    expect(() =>
      parseCsvString(csvOf(validRow({ expected_skill: '', should_not_activate_skill: '' })))
    ).toThrow(/one of "expected_skill" or "should_not_activate_skill" is required/);
  });

  it('throws when both expected_skill and should_not_activate_skill are set', () => {
    expect(() =>
      parseCsvString(
        csvOf(validRow({ expected_skill: 'find-security-rules', should_not_activate_skill: 'x' }))
      )
    ).toThrow(/mutually exclusive/);
  });
});

describe('securitySkillsExamples (loaded from security_skills_dataset.csv)', () => {
  it('loads at least one happy-path and one distractor example from disk', () => {
    expect(securitySkillsExamples.length).toBeGreaterThan(0);
    expect(securitySkillsExamples.some((ex) => ex.metadata.category === 'find-rules')).toBe(true);
    expect(securitySkillsExamples.some((ex) => ex.metadata.category === 'distractor')).toBe(true);
  });
});
