/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertsClient } from '@kbn/rule-registry-plugin/server';
import { errors } from '@elastic/elasticsearch';
import Boom from '@hapi/boom';
import { MAX_V2_ALERT_DATA_LENGTH } from '../../common';
import {
  fetchInvestigationAlertSnapshots,
  parseAlertSnapshot,
  truncateV2AlertData,
} from './alert_snapshot';

const alert = {
  'kibana.alert.uuid': 'alert-1',
  'kibana.alert.rule.uuid': 'rule-1',
  'kibana.alert.rule.name': 'Test rule',
  'kibana.alert.rule.rule_type_id': 'test.rule',
  'kibana.alert.rule.category': 'Test category',
  'kibana.alert.reason': 'Threshold exceeded',
  'kibana.alert.status': 'active',
  'kibana.alert.start': '2026-09-02T10:00:00.000Z',
  'kibana.alert.flapping': false,
  '@timestamp': '2026-09-02T10:01:00.000Z',
  'kibana.alert.group': [{ field: 'host.name', value: 'host-1' }],
};

describe('parseAlertSnapshot', () => {
  it('builds a validated alert snapshot', () => {
    expect(parseAlertSnapshot(alert)).toEqual({
      id: 'alert-1',
      rule_id: 'rule-1',
      rule_name: 'Test rule',
      rule_type_id: 'test.rule',
      rule_category: 'Test category',
      reason: 'Threshold exceeded',
      status: 'active',
      start: '2026-09-02T10:00:00.000Z',
      flapping: false,
      timestamp: '2026-09-02T10:01:00.000Z',
      group: [{ field: 'host.name', value: 'host-1' }],
    });
  });

  it('rejects missing required fields and omits malformed optional fields', () => {
    expect(parseAlertSnapshot({ ...alert, 'kibana.alert.uuid': undefined })).toBeUndefined();
    expect(
      parseAlertSnapshot({ ...alert, 'kibana.alert.group': [{ field: 'host.name', value: 42 }] })
    ).toEqual(expect.objectContaining({ id: 'alert-1' }));
  });

  it('normalizes valid legacy and metric alert fields', () => {
    expect(
      parseAlertSnapshot({
        ...alert,
        'kibana.alert.reason': undefined,
        'kibana.alert.flapping': undefined,
        'kibana.alert.evaluation.values': [42, null],
      })
    ).toEqual(
      expect.objectContaining({
        evaluation: { value: [42, null] },
      })
    );
  });
});

