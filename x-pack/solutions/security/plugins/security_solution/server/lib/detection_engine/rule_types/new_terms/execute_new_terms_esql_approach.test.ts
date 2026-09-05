/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { EsqlTable } from '../esql/esql_request';
import { createSearchAfterReturnType } from '../utils/utils';
import type { SignalSource } from '../types';
import {
  buildMsearchSearchesForCombinationBatch,
  buildNewTermsEsqlQuery,
  parseNewTermsCombinationsFromEsqlResponse,
  processMsearchResponsesToEventsAndTerms,
} from './execute_new_terms_esql_approach';

describe('buildNewTermsEsqlQuery', () => {
  const ruleIntervalFrom = '2026-06-17T14:00:00.000Z';

  it('builds a single-field query without the timestamp-override branch', () => {
    const query = buildNewTermsEsqlQuery({
      inputIndex: ['logs-*'],
      newTermsFields: ['host.name'],
      aggregatableTimestampField: '@timestamp',
      primaryTimestamp: '@timestamp',
      secondaryTimestamp: undefined,
      ruleIntervalFrom,
    });

    expect(query).toBe(
      'FROM logs-* | WHERE `host.name` IS NOT NULL | MV_EXPAND `host.name` | ' +
        'STATS first_seen = MIN(@timestamp) BY `host.name` | ' +
        'WHERE first_seen > "2026-06-17T14:00:00.000Z"'
    );
    expect(query).not.toContain('EVAL');
    expect(query).not.toContain('CASE');
  });

  it('builds a multi-field query with the timestamp-override branch', () => {
    const query = buildNewTermsEsqlQuery({
      inputIndex: ['logs-*', 'logs-2-*'],
      newTermsFields: ['host.name', 'user.name'],
      aggregatableTimestampField: 'kibana.combined_timestamp',
      primaryTimestamp: 'event.ingested',
      secondaryTimestamp: '@timestamp',
      ruleIntervalFrom,
    });

    expect(query).toBe(
      'FROM logs-*, logs-2-* | ' +
        'EVAL `kibana.combined_timestamp` = CASE(`event.ingested` IS NOT NULL, `event.ingested`, @timestamp) | ' +
        'WHERE `host.name` IS NOT NULL | WHERE `user.name` IS NOT NULL | ' +
        'MV_EXPAND `host.name` | MV_EXPAND `user.name` | ' +
        'STATS first_seen = MIN(`kibana.combined_timestamp`) BY `host.name`, `user.name` | ' +
        'WHERE first_seen > "2026-06-17T14:00:00.000Z"'
    );
  });

  it('does not add the override branch when the timestamp field is combined but there is no secondary timestamp', () => {
    const query = buildNewTermsEsqlQuery({
      inputIndex: ['logs-*'],
      newTermsFields: ['host.name'],
      aggregatableTimestampField: 'kibana.combined_timestamp',
      primaryTimestamp: '@timestamp',
      secondaryTimestamp: undefined,
      ruleIntervalFrom,
    });

    expect(query).not.toContain('EVAL');
    expect(query).not.toContain('CASE');
  });

  it('escapes backticks in field names so they cannot break out of the identifier', () => {
    const query = buildNewTermsEsqlQuery({
      inputIndex: ['logs-*'],
      newTermsFields: ['ev`il'],
      aggregatableTimestampField: '@timestamp',
      primaryTimestamp: '@timestamp',
      secondaryTimestamp: undefined,
      ruleIntervalFrom,
    });

    expect(query).toContain('`ev``il`');
    expect(query).toContain('MV_EXPAND `ev``il`');
  });
});

