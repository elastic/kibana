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

const esqlStep = (values: unknown[][]) => ({
  type: 'tool_call',
  tool_id: platformCoreTools.executeEsql,
  results: [
    { type: ToolResultType.esqlResults, data: { query: 'FROM logs-*', columns: [], values } },
  ],
});

const score = async (steps: unknown[]) => {
  const { score: result } = await createEvidenceLookupEvaluator(log).evaluate({
    output: { steps },
  });
  return result;
};

// Why: the evidence case must show that the agent found the events behind the alerts. The ES|QL tool
// returns an esql_results entry for every query, so a search over the wrong time window must not pass.
describe('createEvidenceLookupEvaluator', () => {
  it('scores 1 when a query returns rows with data', async () => {
    expect(await score([esqlStep([['jsmith', 20]])])).toBe(1);
  });

  it('scores 0 when the query returns no rows', async () => {
    expect(await score([esqlStep([])])).toBe(0);
  });

  it('scores 0 for an ungrouped aggregate over zero matches, which returns a row of zeros', async () => {
    expect(await score([esqlStep([[0]])])).toBe(0);
    expect(await score([esqlStep([[0, null]])])).toBe(0);
  });

  it('scores 1 when a later query finds the events after an empty one', async () => {
    expect(await score([esqlStep([[0]]), esqlStep([['jsmith', 20]])])).toBe(1);
  });

  it('scores 0 when the agent ran more than three queries', async () => {
    const found = esqlStep([['jsmith', 20]]);
    expect(await score([found, found, found, found])).toBe(0);
  });

  it('scores 0 when the agent ran no ES|QL query', async () => {
    expect(await score([])).toBe(0);
  });
});
