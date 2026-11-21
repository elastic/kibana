/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line import/no-nodejs-modules
import fs from 'fs';
// eslint-disable-next-line import/no-nodejs-modules
import path from 'path';

/**
 * The attachment side-effects spec asserts that `security.search_entities` was called in a way
 * that orders results by risk score. The tool documents that ordering as its *default*: its
 * `sortBy` description reads `Defaults to "riskScore" (entity.risk.calculated_score_norm)` and
 * states the ordering is always descending, so a call that omits `sortBy` and the risk filters
 * already returns the risk-ordered entities the criterion is after.
 *
 * A criterion that only accepts an explicit parameter fails such calls textually while the
 * behaviour it is after happened. Three families failed exactly that way on a weekly eval build
 * (finding F13): each called `security.search_entities` with only `{entityTypes: [user]}`, got
 * the risk-ordered users back, and was still scored 0 by the ToolCalls evaluator.
 *
 * The spec is a Playwright spec, so it cannot be imported into jest. These checks read both
 * sources and assert the two still agree:
 *
 *   - the tool still documents risk-score ordering as its default sort, and
 *   - every risk-ordering criterion in the spec names that default as an accepted way to
 *     satisfy it, so the fixture cannot drift back into requiring a parameter spelling the
 *     tool's default already provides.
 */
const SPEC_PATH = path.resolve(__dirname, '../evals/v2/entity_attachment_side_effect.spec.ts');
const TOOL_PATH = path.resolve(
  __dirname,
  '../../../plugins/security_solution/server/agent_builder/tools/entity_analytics/search_entities_tool.ts'
);

const specSource = fs.readFileSync(SPEC_PATH, 'utf8');
const toolSource = fs.readFileSync(TOOL_PATH, 'utf8');

const SEARCH_ENTITIES_ASSERTION = "id: 'security.search_entities'";

const searchEntitiesCriteria = specSource
  .split(SEARCH_ENTITIES_ASSERTION)
  .slice(1)
  .flatMap((chunk) => {
    const start = chunk.indexOf('criteria: [');
    if (start === -1) {
      return [];
    }
    const block = chunk.slice(start, chunk.indexOf(']', start));
    return [...block.matchAll(/'((?:\\.|[^'\\])*)'/g)].map((match) => match[1]);
  });

const sortByDescription = toolSource.slice(toolSource.indexOf('sortBy: z'));

describe('entity-analytics attachment side-effects spec vs the search_entities tool', () => {
  it('has criteria to check (guards the source scan itself)', () => {
    expect(searchEntitiesCriteria.length).toBeGreaterThan(0);
  });

  it('keeps the tool default risk-score ordering the criterion relies on', () => {
    expect(sortByDescription).not.toHaveLength(0);
    expect(sortByDescription).toMatch(/Defaults to "riskScore"/);
  });

  it('accepts the documented default as well as an explicit sort or filter parameter', () => {
    const riskOrderingCriteria = searchEntitiesCriteria.filter((criterion) =>
      /risk score/i.test(criterion)
    );

    expect(riskOrderingCriteria.length).toBeGreaterThan(0);

    const requiringAnExplicitParameter = riskOrderingCriteria.filter(
      (criterion) => !/default/i.test(criterion)
    );

    expect(requiringAnExplicitParameter).toEqual([]);
  });
});