describe('fetchInvestigationAlertSnapshots', () => {
  const makeAlertsClient = ({
    indices = ['.alerts-observability.test'],
    alerts = [alert],
  }: { indices?: string[]; alerts?: Array<Record<string, unknown>> } = {}) => ({
    getAuthorizedAlertsIndices: jest.fn().mockResolvedValue(indices),
    find: jest.fn().mockResolvedValue({ hits: { hits: alerts.map((_source) => ({ _source })) } }),
  });

  const makeLookup = ({
    getRule = jest.fn(async ({ id }: { id: string }) => ({ id, metadata: { name: 'V2 rule' } })),
    queryError,
    columns = [] as string[],
    rows = [] as unknown[][],
    episodeData = {} as Record<string, string>,
  }: {
    getRule?: jest.Mock;
    queryError?: Error;
    columns?: string[];
    rows?: unknown[][];
    episodeData?: Record<string, string>;
  } = {}) => ({
    esClient: {
      esql: {
        query: queryError
          ? jest.fn().mockRejectedValue(queryError)
          : jest.fn(async ({ filter }: { filter?: unknown }) =>
              filter
                ? {
                    columns: [{ name: 'episode.id' }, { name: 'episode_data' }],
                    values: Object.entries(episodeData),
                  }
                : { columns: columns.map((name) => ({ name })), values: rows }
            ),
      },
    },
    getRule,
    getRulesClient: jest.fn().mockResolvedValue({ getRule }),
    spaceId: 'default',
  });

  const run = (
    alertsClient: ReturnType<typeof makeAlertsClient>,
    lookup: ReturnType<typeof makeLookup>,
    alertIds: string[]
  ) =>
    fetchInvestigationAlertSnapshots({
      alertsClient: alertsClient as unknown as AlertsClient,
      alertIds,
      ...lookup,
    } as never);

  it('loads classic alerts in one query', async () => {
    const alertsClient = makeAlertsClient();
    const lookup = makeLookup();

    await expect(run(alertsClient, lookup, ['alert-1', 'alert-1'])).resolves.toEqual([
      expect.objectContaining({ id: 'alert-1' }),
    ]);
    expect(alertsClient.find).toHaveBeenCalledTimes(1);
    expect(lookup.esClient.esql.query).not.toHaveBeenCalled();
    expect(lookup.getRulesClient).not.toHaveBeenCalled();
  });

  it('resolves ids the alerts index misses as v2 episodes, keeping the requested order', async () => {
    const alertsClient = makeAlertsClient();
    const lookup = makeLookup({
      columns: [
        'episode.id',
        'first_timestamp',
        'last_timestamp',
        'episode.status',
        'rule.id',
        'group_hash',
      ],
      rows: [
        [
          'episode-1',
          '2026-09-02T10:00:00.000Z',
          '2026-09-02T10:05:00.000Z',
          'active',
          'v2-rule',
          'hash',
        ],
      ],
      episodeData: { 'episode-1': '{"host.name":"h1"}' },
    });

    const snapshots = await run(alertsClient, lookup, ['episode-1', 'alert-1']);

    expect(snapshots).toEqual([
      expect.objectContaining({
        alert_version: 'v2',
        id: 'episode-1',
        rule_name: 'V2 rule',
        start: '2026-09-02T10:00:00.000Z',
        last_event_timestamp: '2026-09-02T10:05:00.000Z',
        data: { 'host.name': 'h1' },
      }),
      expect.objectContaining({ id: 'alert-1' }),
    ]);
    expect(lookup.esClient.esql.query).toHaveBeenCalledTimes(2);
  });

  it('leaves the rule name unset when the user cannot read the rule', async () => {
    const lookup = makeLookup({
      getRule: jest.fn().mockRejectedValue(Boom.forbidden('forbidden')),
      columns: [
        'episode.id',
        'first_timestamp',
        'last_timestamp',
        'episode.status',
        'rule.id',
        'group_hash',
      ],
      rows: [
        [
          'episode-1',
          '2026-09-02T10:00:00.000Z',
          '2026-09-02T10:05:00.000Z',
          'active',
          'v2-rule',
          'hash',
        ],
      ],
    });

    const [snapshot] = await run(makeAlertsClient({ alerts: [] }), lookup, ['episode-1']);

    expect(snapshot).toEqual(expect.objectContaining({ id: 'episode-1' }));
    expect(snapshot).not.toHaveProperty('rule_name', expect.any(String));
  });

  const v2Columns = [
    'episode.id',
    'first_timestamp',
    'last_timestamp',
    'episode.status',
    'rule.id',
    'group_hash',
  ];
  const v2Row = (ruleId: string | null, groupHash: string | null = 'hash') => [
    'episode-1',
    '2026-09-02T10:00:00.000Z',
    '2026-09-02T10:05:00.000Z',
    'active',
    ruleId,
    groupHash,
  ];

  it('names a v2 episode without a rule from its data', async () => {
    const lookup = makeLookup({
      columns: v2Columns,
      rows: [v2Row(null)],
      episodeData: { 'episode-1': '{"rule_name":"Ad hoc"}' },
    });

    const [snapshot] = await run(makeAlertsClient({ alerts: [] }), lookup, ['episode-1']);

    expect(snapshot).toEqual(
      expect.objectContaining({ alert_version: 'v2', id: 'episode-1', rule_name: 'Ad hoc' })
    );
    expect(snapshot).not.toHaveProperty('rule_id', expect.any(String));
    expect(lookup.getRulesClient).not.toHaveBeenCalled();
  });

  it('keeps a v2 episode whose data rule name is empty', async () => {
    const lookup = makeLookup({
      columns: v2Columns,
      rows: [v2Row(null)],
      episodeData: { 'episode-1': '{"rule_name":""}' },
    });

    const [snapshot] = await run(makeAlertsClient({ alerts: [] }), lookup, ['episode-1']);

    expect(snapshot).toEqual(expect.objectContaining({ id: 'episode-1' }));
    expect(snapshot).not.toHaveProperty('rule_name', expect.any(String));
  });

  it('treats a malformed v2 episode as not found', async () => {
    const lookup = makeLookup({ columns: v2Columns, rows: [v2Row('v2-rule', null)] });

    await expect(run(makeAlertsClient({ alerts: [] }), lookup, ['episode-1'])).rejects.toThrow(
      'Alert with id episode-1 not found'
    );
  });

  it('drops the oversize field of a v2 episode that is too large to store in a subject snapshot', async () => {
    const lookup = makeLookup({
      columns: [
        'episode.id',
        'first_timestamp',
        'last_timestamp',
        'episode.status',
        'rule.id',
        'group_hash',
      ],
      rows: [
        ['ep-1', '2026-09-02T10:00:00.000Z', '2026-09-02T10:05:00.000Z', 'active', 'v2-rule', 'h1'],
      ],
      episodeData: { 'ep-1': JSON.stringify({ message: 'x'.repeat(65_000) }) },
    });

    const [snapshot] = await run(makeAlertsClient({ alerts: [] }), lookup, ['ep-1']);

    expect(snapshot).toEqual(
      expect.objectContaining({ id: 'ep-1', rule_name: 'V2 rule', data: {} })
    );
  });

  it('truncates large arrays of a v2 episode instead of dropping its data', async () => {
    const lookup = makeLookup({
      columns: v2Columns,
      rows: [v2Row('v2-rule')],
      episodeData: {
        'episode-1': JSON.stringify({
          event_id: 'evt-1',
          rule_ids: ['rule-1'],
          signals: Array.from({ length: 400 }, (_, i) => `signal-${i}-${'x'.repeat(100)}`),
        }),
      },
    });

    const [snapshot] = await run(makeAlertsClient({ alerts: [] }), lookup, ['episode-1']);

    expect(snapshot).toMatchObject({
      data: { event_id: 'evt-1', rule_ids: ['rule-1'], signals_truncated: 400 },
    });
    expect(JSON.stringify(snapshot).length).toBeLessThan(33_000 + 1_000);
  });

  it('keeps the identifying fields of a v2 episode whose data is large without arrays', async () => {
    const lookup = makeLookup({
      columns: v2Columns,
      rows: [v2Row('v2-rule')],
      episodeData: {
        'episode-1': JSON.stringify({
          event_id: 'evt-1',
          title: 'Checkout errors',
          summary: 'x'.repeat(40_000),
        }),
      },
    });

    const [snapshot] = await run(makeAlertsClient({ alerts: [] }), lookup, ['episode-1']);

    expect(snapshot).toMatchObject({ data: { event_id: 'evt-1', title: 'Checkout errors' } });
  });

  it('keeps the names of readable rules when another rule is inaccessible', async () => {
    const lookup = makeLookup({
      getRule: jest.fn(async ({ id }: { id: string }) => {
        if (id === 'hidden-rule') throw Boom.forbidden('forbidden');
        return { id, metadata: { name: 'V2 rule' } };
      }),
      columns: [
        'episode.id',
        'first_timestamp',
        'last_timestamp',
        'episode.status',
        'rule.id',
        'group_hash',
      ],
      rows: [
        ['ep-1', '2026-09-02T10:00:00.000Z', '2026-09-02T10:05:00.000Z', 'active', 'v2-rule', 'h1'],
        [
          'ep-2',
          '2026-09-02T10:00:00.000Z',
          '2026-09-02T10:05:00.000Z',
          'active',
          'hidden-rule',
          'h2',
        ],
      ],
    });

    const snapshots = await run(makeAlertsClient({ alerts: [] }), lookup, ['ep-1', 'ep-2']);

    expect(snapshots).toEqual([
      expect.objectContaining({ id: 'ep-1', rule_name: 'V2 rule' }),
      expect.not.objectContaining({ rule_name: expect.any(String) }),
    ]);
  });

  it('lists every id it cannot find in one not found error', async () => {
    const alertsClient = makeAlertsClient({ indices: [] });
    const lookup = makeLookup();

    await expect(run(alertsClient, lookup, ['a', 'b'])).rejects.toMatchObject({
      message: 'Alert with id a, b not found',
      output: { statusCode: 404 },
    });
  });

  it.each([
    ['the user cannot read the events', 403, 'security_exception'],
    [
      'the events index does not exist',
      400,
      'verification_exception: Unknown index [.rule-events]',
    ],
  ])('treats an id as not found when %s', async (_, statusCode, reason) => {
    const queryError = new errors.ResponseError({
      statusCode,
      body: { error: { reason } },
      headers: {},
      meta: {} as never,
      warnings: [],
    });

    await expect(
      run(makeAlertsClient({ alerts: [] }), makeLookup({ queryError }), ['a'])
    ).rejects.toMatchObject({ output: { statusCode: 404 } });
  });

  it('keeps unexpected events lookup failures as errors', async () => {
    const queryError = new Error('Elasticsearch unavailable');

    await expect(
      run(makeAlertsClient({ alerts: [] }), makeLookup({ queryError }), ['a'])
    ).rejects.toBe(queryError);
  });

  it('keeps an alert that lacks required fields, with placeholders', async () => {
    const alertsClient = makeAlertsClient({
      alerts: [{ ...alert, 'kibana.alert.rule.name': undefined }],
    });

    await expect(run(alertsClient, makeLookup(), ['alert-1'])).resolves.toEqual([
      expect.objectContaining({ id: 'alert-1', rule_name: 'unknown' }),
    ]);
  });

  it('preserves alert lookup failures', async () => {
    const lookupError = new Error('Elasticsearch unavailable');
    const alertsClient = makeAlertsClient();
    alertsClient.find.mockRejectedValue(lookupError);

    await expect(run(alertsClient, makeLookup(), ['alert-1'])).rejects.toBe(lookupError);
  });
});

