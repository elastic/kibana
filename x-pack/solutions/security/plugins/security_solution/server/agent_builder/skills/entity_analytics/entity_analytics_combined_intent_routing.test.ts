/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEntityAnalyticsSkill } from './entity_analytics_skill';
import type { EntityAnalyticsSkillsContext } from './entity_analytics_skill';

/**
 * Contract checks for the combined-intent rule of the Entity Store V2 entity-analytics skill:
 * a question that mixes entity attribute/risk filtering with an anomaly or behaviour question
 * must route to the entity tool AND `find.security.ml.jobs` in the same turn.
 *
 * Build 01a14b73, commit 8f4c1fcc: dataset "entity-analytics-v2: multi-skill routing"
 * (x-pack/solutions/security/packages/kbn-evals-suite-entity-analytics/evals/v2/entity_store_v2_multi_skill.spec.ts)
 * asserts two toolCalls per example and requires all of them to pass. ToolCalls was 0.00 for 6/6
 * families on ex=2 ("Find business-critical hosts with unusual lateral movement activity") and
 * ex=3 ("Show me privileged users on watchlists who also have anomalous administrative actions"):
 * opus, sonnet, gemini-3.0-flash, gemini-3.1-pro and gpt-5.4 called the entity tool with the
 * arguments the criterion names and never called find.security.ml.jobs, while gemini-3.0-flash did
 * the reverse on ex=3. The judge named the missing half ("Tool \"find.security.ml.jobs\" was not
 * called."). The skill named the ML-jobs skill only as a separate "Related Skills" pointer, never
 * as a same-turn companion of the entity tool, so each family answered one half and stopped.
 *
 * These assertions pin the rule and one worked example per combined question, so that deleting
 * either goes red here instead of silently in an eval run. They fail against the pre-fix content.
 */

const ML_JOBS_SKILL_PATH = '~/skills/security/ml/find-security-ml-jobs';
const ML_JOBS_TOOL = 'find.security.ml.jobs';

/**
 * The questions of dataset "entity-analytics-v2: multi-skill routing", verbatim from
 * evals/v2/entity_store_v2_multi_skill.spec.ts (examples 0-3), with the entity tool each example
 * asserts for the entity half.
 */
const COMBINED_QUESTIONS = [
  {
    question: 'Show me the risk profile for user Cielo39 and any anomalous behavior detected',
    entityTool: 'security.get_entity',
  },
  {
    question: 'Which high-risk entities also have anomalous login patterns?',
    entityTool: 'security.search_entities',
  },
  {
    question: 'Find business-critical hosts with unusual lateral movement activity',
    entityTool: 'security.search_entities',
  },
  {
    question:
      'Show me privileged users on watchlists who also have anomalous administrative actions',
    entityTool: 'security.search_entities',
  },
];

/** The skill content an Entity Store V2 agent receives. */
const v2Content = (): string => {
  const ctx = {
    isEntityStoreV2Enabled: true,
    kibanaVersion: '9.4.0',
    getStartServices: jest.fn(),
    logger: jest.fn(),
  };
  return getEntityAnalyticsSkill(ctx as unknown as EntityAnalyticsSkillsContext).content;
};

/** The section body that follows `heading`, up to the next `##` / `###` heading. */
const sectionOf = (content: string, heading: string): string => {
  const start = content.indexOf(heading);
  expect(start).toBeGreaterThan(-1);
  const rest = content.slice(start + heading.length);
  const next = rest.search(/\n#{2,3} /);
  return next === -1 ? rest : rest.slice(0, next);
};

/** The bold-labelled routing paragraph that starts with `marker`, up to the blank line. */
const paragraphOf = (content: string, marker: string): string => {
  const start = content.indexOf(marker);
  expect(start).toBeGreaterThan(-1);
  const rest = content.slice(start);
  const end = rest.indexOf('\n\n');
  return end === -1 ? rest : rest.slice(0, end);
};

/** The worked example for `question`, up to the next `###` heading. */
const exampleOf = (content: string, question: string): string => {
  const start = content.indexOf(`User: ${question}`);
  expect(start).toBeGreaterThan(-1);
  const rest = content.slice(start);
  const next = rest.slice(1).search(/\n#{2,3} /);
  return next === -1 ? rest : rest.slice(0, next + 1);
};

describe('entity-analytics skill (Entity Store V2): combined-intent routing rule', () => {
  it('requires both tool families in the same turn for a mixed entity + anomaly question', () => {
    const routing = paragraphOf(v2Content(), '**Combined intent');

    expect(routing).toContain(ML_JOBS_TOOL);
    expect(routing).toContain(ML_JOBS_SKILL_PATH);
    expect(routing).toContain('security.search_entities');
    expect(routing).toContain('security.get_entity');
    expect(routing).toContain('both halves in the same turn, before you answer');
  });

  it('keeps the anomaly half from being deferred to a later turn or another skill', () => {
    const routing = paragraphOf(v2Content(), '**Combined intent');

    expect(routing).toContain('the ML-jobs call is not optional follow-up work');
    expect(routing).toContain('a different anomaly skill does not stand in for it');
    expect(routing).toContain('a later turn is too late');
  });

  it('repeats the same-turn rule in the Related Skills section', () => {
    const related = sectionOf(v2Content(), '## Related Skills');

    expect(related).toContain(ML_JOBS_SKILL_PATH);
    expect(related).toContain(ML_JOBS_TOOL);
    expect(related).toContain('in the same turn, before you answer');
  });
});

describe('entity-analytics skill (Entity Store V2): one worked example per combined question', () => {
  it.each(COMBINED_QUESTIONS)(
    'the example for "$question" names both tool families in the same turn',
    ({ question, entityTool }) => {
      const example = exampleOf(v2Content(), question);

      expect(example).toContain(ML_JOBS_SKILL_PATH);
      expect(example).toContain(ML_JOBS_TOOL);
      expect(example).toContain(entityTool);
      expect(example).toContain('same turn');
    }
  );
});
