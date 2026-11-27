/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEntityAnalyticsSkill } from './entity_analytics_skill';
import type { EntityAnalyticsSkillsContext } from './entity_analytics_skill';

/**
 * Contract checks for the risk-score grounding caveat rule of the Entity Store V2
 * entity-analytics skill.
 *
 * The eval dataset "entity-analytics-v2: search entities" example 8 asks
 * 'Are there any critical-risk hosts right now, and is that risk data current?' and carries the
 * criterion 'If the risk score grounding signal reports started, do not add an unnecessary
 * "scoring is current" caveat.' Every model family scored 0.75 on that cell with exactly that
 * criterion failing: with `riskScoreGrounding.status` = `started` the answers volunteered
 * "The risk scoring engine is actively running, so the data is current and up to date" /
 * "scores are up to date". The old grounding bullet ("`started` - scoring is current; say
 * nothing") states the prohibited sentence as a fact the model then restated, and it gave the
 * model no rule for the case where the user's question itself asks about data freshness.
 *
 * These assertions pin the branch decision and the worked example for that question form, so
 * removing either goes red here instead of silently costing the cell again. They fail against
 * the pre-fix skill text.
 */

const v2Content = (): string => {
  const ctx = {
    isEntityStoreV2Enabled: true,
    kibanaVersion: '9.4.0',
    getStartServices: jest.fn(),
    logger: jest.fn(),
  };
  return getEntityAnalyticsSkill(ctx as unknown as EntityAnalyticsSkillsContext).content;
};

/** Whitespace-collapsed view of the skill, so assertions survive re-wrapping. */
const normalized = (text: string): string => text.replace(/\s+/g, ' ');

/** The body that follows `heading`, up to `nextHeading`. */
const sectionOf = (content: string, heading: string, nextHeading: string): string => {
  const start = content.indexOf(heading);
  expect(start).toBeGreaterThan(-1);
  const end = content.indexOf(nextHeading, start);
  expect(end).toBeGreaterThan(start);
  return normalized(content.slice(start, end));
};

const groundingSection = (): string =>
  sectionOf(v2Content(), '### 4. Risk score grounding', '### 5. Recommend next steps');

const freshnessExample = (): string =>
  sectionOf(v2Content(), '### Example 9:', '## Best Practices');

describe('entity analytics skill - risk score grounding caveat', () => {
  it('reads the grounding status from the tool result', () => {
    expect(groundingSection()).toContain('riskScoreGrounding.status');
  });

  it('never states that scoring is current when the maintainer is started', () => {
    const grounding = groundingSection();
    // The pre-fix bullet read "`started` — scoring is current; say nothing", which answers echoed
    // back to the user as "the data is current and up to date".
    expect(grounding).not.toContain('scoring is current; say nothing');
    expect(grounding).toContain("Say nothing about the risk data's currency or status");
  });

  it('names the currency phrasings the answer must not contain', () => {
    const grounding = groundingSection();
    expect(grounding).toContain('never write "the data is current"');
    expect(grounding).toContain('"up to date"');
    expect(grounding).toContain('"scores are up to date"');
    expect(grounding).toContain('never add a "scoring is current"');
  });

  it('forbids the caveat even when the question asks whether the data is current', () => {
    const grounding = groundingSection();
    expect(grounding).toContain("even when the user's question asks whether the data is current");
    expect(grounding).toContain('do not answer the freshness part with a currency claim');
  });

  it('explains that a running maintainer does not mean the scores are current', () => {
    expect(groundingSection()).toContain('reports only that the maintainer process is running');
  });

  it('keeps the stale branches: stopped and never_started must caveat, not declare the environment safe', () => {
    const grounding = groundingSection();
    expect(grounding).toContain('lastScoreTimeAgo');
    expect(grounding).toContain('do not call the environment safe');
  });
});

describe('entity analytics skill - worked example for the freshness question form', () => {
  it('answers the dataset example question verbatim', () => {
    expect(normalized(v2Content())).toContain(
      'Are there any critical-risk hosts right now, and is that risk data current?'
    );
  });

  it('keeps the entity half of the answer (host filter, Critical level, empty-result wording)', () => {
    const example = freshnessExample();
    expect(example).toContain("entityTypes: ['host']");
    expect(example).toContain("riskLevels: ['Critical']");
    expect(example).toContain('state plainly that no critical-risk hosts were found');
  });

  it('repeats the caveat prohibition next to the freshness answer', () => {
    const example = freshnessExample();
    expect(example).toContain(
      'do **not** write "the risk scoring engine is running, so the data is current and up to date"'
    );
    expect(example).toContain('any other scoring-is-current caveat');
    expect(example).toContain(
      'do not upgrade an empty result into "your environment is clean / safe"'
    );
  });
});
