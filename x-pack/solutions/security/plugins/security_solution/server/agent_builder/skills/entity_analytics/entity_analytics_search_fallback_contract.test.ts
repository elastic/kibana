/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { getEntityAnalyticsSkill } from './entity_analytics_skill';

/**
 * Contract checks for the empty-`security.search_entities` retry.
 *
 * On the entity-analytics-v2 "attachment side-effects" dataset the question
 * "Which users have the highest risk scores right now?" is answered from a
 * seeded entity store that holds entities with criticality but no risk score.
 * `security.search_entities` sorts by `entity.risk.calculated_score_norm DESC`
 * by default and pairs that sort with a `calculated_score_norm IS NOT NULL`
 * guard (pinned in `search_entities_tool.test.ts`), so the store's entities are
 * invisible to the query: the tool returns the
 * `No entities found matching the specified criteria.` error result and stores
 * no `security.entity` attachment. Two model families took that error at face
 * value, answered "no user entities were found" and shipped a reply without the
 * entity card (Attachments 0.00), while the families that re-queried with
 * `sortBy: 'criticality'` found both entities and rendered the card (1.00).
 *
 * The skill named the risk-score default and even said "pass sortBy:
 * 'criticality' when unscored entities must appear", but it never said what to
 * do when a search comes back empty - so an empty result read as "the store is
 * empty". These assertions pin the missing rule (and the example that the eval
 * question maps onto). Deleting the rule goes red here instead of silently in
 * an eval run; they fail against the pre-fix skill text (see the PR description
 * for the red run).
 */
const content = getEntityAnalyticsSkill({
  isEntityStoreV2Enabled: true,
  getStartServices: coreMock.createSetup().getStartServices,
  kibanaVersion: '9.0.0',
  logger: loggerMock.create(),
}).content;

/** The body that follows `heading`, up to the next `###` heading or the end of the content. */
const sectionOf = (heading: string): string => {
  const start = content.indexOf(heading);
  expect(start).toBeGreaterThan(-1);

  const rest = content.slice(start + heading.length);
  const next = rest.search(/\n### /);
  return next === -1 ? rest : rest.slice(0, next);
};

describe('entity-analytics skill states the empty-search retry contract', () => {
  const findEntities = sectionOf('### 1. Find entities');

  it('says an empty search result does not mean the entity store is empty', () => {
    expect(findEntities).toContain('An empty search result does not mean the entity store is empty');
  });

  it('quotes the empty-result error the tool actually returns', () => {
    expect(findEntities).toContain('No entities found matching the specified criteria.');
  });

  it('retries with sortBy criticality instead of reporting an empty store', () => {
    expect(findEntities).toContain('do not report an empty entity store');
    expect(findEntities).toContain("sortBy: 'criticality'");
    expect(findEntities).toMatch(/retry\s+once\s+in\s+the\s+same\s+turn/);
  });

  it('requires the retry to drop every risk-score constraint', () => {
    expect(findEntities).toContain('no** risk-score constraint');
    for (const param of ['riskScoreMin', 'riskScoreMax', 'riskLevels', 'riskScoreChangeInterval']) {
      expect(findEntities).toContain(param);
    }
  });

  it('requires the card in the reply for list/ranking answers', () => {
    expect(findEntities).toContain('A list/ranking answer always carries the card');
    expect(findEntities).toContain('renderTag');
  });

  it('does not let the agent assert that the store has no entities', () => {
    expect(findEntities).toContain('instead of asserting the store has no entities');
  });

  it('never lets an empty result license a card-less answer', () => {
    expect(content).toContain('No entities found matching the specified criteria.');
    expect(content).toContain('is the one error you must not take at face value');
  });

  it('walks the eval question through the retry in Example 1', () => {
    const example = sectionOf('### Example 1: Riskiest users');

    expect(example).toContain('Which users have the highest risk scores?');
    expect(example).toContain("sortBy: 'criticality'");
    expect(example).toMatch(/the store is not necessarily empty/);
    // The example must not fall back to reporting an empty entity store.
    expect(example).toContain('instead of reporting that the entity store has no users');
  });
});