describe('truncateV2AlertData', () => {
  const lines = (count: number, width: number) =>
    Array.from({ length: count }, (_, i) => `line-${i}-${'x'.repeat(width)}`);
  const jsonLength = (value: unknown) => JSON.stringify(value).length;

  it('returns data within the limit untouched', () => {
    const data = { event_id: 'evt-1', signals: lines(3, 10) };

    expect(truncateV2AlertData(data)).toEqual(data);
  });

  it('halves the largest array until the data fits and records its original length', () => {
    const data = { event_id: 'evt-1', signals: lines(400, 100), tags: lines(5, 10) };

    const result = truncateV2AlertData(data);

    expect(jsonLength(result)).toBeLessThanOrEqual(MAX_V2_ALERT_DATA_LENGTH);
    expect(result).toMatchObject({ event_id: 'evt-1', signals_truncated: 400, tags: data.tags });
    expect(result).not.toHaveProperty('tags_truncated');
    expect((result.signals as string[]).length).toBeLessThan(400);
  });

  it('keeps the serialized length within the limit when several arrays are large', () => {
    const data = {
      event_id: 'evt-1',
      signals: lines(300, 90),
      blast_radius: lines(300, 70),
      causal_features: lines(300, 50),
    };

    expect(jsonLength(truncateV2AlertData(data))).toBeLessThanOrEqual(MAX_V2_ALERT_DATA_LENGTH);
  });

  it('drops the largest field, keeping the small ones, when no array is left to halve', () => {
    const data = { event_id: 'evt-1', title: 'Checkout errors', summary: 'x'.repeat(40_000) };

    expect(truncateV2AlertData(data)).toEqual({ event_id: 'evt-1', title: 'Checkout errors' });
  });

  it('drops an oversize non-array field once halving the arrays is not enough', () => {
    const data = {
      event_id: 'evt-1',
      signals: lines(50, 10),
      summary: 'x'.repeat(40_000),
    };

    const result = truncateV2AlertData(data);

    expect(jsonLength(result)).toBeLessThanOrEqual(MAX_V2_ALERT_DATA_LENGTH);
    expect(result).toMatchObject({ event_id: 'evt-1', signals_truncated: 50 });
    expect(result).not.toHaveProperty('summary');
  });
});
