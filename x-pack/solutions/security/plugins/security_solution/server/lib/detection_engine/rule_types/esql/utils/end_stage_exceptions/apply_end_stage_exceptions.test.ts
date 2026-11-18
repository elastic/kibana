/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { EntriesArray, ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';

import { ruleExecutionLogMock } from '../../../../rule_monitoring/mocks';
import { applyEndStageExceptions } from './apply_end_stage_exceptions';
import { ColumnTypeMismatchError } from './column_type_mismatch_error';
import { ExceptionsInspectionFailedError } from './exceptions_inspection_failed_error';
import { EndStageLimitExceededError } from './end_stage_limit_exceeded_error';
import { InvalidExceptionValuesError } from './invalid_exception_values_error';

const item = (
  id: string,
  field: string,
  value: string,
  columnType: string = 'keyword'
): ExceptionListItemSchema =>
  getExceptionListItemSchemaMock({
    item_id: id,
    name: id,
    entries: [
      { field, operator: 'included', type: 'match', value, column_type: columnType },
    ] as EntriesArray,
  });

const computedItem = item('computed', 'risk', 'low');
const textItem = item('text', 'msg', 'to good.com', 'text');
const ghostItem = getExceptionListItemSchemaMock({
  item_id: 'ghost',
  name: 'ghost',
  entries: [
    { field: 'risk', operator: 'included', type: 'match', value: 'low', column_type: 'keyword' },
    {
      field: 'process.name',
      operator: 'included',
      type: 'match',
      value: 'ping',
      column_type: 'keyword',
    },
  ] as EntriesArray,
});
const reducedItem = getExceptionListItemSchemaMock({
  item_id: 'reduced',
  name: 'reduced',
  entries: [
    { field: 'risk', operator: 'included', type: 'match', value: 'low', column_type: 'keyword' },
    {
      field: 'process.name',
      operator: 'excluded',
      type: 'match',
      value: 'ping',
      column_type: 'keyword',
    },
  ] as EntriesArray,
});

describe('applyEndStageExceptions', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const ruleExecutionLogger = ruleExecutionLogMock.forExecutors.create();
  const query = 'FROM logs-* | STATS event_count = COUNT(*) BY user.name | EVAL risk = "low"';

  const applyWithWarnings = (
    items: ExceptionListItemSchema[],
    ruleQuery: string = query,
    probeFilter?: Parameters<typeof applyEndStageExceptions>[0]['probeFilter']
  ) =>
    applyEndStageExceptions({
      esClient,
      ruleExecutionLogger,
      query: ruleQuery,
      items,
      probeFilter,
    });
  const apply = async (
    items: ExceptionListItemSchema[],
    ruleQuery: string = query,
    probeFilter?: Parameters<typeof applyEndStageExceptions>[0]['probeFilter']
  ): Promise<string> => (await applyWithWarnings(items, ruleQuery, probeFilter)).query;

  beforeEach(() => {
    jest.clearAllMocks();
    (esClient.esql.query as unknown as jest.Mock).mockResolvedValue({
      columns: [
        { name: 'event_count', type: 'long' },
        { name: 'user.name', type: 'keyword' },
        { name: 'risk', type: 'keyword' },
        { name: 'msg', type: 'text' },
      ],
      values: [],
    });
  });

  it('does nothing, and sends no request, when there are no exception items', async () => {
    const result = await apply([]);

    expect(result).toBe(query);
    expect(esClient.esql.query).not.toHaveBeenCalled();
    expect(ruleExecutionLogger.info).not.toHaveBeenCalled();
  });

  it('does not ask _field_caps, because the items say what they apply to', async () => {
    await apply([computedItem]);

    expect(esClient.fieldCaps).not.toHaveBeenCalled();
  });

  it('probes the output columns of the rule query with LIMIT 0', async () => {
    await apply([computedItem]);

    expect(esClient.esql.query).toHaveBeenCalledTimes(1);
    expect(esClient.esql.query).toHaveBeenCalledWith({ query: `${query}\n| LIMIT 0` });
  });

  it('appends the items to the query as one WHERE stage on a new line, so a comment at the end of the rule query does not swallow it', async () => {
    const commentedQuery = 'FROM logs-* | EVAL risk = "low" // the last line has a comment';

    const result = await apply([computedItem], commentedQuery);

    expect(result).toBe(`${commentedQuery}\n| WHERE NOT (MV_CONTAINS(risk, "low"))`);
    expect(esClient.esql.query).toHaveBeenCalledWith({ query: `${commentedQuery}\n| LIMIT 0` });
  });

  it('sends the filter of the real request with the probe, so that it resolves the same indices', async () => {
    const probeFilter = { bool: { filter: [{ range: { '@timestamp': { gte: 'now-1h' } } }] } };

    await apply([computedItem], query, probeFilter);

    expect(esClient.esql.query).toHaveBeenCalledWith({
      query: `${query}\n| LIMIT 0`,
      filter: probeFilter,
    });
  });

  it('writes the items of a text column as the items of a keyword column, and joins several items in one stage', async () => {
    const textQuery =
      'FROM logs-* | EVAL risk = "low", msg = message | STATS n = COUNT(*) BY risk, msg | LIMIT 10';

    const result = await apply([computedItem, textItem], textQuery);

    expect(esClient.esql.query).toHaveBeenCalledTimes(1);
    expect(result).toBe(
      `${textQuery}\n| WHERE (NOT (MV_CONTAINS(risk, "low"))) AND (NOT (MV_CONTAINS(msg, "to good.com")))`
    );
    expect(ruleExecutionLogger.warn).not.toHaveBeenCalled();
  });

  it('writes one JSON message to the rule execution log with the final query and what was applied', async () => {
    await apply([computedItem, ghostItem]);

    expect(ruleExecutionLogger.info).toHaveBeenCalledTimes(1);
    expect(JSON.parse(ruleExecutionLogger.info.mock.calls[0][0])).toEqual({
      type: 'esql_exceptions',
      version: 1,
      query: `${query}\n| WHERE NOT (MV_CONTAINS(risk, "low"))`,
      queryTruncated: false,
      appliedAtEndOfQuery: [{ list_id: computedItem.list_id, item_id: 'computed' }],
      notApplied: [
        {
          list_id: ghostItem.list_id,
          item_id: 'ghost',
          name: 'ghost',
          code: 'item_never_matches',
          reason: '"process.name" is not in the output of the query',
          fields: ['process.name'],
        },
      ],
      notAppliedCount: 1,
      truncated: false,
    });
    expect(ruleExecutionLogger.warn).not.toHaveBeenCalled();
  });

  it('applies an item with an entry that has an exclusive operator on a column that the query does not output, without that entry', async () => {
    const result = await apply([reducedItem]);

    expect(result).toBe(`${query}\n| WHERE NOT (MV_CONTAINS(risk, "low"))`);
  });

  it('writes a stage that keeps no row for an item whose entries all have an exclusive operator on columns that the query does not output', async () => {
    const result = await apply([
      getExceptionListItemSchemaMock({
        item_id: 'only-exclusive',
        name: 'only-exclusive',
        entries: [
          {
            field: 'process.name',
            operator: 'excluded',
            type: 'match',
            value: 'ping',
            column_type: 'keyword',
          },
        ] as EntriesArray,
      }),
    ]);

    expect(result).toBe(`${query}\n| WHERE false`);
    expect(JSON.parse(ruleExecutionLogger.info.mock.calls[0][0])).toMatchObject({
      appliedAtEndOfQuery: [{ item_id: 'only-exclusive' }],
      notApplied: [],
    });
  });

  describe('the warning for an item that is true for every row', () => {
    const onlyExclusive = (id: string) =>
      getExceptionListItemSchemaMock({
        item_id: id,
        name: `name of ${id}`,
        entries: [
          {
            field: 'ghost',
            operator: 'excluded',
            type: 'match',
            value: 'x',
            column_type: 'keyword',
          },
        ] as EntriesArray,
      });

    it('warns that the rule creates no alerts, and names the item and its list', async () => {
      const { warnings } = await applyWithWarnings([onlyExclusive('a')]);

      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain(
        'The rule creates no alerts because exceptions exclude every row: '
      );
      expect(warnings[0]).toContain('"name of a" (list "endpoint_list_id", item "a")');
      expect(warnings[0]).toContain(
        'has an exclusive operator on a column that the query does not output'
      );
    });

    it('has one warning for all the items, and names the first 5', async () => {
      const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

      const { warnings } = await applyWithWarnings(ids.map(onlyExclusive));

      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('"name of e"');
      expect(warnings[0]).not.toContain('"name of f"');
      expect(warnings[0]).toContain('and 2 more.');
    });

    it('has no warning for an item that is applied normally, skipped, or an item with an entry that has an exclusive operator and another entry', async () => {
      const { warnings } = await applyWithWarnings([computedItem, ghostItem, reducedItem]);

      expect(warnings).toEqual([]);
    });
  });

  it('joins that stage with the stage of the other items', async () => {
    const result = await apply([
      computedItem,
      getExceptionListItemSchemaMock({
        item_id: 'only-exclusive',
        name: 'only-exclusive',
        entries: [
          {
            field: 'process.name',
            operator: 'excluded',
            type: 'exists',
            column_type: 'keyword',
          },
        ] as EntriesArray,
      }),
    ]);

    expect(result).toBe(`${query}\n| WHERE (NOT (MV_CONTAINS(risk, "low"))) AND (false)`);
  });

  it('leaves the query as it is, and logs the reason, when no item can be applied', async () => {
    const result = await apply([ghostItem]);

    expect(result).toBe(query);
    expect(ruleExecutionLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('"code":"item_never_matches"')
    );
  });

  describe('columns that the query outputs with another type than the item declares', () => {
    it('throws before the query runs, and names the item, the column and both types', async () => {
      const mismatched = item('mismatched', 'event_count', 'many', 'keyword');

      await expect(apply([mismatched])).rejects.toThrow(ColumnTypeMismatchError);
      await expect(apply([mismatched])).rejects.toThrow(
        `"mismatched" (list "${mismatched.list_id}", item "mismatched") declares the column "event_count" as keyword, and the query outputs it as long`
      );
    });

    it('names every item that has a mismatch, and none of the others', async () => {
      const first = item('first', 'event_count', '1', 'keyword');
      const second = item('second', 'user.name', '10.0.0.1', 'ip');

      const error = await apply([first, computedItem, second]).catch((e) => e);

      expect(error).toBeInstanceOf(ColumnTypeMismatchError);
      expect(
        error.mismatches.map(({ item: { item_id: id } }: { item: { item_id: string } }) => id)
      ).toEqual(['first', 'second']);
      expect(error.message).not.toContain('"computed"');
    });

    it('does not report it as an inspection failure', async () => {
      await expect(apply([item('mismatched', 'event_count', '1', 'keyword')])).rejects.not.toThrow(
        ExceptionsInspectionFailedError
      );
    });
  });

  it('reports a value that cannot be written before a declared type that is not the output type', async () => {
    const mismatched = item('mismatched', 'event_count', '1', 'keyword');
    const invalid = item('invalid', 'user.name', 'bogus', 'ip');

    await expect(apply([mismatched, invalid])).rejects.toThrow(InvalidExceptionValuesError);
  });

  describe('values that cannot be written for the type of the column', () => {
    const invalidItem = item('invalid', 'event_count', 'many', 'long');

    it('throws before the query runs', async () => {
      await expect(apply([invalidItem])).rejects.toThrow(InvalidExceptionValuesError);
      await expect(apply([invalidItem])).rejects.toThrow(
        /"invalid" \(list ".*", item "invalid"\): value "many" cannot be written for a column of type long at the end of the query, in the field "event_count"/
      );
    });

    it('does not report it as an inspection failure or as an applied exception', async () => {
      await expect(apply([invalidItem])).rejects.not.toThrow(ExceptionsInspectionFailedError);
      expect(ruleExecutionLogger.info).not.toHaveBeenCalled();
    });

    it('names every item with an invalid value', async () => {
      const other = item('other', 'event_count', 'few', 'long');

      const error = await apply([invalidItem, computedItem, other]).catch((e) => e);

      expect(error).toBeInstanceOf(InvalidExceptionValuesError);
      expect(error.invalidItems).toHaveLength(2);
    });

    it('throws for an item that does not declare the type of its column, because it is not valid', async () => {
      const untyped = getExceptionListItemSchemaMock({
        item_id: 'untyped',
        name: 'untyped',
        entries: [
          { field: 'risk', operator: 'included', type: 'match', value: 'low' },
        ] as EntriesArray,
      });

      await expect(apply([untyped])).rejects.toThrow(InvalidExceptionValuesError);
    });
  });

  it('fails the rule, and names the limit, when the items would make the query longer than ES|QL accepts', async () => {
    const longValues = (n: number) =>
      Array.from({ length: 250 }, (_, i) => `${'v'.repeat(1800)}${n}-${i}`);
    const longItem = (id: string, n: number) =>
      getExceptionListItemSchemaMock({
        item_id: id,
        name: id,
        entries: [
          {
            field: 'risk',
            operator: 'included',
            type: 'match_any',
            value: longValues(n),
            column_type: 'keyword',
          },
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
          column_type: 'keyword',
        },
        ...Array.from({ length: 205 }, (_, i) => ({
          field: 'risk',
          operator: 'included',
          type: 'match',
          value: `w${i}`,
          column_type: 'keyword',
        })),
      ] as EntriesArray,
    });

    await expect(apply([wideItem])).rejects.toThrow(EndStageLimitExceededError);
    await expect(apply([wideItem])).rejects.toThrow(
      /need 206 comparisons, and at most 200 are allowed.*the item "wide" \(list ".*", item "wide"\) has 206\. Remove values from those items, or remove the items that this rule does not need\. Splitting an item into several items does not help/
    );
  });

  describe('when the output columns cannot be read', () => {
    it('throws before the query runs, and names the reason', async () => {
      (esClient.esql.query as unknown as jest.Mock).mockRejectedValue(new Error('no access'));

      await expect(apply([computedItem])).rejects.toThrow(ExceptionsInspectionFailedError);
      await expect(apply([computedItem])).rejects.toThrow(
        'The rule did not run because the output columns of its query could not be read to apply its exceptions on them: no access'
      );
    });

    it('does not write to the rule execution log', async () => {
      (esClient.esql.query as unknown as jest.Mock).mockRejectedValue(new Error('no access'));

      await apply([computedItem]).catch(() => undefined);

      expect(ruleExecutionLogger.info).not.toHaveBeenCalled();
    });
  });
});
