/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { validateSkillDefinition } from '@kbn/agent-builder-server/skills/type_definition';
import { SECURITY_SEARCH_ENTITIES_TOOL_ID } from '../../tools';
import {
  getEntityAnalyticsSkill,
  type EntityAnalyticsSkillsContext,
} from './entity_analytics_skill';

const createSkill = (isEntityStoreV2Enabled = true) =>
  getEntityAnalyticsSkill({
    isEntityStoreV2Enabled,
    getStartServices: jest.fn(),
    kibanaVersion: '9.4.0',
    logger: loggingSystemMock.createLogger(),
  } as unknown as EntityAnalyticsSkillsContext);

/**
 * Slice of the content between `from` (exclusive) and the first `to` (exclusive).
 * Fails loudly when either marker is gone, so a heading rename cannot turn an
 * assertion into a vacuous pass.
 */
const between = (content: string, from: string, to: string): string => {
  const start = content.indexOf(from);
  expect(start).toBeGreaterThanOrEqual(0);
  const rest = content.slice(start + from.length);
  const end = rest.indexOf(to);
  expect(end).toBeGreaterThanOrEqual(0);
  return rest.slice(0, end);
};

describe('entity-analytics skill (entity store v2)', () => {
  const skill = createSkill();
  const content = skill.content;

  it('validates as a skill definition', async () => {
    await expect(validateSkillDefinition(skill as never)).resolves.toBeDefined();
  });

  it('exposes the entity store v2 tool set', async () => {
    expect(await skill.getRegistryTools?.()).toContain(SECURITY_SEARCH_ENTITIES_TOOL_ID);
  });

  // The regression this suite pins: `security.search_entities` adds
  // `calculated_score_norm IS NOT NULL` to every risk-score ordering
  // (default, explicit `sortBy: 'riskScore'`, and any `riskScoreMax` /
  // positive `riskScoreMin` bound — see
  // `buildRiskAndAssetCriticalityFilterClauses` in search_entities_tool.ts).
  // A store whose risk scoring has not run yet therefore returns ZERO rows
  // for a ranking question, and a skill that only says "rely on the default
  // sort" leads the model to answer "no users found" instead of retrying with
  // the criticality ranking that keeps the unscored entities. The eval that
  // caught this is
  // kbn-evals-suite-entity-analytics/evals/v2/entity_attachment_side_effect.spec.ts
  // ex=1, where two seeded users carry no risk score and the Attachments
  // assertion requires a `security.entity` table.
  describe('unscored-store recovery for ranking searches', () => {
    const findEntities = between(content, '### 1. Find entities', '\n## ');

    it('teaches the retry in the find-entities step', () => {
      expect(findEntities).toMatch(/retry/i);
      expect(findEntities).toContain("sortBy: 'criticality'");
      expect(findEntities).toMatch(/no score bounds/);
    });

    it('names the tool guard the retry compensates for', () => {
      expect(findEntities).toContain('calculated_score_norm IS NOT NULL');
      expect(findEntities).toMatch(/zero rows/);
    });

    it('requires the renderTag from the retried call, not just prose', () => {
      expect(findEntities).toMatch(/renderTag/);
      expect(findEntities).toMatch(/security\.entity\` table/);
    });

    it('forbids answering a ranking question from an empty risk-sorted search alone', () => {
      expect(findEntities).toMatch(/Never answer "no <entities> found"/);
    });

    it('puts the retry in the riskiest-users example', () => {
      const example = between(content, '### Example 1: Riskiest users', '### Example 2');

      expect(example).toMatch(/Zero results → retry once with `sortBy: 'criticality'`/);
      expect(example).toMatch(/Render the `renderTag` verbatim/);
      expect(example).toMatch(/empty risk-sorted search is never the final answer/);
    });

    it('states the rule in the attachment contract as well', () => {
      const contract = between(content, '## Attachment contract', '\n## ');

      expect(contract).toMatch(/Empty risk-sorted search ≠ empty entity store/);
      expect(contract).toContain("retry with `sortBy: 'criticality'`");
    });
  });

  describe('attachment contract does not regress', () => {
    it('keeps the verbatim-copy rule and the no-tag-without-renderTag rule', () => {
      expect(content).toMatch(/No `renderTag` in the result → no tag in your reply/);
      expect(content).toMatch(/do not invent a tag/);
      expect(content).toMatch(/copy that `renderTag` string VERBATIM|Copy the `renderTag`/);
    });

    it('keeps the blank-line rule between a tag and prose', () => {
      expect(content).toMatch(/Always insert a blank line/);
    });

    it('keeps the ban on duplicating attachment contents in prose', () => {
      expect(content).toMatch(/Never duplicate attachment contents in prose/);
    });
  });
});