describe('buildMsearchSearchesForCombinationBatch', () => {
  const baseParams = {
    newTermsFields: ['host.name'],
    inputIndex: ['logs-*'],
    tupleFrom: '2026-06-17T14:00:00.000Z',
    tupleTo: '2026-06-17T15:00:00.000Z',
    esFilter: undefined,
    runtimeMappings: undefined,
    primaryTimestamp: '@timestamp',
    secondaryTimestamp: undefined,
  };

  it('emits a header/body pair per combination', () => {
    const searches = buildMsearchSearchesForCombinationBatch({
      ...baseParams,
      batch: [{ 'host.name': 'host-0' }, { 'host.name': 'host-1' }],
    });

    expect(searches).toHaveLength(4);
    expect(searches[0]).toEqual({
      index: ['logs-*'],
      ignore_unavailable: true,
      allow_no_indices: true,
    });
  });

  it('fetches only the first matching document per combination in ascending order', () => {
    const searches = buildMsearchSearchesForCombinationBatch({
      ...baseParams,
      batch: [{ 'host.name': 'host-0' }],
    });

    const body = searches[1] as estypes.SearchRequest;
    expect(body.size).toBe(1);
    expect(body.sort).toEqual([{ '@timestamp': { order: 'asc', unmapped_type: 'date' } }]);
  });

  it('adds a term filter for every new terms field of the combination', () => {
    const searches = buildMsearchSearchesForCombinationBatch({
      ...baseParams,
      newTermsFields: ['host.name', 'user.name'],
      batch: [{ 'host.name': 'host-0', 'user.name': 'user-0' }],
    });

    const body = searches[1] as estypes.SearchRequest;
    const filters = (body.query?.bool?.filter ?? []) as estypes.QueryDslQueryContainer[];
    expect(filters).toEqual(
      expect.arrayContaining([
        {
          bool: {
            must: [{ term: { 'host.name': 'host-0' } }, { term: { 'user.name': 'user-0' } }],
          },
        },
      ])
    );
  });
});

describe('parseNewTermsCombinationsFromEsqlResponse', () => {
  const table = (
    columns: Array<{ name: string; type: string }>,
    values: Array<Array<string | number | boolean | null>>
  ): EsqlTable => ({ columns, values } as unknown as EsqlTable);

  it('maps rows to combinations keyed by new terms field for a single field', () => {
    const response = table([{ name: 'host.name', type: 'keyword' }], [['host-0'], ['host-1']]);

    expect(parseNewTermsCombinationsFromEsqlResponse(response, ['host.name'])).toEqual([
      { 'host.name': 'host-0' },
      { 'host.name': 'host-1' },
    ]);
  });

  it('maps multi-field rows and preserves non-string value types', () => {
    const response = table(
      [
        { name: 'host.name', type: 'keyword' },
        { name: 'host.port', type: 'long' },
        { name: 'host.trusted', type: 'boolean' },
      ],
      [['host-0', 443, true]]
    );

    expect(
      parseNewTermsCombinationsFromEsqlResponse(response, [
        'host.name',
        'host.port',
        'host.trusted',
      ])
    ).toEqual([{ 'host.name': 'host-0', 'host.port': 443, 'host.trusted': true }]);
  });

  it('drops rows with a null value so partial combinations are not reported', () => {
    const response = table(
      [
        { name: 'host.name', type: 'keyword' },
        { name: 'user.name', type: 'keyword' },
      ],
      [
        ['host-0', 'user-0'],
        ['host-1', null],
      ]
    );

    expect(parseNewTermsCombinationsFromEsqlResponse(response, ['host.name', 'user.name'])).toEqual(
      [{ 'host.name': 'host-0', 'user.name': 'user-0' }]
    );
  });

  it('drops rows when a requested field is missing from the response columns', () => {
    const response = table([{ name: 'host.name', type: 'keyword' }], [['host-0']]);

    expect(parseNewTermsCombinationsFromEsqlResponse(response, ['host.name', 'user.name'])).toEqual(
      []
    );
  });
});

