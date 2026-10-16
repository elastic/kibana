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
import { ExceptionsInspectionFailedError } from './exceptions_inspection_failed_error';
import { EndStageLimitExceededError } from './end_stage_limit_exceeded_error';
import { InvalidExceptionValuesError } from './invalid_exception_values_error';

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
const ghostItem = getExceptionListItemSchemaMock({
  item_id: 'ghost',
  name: 'ghost',
  entries: [
    { field: 'risk', operator: 'included', type: 'match', value: 'low' },
    { field: 'process.name', operator: 'included', type: 'match', value: 'ping' },
  ] as EntriesArray,
});
const reducedItem = getExceptionListItemSchemaMock({
  item_id: 'reduced',
  name: 'reduced',
  entries: [
    { field: 'risk', operator: 'included', type: 'match', value: 'low' },
    { field: 'process.name', operator: 'excluded', type: 'match', value: 'ping' },
  ] as EntriesArray,
});
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

  it('keeps a nested item in the DSL filter when the query outputs a column named like the nested path', async () => {
    // _field_caps lists a nested path only when a field below it is requested too, as it does for an object parent
    (esClient.fieldCaps as unknown as jest.Mock).mockImplementation(
      async ({ fields }: { fields: string[] }) => ({
        indices: ['logs-1'],
        fields: fields.includes('nested_user.name')
          ? { nested_user: { nested: {} }, 'nested_user.name': { keyword: {} } }
          : {},
      })
    );
    (esClient.esql.query as unknown as jest.Mock).mockResolvedValue({
      columns: [{ name: 'nested_user', type: 'keyword' }],
      values: [],
    });
    const nestedItem = getExceptionListItemSchemaMock({
      item_id: 'nested',
      name: 'nested',
      entries: [
        {
          field: 'nested_user',
          type: 'nested',
          entries: [{ field: 'name', operator: 'included', type: 'match', value: 'svc' }],
        },
      ] as EntriesArray,
    });

    const result = await apply(
      [nestedItem],
      'FROM logs-* | EVAL nested_user = "x" | STATS c = COUNT(*) BY nested_user'
    );

    expect(esClient.fieldCaps).toHaveBeenCalledWith(
      expect.objectContaining({
        fields: expect.arrayContaining(['nested_user', 'nested_user.name']),
      })
    );
    expect(result.query).toBe(
      'FROM logs-* | EVAL nested_user = "x" | STATS c = COUNT(*) BY nested_user'
    );
    expect(result.exceptionFilter).toBe(originalFilter);
    expect(ruleExecutionLogger.info).not.toHaveBeenCalled();
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

    expect(esClient.esql.query).toHaveBeenCalledWith({ query: `${query}\n| LIMIT 0` });
  });

  it('keeps in the DSL filter only an exception on a source field that the query redefines', async () => {
    const result = await apply([sourceItem], 'FROM logs-* | EVAL host.name = TO_UPPER(host.name)');

    expect(esClient.esql.query).not.toHaveBeenCalled();
    expect(result.query).toBe('FROM logs-* | EVAL host.name = TO_UPPER(host.name)');
    expect(result.exceptionFilter).toBe(originalFilter);
  });

  it('starts the stages on a new line, so a comment at the end of the rule query does not swallow them', async () => {
    const commentedQuery = 'FROM logs-* | EVAL risk = "low" // the last line has a comment';

    const result = await apply([computedItem], commentedQuery);

    expect(result.query).toBe(`${commentedQuery}\n| WHERE NOT (MV_CONTAINS(risk, "low"))`);
    expect(esClient.esql.query).toHaveBeenCalledWith({ query: `${commentedQuery}\n| LIMIT 0` });
  });

  it('sends the filter of the real request with the probe, so that it resolves the same indices', async () => {
    const probeFilter = { bool: { filter: [{ range: { '@timestamp': { gte: 'now-1h' } } }] } };

    await applyEndStageExceptions({
      esClient,
      ruleExecutionLogger,
      query,
      indices: ['logs-*'],
      items: [computedItem],
      exceptionFilter: originalFilter,
      unprocessedExceptions: [],
      buildDslFilter,
      probeFilter,
    });

    expect(esClient.esql.query).toHaveBeenCalledWith({
      query: `${query}\n| LIMIT 0`,
      filter: probeFilter,
    });
  });

  it('asks _field_caps with the filter of the real request, so that it reads the indices that the query reads', async () => {
    const fieldCapsFilter = { bool: { filter: [{ range: { '@timestamp': { gte: 'now-1h' } } }] } };

    await applyEndStageExceptions({
      esClient,
      ruleExecutionLogger,
      query,
      indices: ['logs-*'],
      items: [sourceItem, computedItem],
      exceptionFilter: originalFilter,
      unprocessedExceptions: [],
      buildDslFilter,
      fieldCapsFilter,
    });

    expect(esClient.fieldCaps).toHaveBeenCalledWith(
      expect.objectContaining({ index_filter: fieldCapsFilter })
    );
  });

  it('does nothing when no index has documents in the time range, and the rule runs as it does without the feature', async () => {
    (esClient.fieldCaps as unknown as jest.Mock).mockResolvedValue({ indices: [], fields: {} });

    const result = await apply([sourceItem, computedItem]);

    expect(result).toEqual({ query, exceptionFilter: originalFilter, unprocessedExceptions: [] });
    expect(esClient.esql.query).not.toHaveBeenCalled();
    expect(buildDslFilter).not.toHaveBeenCalled();
    expect(ruleExecutionLogger.info).not.toHaveBeenCalled();
  });

  it('applies the exceptions when at least one index has documents in the time range', async () => {
    const result = await apply([sourceItem, computedItem]);

    expect(result.query).toBe(`${query}\n| WHERE NOT (MV_CONTAINS(risk, "low"))`);
  });

  it('sends no filter to _field_caps when it has none', async () => {
    await apply([sourceItem, computedItem]);

    expect(esClient.fieldCaps).toHaveBeenCalledWith(
      expect.not.objectContaining({ index_filter: expect.anything() })
    );
  });

  it('appends the computed items to the query and rebuilds the DSL filter from the other items', async () => {
    const result = await apply([sourceItem, computedItem]);

    expect(result.query).toBe(`${query}\n| WHERE NOT (MV_CONTAINS(risk, "low"))`);
    expect(buildDslFilter).toHaveBeenCalledWith([sourceItem]);
    expect(result.exceptionFilter).toBe(dslFilter);
  });

  it('writes one JSON message to the rule execution log with the final query and what was applied', async () => {
    await apply([sourceItem, computedItem, ghostItem]);

    expect(ruleExecutionLogger.info).toHaveBeenCalledTimes(1);
    expect(JSON.parse(ruleExecutionLogger.info.mock.calls[0][0])).toEqual({
      type: 'esql_exceptions',
      version: 1,
      query: `${query}\n| WHERE NOT (MV_CONTAINS(risk, "low"))`,
      queryTruncated: false,
      dslItemCount: 1,
      appliedAtEndOfQuery: [{ list_id: computedItem.list_id, item_id: 'computed' }],
      notApplied: [
        {
          list_id: ghostItem.list_id,
          item_id: 'ghost',
          name: 'ghost',
          code: 'field_not_found',
          reason: '"process.name" is not in the source indices or in the output of the query',
          fields: ['process.name'],
        },
      ],
      notAppliedCount: 1,
      truncated: false,
    });
    expect(ruleExecutionLogger.warn).not.toHaveBeenCalled();
  });

  it('does not write to the rule execution log when every item stays in the DSL filter', async () => {
    await apply([sourceItem]);

    expect(ruleExecutionLogger.info).not.toHaveBeenCalled();
  });

  describe('values that cannot be written for the type of the column', () => {
    const invalidItem = item('invalid', 'event_count', 'many');

    it('throws before the query runs', async () => {
      const error = await apply([computedItem, invalidItem]).catch((e) => e);

      expect(error).toBeInstanceOf(InvalidExceptionValuesError);
      expect(error.message).toContain('"invalid" (list');
      expect(error.message).toContain(
        'value "many" cannot be written for a column of type long at the end of the query, in the field "event_count"'
      );
      expect(error.invalidItems).toHaveLength(1);
      expect(buildDslFilter).not.toHaveBeenCalled();
    });

    it('does not report it as an inspection failure or as an applied exception', async () => {
      await apply([computedItem, invalidItem]).catch(() => undefined);

      expect(ruleExecutionLogger.warn).not.toHaveBeenCalled();
      expect(ruleExecutionLogger.info).not.toHaveBeenCalled();
    });

    it('names every item with an invalid value', async () => {
      const other = item('other', 'event_count', 'few');
      const error = await apply([invalidItem, other]).catch((e) => e);

      expect(
        error.invalidItems.map(({ item: { item_id: id } }: { item: { item_id: string } }) => id)
      ).toEqual(['invalid', 'other']);
    });

    it('throws for a value that the DSL accepts and the compiler does not write', async () => {
      const error = await apply([item('exponent', 'event_count', '1e3')]).catch((e) => e);

      expect(error).toBeInstanceOf(InvalidExceptionValuesError);
      expect(error.message).toContain(
        'value "1e3" cannot be written for a column of type long at the end of the query'
      );
    });

    it('does not throw for an item whose field is nowhere, as the DSL does not check the value of an unmapped field', async () => {
      const result = await apply([item('unmapped', 'no.such.field', 'many')]);

      expect(result.query).toBe(query);
      expect(result.exceptionFilter).toBe(originalFilter);
      expect(ruleExecutionLogger.info).not.toHaveBeenCalled();
    });
  });

  it('applies an item on a text column as one on a keyword column, whatever the commands of the query', async () => {
    const textQuery =
      'FROM logs-* | EVAL risk = "low", msg = message | STATS n = COUNT(*) BY risk, msg | LIMIT 10';

    const result = await apply([computedItem, textItem], textQuery);

    expect(esClient.esql.query).toHaveBeenCalledTimes(1);
    expect(result.query).toBe(
      `${textQuery}\n| WHERE (NOT (MV_CONTAINS(risk, "low"))) AND (NOT (MV_CONTAINS(msg, "to good.com")))`
    );
    expect(ruleExecutionLogger.warn).not.toHaveBeenCalled();
  });

  it('fails the rule, and names the limit, when the items would make the query longer than ES|QL accepts', async () => {
    const longValues = (n: number) =>
      Array.from({ length: 250 }, (_, i) => `${'v'.repeat(1800)}${n}-${i}`);
    const longItem = (id: string, n: number) =>
      getExceptionListItemSchemaMock({
        item_id: id,
        name: id,
        entries: [
          { field: 'risk', operator: 'included', type: 'match_any', value: longValues(n) },
        ] as EntriesArray,
      });
    const items = [longItem('first', 1), longItem('second', 2), longItem('third', 3)];

    await expect(apply(items)).rejects.toThrow(EndStageLimitExceededError);
    await expect(apply(items)).rejects.toThrow(
      /the query would be longer than 1000000 characters when the item "third"/
    );
  });

  it('fails the rule, and says how to reduce the exceptions, when they need more comparisons than allowed', async () => {
    const wideItem = getExceptionListItemSchemaMock({
      item_id: 'wide',
      name: 'wide',
      entries: [
        {
          field: 'risk',
          operator: 'included',
          type: 'match_any',
          value: Array.from({ length: 10 }, (_, i) => `v${i}`),
        },
        ...Array.from({ length: 205 }, (_, i) => ({
          field: 'risk',
          operator: 'included',
          type: 'match',
          value: `w${i}`,
        })),
      ] as EntriesArray,
    });

    await expect(apply([wideItem])).rejects.toThrow(EndStageLimitExceededError);
    await expect(apply([wideItem])).rejects.toThrow(
      /need 206 comparisons, and at most 200 are allowed.*the item "wide" \(list ".*", item "wide"\) has 206\. Remove values from those items, or remove the items that this rule does not need\. Splitting an item into several items does not help/
    );
  });

  it('leaves the DSL filter empty when every item moves to the end of the query', async () => {
    const result = await apply([computedItem]);

    expect(buildDslFilter).not.toHaveBeenCalled();
    expect(result.exceptionFilter).toBeUndefined();
    expect(result.unprocessedExceptions).toEqual([]);
  });

  it('keeps in the DSL filter an item whose field is not part of the rule, and changes nothing', async () => {
    const result = await apply([sourceItem, sharedItem]);

    expect(result.query).toBe(query);
    expect(result.exceptionFilter).toBe(originalFilter);
    expect(ruleExecutionLogger.warn).not.toHaveBeenCalled();
    expect(ruleExecutionLogger.info).not.toHaveBeenCalled();
    expect(buildDslFilter).not.toHaveBeenCalled();
  });

  it('applies an item with a computed column and a negative entry on a field that is not part of the rule, without that entry', async () => {
    const result = await apply([reducedItem]);

    expect(result.query).toBe(`${query}\n| WHERE NOT (MV_CONTAINS(risk, "low"))`);
    expect(JSON.parse(ruleExecutionLogger.info.mock.calls[0][0])).toEqual(
      expect.objectContaining({
        appliedAtEndOfQuery: [{ list_id: reducedItem.list_id, item_id: 'reduced' }],
        notApplied: [],
      })
    );
  });

  it('does not apply an item that has a computed column and a field that is not part of the rule, and logs the reason', async () => {
    const result = await apply([sourceItem, ghostItem]);

    expect(result.query).toBe(query);
    expect(ruleExecutionLogger.warn).not.toHaveBeenCalled();
    expect(ruleExecutionLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('"code":"field_not_found"')
    );
    expect(buildDslFilter).toHaveBeenCalledWith([sourceItem]);
  });

  it('logs an item that needs a source field the query does not output', async () => {
    await apply([droppedItem]);

    expect(ruleExecutionLogger.warn).not.toHaveBeenCalled();
    expect(JSON.parse(ruleExecutionLogger.info.mock.calls[0][0]).notApplied).toEqual([
      expect.objectContaining({
        item_id: 'dropped',
        code: 'source_field_not_output',
        fields: ['host.name'],
      }),
    ]);
  });

  describe('when the fields of the exceptions cannot be inspected', () => {
    it('throws before the query runs when the field lookup fails, and names the reason', async () => {
      (esClient.fieldCaps as unknown as jest.Mock).mockRejectedValue(new Error('boom'));

      const error = await apply([sourceItem, computedItem]).catch((e) => e);

      expect(error).toBeInstanceOf(ExceptionsInspectionFailedError);
      expect(error.message).toBe(
        'The rule did not run because the fields of its exceptions could not be inspected to apply them: boom'
      );
      expect(buildDslFilter).not.toHaveBeenCalled();
    });

    it('throws when the output probe fails', async () => {
      (esClient.esql.query as unknown as jest.Mock).mockRejectedValue(new Error('bad query'));

      const error = await apply([computedItem]).catch((e) => e);

      expect(error).toBeInstanceOf(ExceptionsInspectionFailedError);
      expect(error.message).toContain('bad query');
      expect(buildDslFilter).not.toHaveBeenCalled();
    });

    it('does not write to the rule execution log', async () => {
      (esClient.fieldCaps as unknown as jest.Mock).mockRejectedValue(new Error('boom'));

      await apply([computedItem]).catch(() => undefined);

      expect(ruleExecutionLogger.warn).not.toHaveBeenCalled();
      expect(ruleExecutionLogger.info).not.toHaveBeenCalled();
    });

    it('does not describe a failure to build the DSL filter as an inspection failure', async () => {
      buildDslFilter.mockRejectedValue(new Error('list not found'));

      const error = await apply([sourceItem, computedItem]).catch((e) => e);

      expect(error).not.toBeInstanceOf(ExceptionsInspectionFailedError);
      expect(error.message).toBe('list not found');
    });
  });
});
