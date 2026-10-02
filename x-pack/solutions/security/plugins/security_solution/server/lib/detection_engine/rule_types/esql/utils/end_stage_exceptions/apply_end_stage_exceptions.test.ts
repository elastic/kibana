/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { Filter } from '@kbn/es-query';
import type { EntriesArray, ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';

import { ruleExecutionLogMock } from '../../../../rule_monitoring/mocks';
import { applyEndStageExceptions } from './apply_end_stage_exceptions';

const item = (id: string, field: string, value: string): ExceptionListItemSchema =>
  getExceptionListItemSchemaMock({
    item_id: id,
    name: id,
    entries: [{ field, operator: 'included', type: 'match', value }] as EntriesArray,
  });

const sourceItem = item('source', 'host.name', 'dc-01');
const computedItem = item('computed', 'risk', 'low');
const textItem = item('text', 'msg', 'to good.com');
const sharedItem = item('shared', 'process.name', 'ping');
const droppedItem = getExceptionListItemSchemaMock({
  item_id: 'dropped',
  name: 'dropped',
  entries: [
    { field: 'host.name', operator: 'included', type: 'match', value: 'web-02' },
    { field: 'risk', operator: 'included', type: 'match', value: 'high' },
  ] as EntriesArray,
});

const originalFilter = { meta: { alias: 'original' } } as unknown as Filter;
const dslFilter = { meta: { alias: 'dsl' } } as unknown as Filter;

describe('applyEndStageExceptions', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const ruleExecutionLogger = ruleExecutionLogMock.forExecutors.create();
  const buildDslFilter = jest.fn();
  const query = 'FROM logs-* | STATS event_count = COUNT(*) BY user.name | EVAL risk = "low"';

  const apply = (items: ExceptionListItemSchema[], ruleQuery: string = query) =>
    applyEndStageExceptions({
      esClient,
      ruleExecutionLogger,
      query: ruleQuery,
      indices: ['logs-*'],
      items,
      exceptionFilter: originalFilter,
      unprocessedExceptions: [],
      buildDslFilter,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    (esClient.fieldCaps as unknown as jest.Mock).mockResolvedValue({
      indices: ['logs-1'],
      fields: { 'host.name': { keyword: {} }, host: { object: {} } },
    });
    (esClient.esql.query as unknown as jest.Mock).mockResolvedValue({
      columns: [
        { name: 'event_count', type: 'long' },
        { name: 'user.name', type: 'keyword' },
        { name: 'risk', type: 'keyword' },
        { name: 'msg', type: 'text' },
      ],
      values: [],
    });
    buildDslFilter.mockResolvedValue({ filter: dslFilter, unprocessedExceptions: [] });
  });

  it('does nothing when there are no exception items', async () => {
    const result = await apply([]);

    expect(result).toEqual({
      query,
      exceptionFilter: originalFilter,
      unprocessedExceptions: [],
      warnings: [],
    });
    expect(esClient.fieldCaps).not.toHaveBeenCalled();
  });

  it('asks _field_caps for the fields of the items and their parent paths', async () => {
    await apply([sourceItem, computedItem]);

    expect(esClient.fieldCaps).toHaveBeenCalledWith({
      index: ['logs-*'],
      fields: ['host', 'host.name', 'risk'],
      ignore_unavailable: true,
      allow_no_indices: true,
    });
  });

  it('does not run the query when every item is on a source field', async () => {
    const result = await apply([sourceItem]);

    expect(esClient.esql.query).not.toHaveBeenCalled();
    expect(result.query).toBe(query);
    expect(result.exceptionFilter).toBe(originalFilter);
    expect(buildDslFilter).not.toHaveBeenCalled();
  });

  it('probes the output columns of the rule query with LIMIT 0', async () => {
    await apply([computedItem]);

    expect(esClient.esql.query).toHaveBeenCalledWith({ query: `${query} | LIMIT 0` });
  });

  it('appends the computed items to the query and rebuilds the DSL filter from the other items', async () => {
    const result = await apply([sourceItem, computedItem]);

    expect(result.query).toBe(`${query} | WHERE NOT (MV_CONTAINS(risk, "low"))`);
    expect(buildDslFilter).toHaveBeenCalledWith([sourceItem]);
    expect(result.exceptionFilter).toBe(dslFilter);
    expect(result.warnings).toEqual([]);
  });

  it('does not check the final query when no item uses a full-text function', async () => {
    await apply([computedItem]);

    expect(esClient.esql.query).toHaveBeenCalledTimes(1);
  });

  it('applies a text comparison without another request when the query only uses commands that accept it', async () => {
    const textQuery = 'FROM logs-* METADATA _id | EVAL risk = "low", msg = message | WHERE n > 0';

    const result = await apply([computedItem, textItem], textQuery);

    expect(esClient.esql.query).toHaveBeenCalledTimes(1);
    expect(result.query).toBe(
      `${textQuery} | WHERE NOT (MV_CONTAINS(risk, "low")) | WHERE NOT (MATCH_PHRASE(msg, "to good.com"))`
    );
    expect(result.warnings).toEqual([]);
  });

  it('does not apply a text comparison when the query uses a command that can make it fail, and keeps the other items', async () => {
    const limitedQuery = 'FROM logs-* | EVAL risk = "low", msg = message | LIMIT 100';

    const result = await apply([computedItem, textItem], limitedQuery);

    expect(result.query).toBe(`${limitedQuery} | WHERE NOT (MV_CONTAINS(risk, "low"))`);
    expect(result.warnings).toEqual([
      expect.stringContaining(
        '"text" (text): a text column is compared with a full-text function, which Elasticsearch accepts only at some positions of a query, and this query uses "limit"'
      ),
    ]);
    expect(esClient.esql.query).toHaveBeenCalledTimes(1);
  });

  it('does not apply a text comparison after STATS, where the position cannot be decided from the query', async () => {
    const result = await apply([textItem], 'FROM logs-* | STATS n = COUNT(*) BY msg = message');

    expect(result.warnings).toEqual([expect.stringContaining('and this query uses "stats"')]);
  });

  it('leaves the DSL filter empty when every item moves to the end of the query', async () => {
    const result = await apply([computedItem]);

    expect(buildDslFilter).not.toHaveBeenCalled();
    expect(result.exceptionFilter).toBeUndefined();
    expect(result.unprocessedExceptions).toEqual([]);
  });

  it('only logs, at debug level, an item whose field is not part of the rule', async () => {
    const result = await apply([sourceItem, sharedItem]);

    expect(result.query).toBe(query);
    expect(result.warnings).toEqual([]);
    expect(ruleExecutionLogger.warn).not.toHaveBeenCalled();
    expect(ruleExecutionLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining('"shared" (shared): "process.name" is not in the source indices')
    );
    expect(buildDslFilter).toHaveBeenCalledWith([sourceItem]);
  });

  it('warns about an item that cannot be evaluated', async () => {
    const result = await apply([droppedItem]);

    expect(result.warnings).toEqual([
      '1 exception item(s) could not be applied to this rule: "dropped" (dropped): "host.name" is a field of the source indices that the query does not output, so the item cannot be evaluated at the end of the query',
    ]);
    expect(ruleExecutionLogger.warn).toHaveBeenCalledWith(result.warnings[0]);
  });

  it('keeps every item in the DSL filter when the schemas cannot be read', async () => {
    (esClient.fieldCaps as unknown as jest.Mock).mockRejectedValue(new Error('boom'));

    const result = await apply([sourceItem, computedItem]);

    expect(result.query).toBe(query);
    expect(result.exceptionFilter).toBe(originalFilter);
    expect(result.warnings).toEqual([
      'Could not inspect the fields of the exceptions, so all exceptions use the DSL filter: boom',
    ]);
  });

  it('keeps every item in the DSL filter when the output probe fails', async () => {
    (esClient.esql.query as unknown as jest.Mock).mockRejectedValue(new Error('bad query'));

    const result = await apply([computedItem]);

    expect(result.query).toBe(query);
    expect(result.exceptionFilter).toBe(originalFilter);
    expect(buildDslFilter).not.toHaveBeenCalled();
  });
});