describe('processMsearchResponsesToEventsAndTerms', () => {
  const ruleExecutionLogger = { warn: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const hitResponse = (
    id: string,
    { failed = 0, failures }: { failed?: number; failures?: estypes.ShardFailure[] } = {}
  ) =>
    ({
      _shards: { total: 2, successful: 2 - failed, skipped: 0, failed, failures },
      hits: { total: { value: 1, relation: 'eq' }, hits: [{ _id: id, _index: 'logs' }] },
    } as unknown as estypes.MsearchResponseItem<SignalSource>);

  const emptyResponse = ({
    failed = 0,
    failures,
  }: { failed?: number; failures?: estypes.ShardFailure[] } = {}) =>
    ({
      _shards: { total: 2, successful: 2 - failed, skipped: 0, failed, failures },
      hits: { total: { value: 0, relation: 'eq' }, hits: [] },
    } as unknown as estypes.MsearchResponseItem<SignalSource>);

  const shardFailure = { shard: 0, index: 'logs', reason: { type: 'x' } } as estypes.ShardFailure;

  const run = (
    batch: Array<Record<string, string>>,
    responses: Array<estypes.MsearchResponseItem<SignalSource>>
  ) => {
    const result = createSearchAfterReturnType();
    const eventsAndTerms = processMsearchResponsesToEventsAndTerms({
      batch,
      responses,
      newTermsFields: ['host.name'],
      result,
      ruleExecutionLogger: ruleExecutionLogger as never,
    });
    return { result, eventsAndTerms };
  };

  it('builds events from successful responses with no shard failures', () => {
    const { result, eventsAndTerms } = run([{ 'host.name': 'host-0' }], [hitResponse('doc-0')]);

    expect(eventsAndTerms).toHaveLength(1);
    expect(eventsAndTerms[0].newTerms).toEqual(['host-0']);
    expect(result.warningMessages).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it('records an error for a failed sub-request', () => {
    const errorItem = {
      error: { type: 'search_phase_execution_exception' },
    } as unknown as estypes.MsearchResponseItem<SignalSource>;
    const { result, eventsAndTerms } = run([{ 'host.name': 'host-0' }], [errorItem]);

    expect(eventsAndTerms).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(ruleExecutionLogger.warn).toHaveBeenCalledTimes(1);
  });

  it('warns on partial shard failures while still using the returned hit', () => {
    const { result, eventsAndTerms } = run(
      [{ 'host.name': 'host-0' }],
      [hitResponse('doc-0', { failed: 1, failures: [shardFailure] })]
    );

    expect(eventsAndTerms).toHaveLength(1);
    expect(result.warningMessages).toEqual([
      'New terms document fetch hit shard failures for 1 term combination; the earliest matching document may be missing, which can result in missed or inaccurate alerts. Shard failures: [{"shard":0,"index":"logs","reason":{"type":"x"}}]',
    ]);
  });

  it('warns when a shard failure yields zero hits (missed detection)', () => {
    const { result, eventsAndTerms } = run(
      [{ 'host.name': 'host-0' }],
      [emptyResponse({ failed: 1, failures: [shardFailure] })]
    );

    expect(eventsAndTerms).toHaveLength(0);
    expect(result.warningMessages).toHaveLength(1);
  });

  it('emits a single aggregated warning for multiple combinations with shard failures', () => {
    const { result } = run(
      [{ 'host.name': 'host-0' }, { 'host.name': 'host-1' }],
      [
        hitResponse('doc-0', { failed: 1, failures: [shardFailure] }),
        emptyResponse({ failed: 1, failures: [shardFailure] }),
      ]
    );

    expect(result.warningMessages).toEqual([
      'New terms document fetch hit shard failures for 2 term combinations; the earliest matching document may be missing, which can result in missed or inaccurate alerts. Shard failures: [{"shard":0,"index":"logs","reason":{"type":"x"}}]',
    ]);
  });

  it('handles a mixed batch of error, clean hit, and shard failure independently', () => {
    const errorItem = {
      error: { type: 'search_phase_execution_exception' },
    } as unknown as estypes.MsearchResponseItem<SignalSource>;
    const { result, eventsAndTerms } = run(
      [{ 'host.name': 'host-0' }, { 'host.name': 'host-1' }, { 'host.name': 'host-2' }],
      [
        errorItem,
        hitResponse('doc-1'),
        hitResponse('doc-2', { failed: 1, failures: [shardFailure] }),
      ]
    );

    expect(eventsAndTerms).toHaveLength(2);
    expect(result.errors).toHaveLength(1);
    expect(result.warningMessages).toEqual([
      'New terms document fetch hit shard failures for 1 term combination; the earliest matching document may be missing, which can result in missed or inaccurate alerts. Shard failures: [{"shard":0,"index":"logs","reason":{"type":"x"}}]',
    ]);
  });
});
