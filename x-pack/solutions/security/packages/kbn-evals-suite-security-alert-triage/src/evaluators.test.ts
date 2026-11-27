/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools, ToolResultType } from '@kbn/agent-builder-common';
import type { ToolingLog } from '@kbn/tooling-log';
import { createEvidenceLookupEvaluator } from './evaluators';

const log = { info: jest.fn() } as unknown as ToolingLog;

const PROJECTED_QUERY = 'FROM logs-* | WHERE user.name == "jsmith" | KEEP user.name, failures';

const esqlStep = (values: unknown[][], query: string = PROJECTED_QUERY) => ({
  type: 'tool_call',
  tool_id: platformCoreTools.executeEsql,
  results: [{ type: ToolResultType.esqlResults, data: { query, columns: [], values } }],
});

const score = async (steps: unknown[]) => {
  const { score: result } = await createEvidenceLookupEvaluator(log).evaluate({
    output: { steps },
  });
  return result;
};

// Why: the evidence case must show that the agent found the events behind the alerts. The ES|QL tool
// returns an esql_results entry for every query, so a search over the wrong time window must not pass.
// Only an aggregate without BY returns a row of zeros over zero matches. A projected event row is a
// match whatever its values are.
describe('createEvidenceLookupEvaluator', () => {
  it('scores 1 when a query returns event rows', async () => {
    expect(await score([esqlStep([['jsmith', 20]])])).toBe(1);
  });

  it('scores 0 when the query returns no rows', async () => {
    expect(await score([esqlStep([])])).toBe(0);
  });

  it('scores 0 for an ungrouped aggregate over zero matches, which returns a row of zeros', async () => {
    const countQuery = 'FROM logs-* | WHERE user.name == "nobody" | STATS failures = COUNT(*)';
    const mixedQuery = 'FROM logs-* | STATS failures = COUNT(*), last = MAX(@timestamp)';

    expect(await score([esqlStep([[0]], countQuery)])).toBe(0);
    expect(await score([esqlStep([[0, null]], mixedQuery)])).toBe(0);
  });

  it('scores 1 for an ungrouped aggregate that counted events', async () => {
    expect(await score([esqlStep([[20]], 'FROM logs-* | STATS failures = COUNT(*)')])).toBe(1);
  });

  it('scores 0 for a grouped aggregate that returned no groups', async () => {
    const groupedQuery = 'FROM logs-* | STATS failures = COUNT(*) BY user.name';

    expect(await score([esqlStep([], groupedQuery)])).toBe(0);
  });

  it('scores 1 for a projected event row whose only value is false or 0', async () => {
    const projectedFalse = 'FROM logs-* | WHERE event.outcome == "success" | KEEP is_internal';
    const projectedZero = 'FROM logs-* | WHERE event.outcome == "success" | KEEP failure_count';

    expect(await score([esqlStep([[false]], projectedFalse)])).toBe(1);
    expect(await score([esqlStep([[0]], projectedZero)])).toBe(1);
  });

  it('scores 1 when a later query finds the events after an empty aggregate', async () => {
    const countQuery = 'FROM logs-* | STATS failures = COUNT(*)';

    expect(await score([esqlStep([[0]], countQuery), esqlStep([['jsmith', 20]])])).toBe(1);
  });

  it('scores 0 when the agent ran more than three queries', async () => {
    const found = esqlStep([['jsmith', 20]]);

    expect(await score([found, found, found, found])).toBe(0);
  });

  it('scores 0 when the agent ran no ES|QL query', async () => {
    expect(await score([])).toBe(0);
  });
});
