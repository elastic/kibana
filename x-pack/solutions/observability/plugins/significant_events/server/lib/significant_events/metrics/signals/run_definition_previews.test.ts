/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import type { SignalQueryRenderPlan } from './render_signal_query';
import { runDefinitionPreviews } from './run_definition_previews';
import type {
  MeasurementDefinition,
  SignalComparison,
  SignalTemplate,
  SignalTemplateVariant,
} from './types';

const source = { kind: 'nightshift_default' as const, reason: 'test' };
const variant: SignalTemplateVariant = {
  schema: 'ecs',
  dataset: 'system.cpu',
  field: 'system.cpu.total.norm.pct',
  formula: 'AVG(system.cpu.total.norm.pct)',
  formulaKind: 'average',
  source,
};

const createDefinition = (signal: string, comparison: SignalComparison): MeasurementDefinition => ({
  signal,
  type_ki_id: `host:${signal}`,
  entity_type: 'host',
  entity_fields: ['host.name'],
  metric_type: 'gauge',
  unit: 'ratio',
  value_column: 'value',
  context_columns: [],
  esql: 'stored query',
  hint: { comparison, threshold: 0.9, window: '5 minutes', source },
  measurements: [
    {
      schema: variant.schema,
      dataset: variant.dataset,
      field: variant.field,
      formula: variant.formula,
      source,
    },
  ],
});

const createPlan = (signal: string, comparison: SignalComparison): SignalQueryRenderPlan => {
  const template: SignalTemplate = {
    signal,
    subtypes: ['host'],
    metricType: 'gauge',
    unit: 'ratio',
    contextColumns: [],
    hint: { comparison, threshold: 0.9, window: '5 minutes' },
    variants: [variant],
  };
  return {
    esql: 'FROM metrics-*',
    subtype: 'host',
    breakdown: ['host.name'],
    template,
    variants: [variant],
  };
};

const createResponse = (rows: Array<[string, string, number, number]>): ESQLSearchResponse =>
  ({
    columns: [
      { name: 'minute', type: 'date' },
      { name: 'host.name', type: 'keyword' },
      { name: 'value', type: 'double' },
      { name: 'preview_entity_count', type: 'long' },
    ],
    values: rows,
  } as ESQLSearchResponse);

describe('runDefinitionPreviews', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('isolates a failed preview and uses one rounded window for the others', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-23T10:07:42.000Z'));
    const query = jest
      .fn()
      .mockRejectedValueOnce(new Error('preview failed'))
      .mockResolvedValueOnce(createResponse([['2026-11-23T10:06:00.000Z', 'host-b', 0.4, 1]]));
    const definitions = [
      createDefinition('host.cpu.utilization', '>='),
      createDefinition('host.memory.utilization', '>='),
    ];

    const result = await runDefinitionPreviews({
      esClient: { esql: { query } } as never,
      definitions,
      previewPlans: [
        createPlan('host.cpu.utilization', '>='),
        createPlan('host.memory.utilization', '>='),
      ],
    });

    expect(result[0].preview?.error).toBe('preview failed');
    expect(result[1].preview?.rows).toEqual([
      {
        entity: 'host-b',
        minute: '2026-11-23T10:06:00.000Z',
        value: 0.4,
      },
    ]);
    expect(result.map(({ preview }) => ({ from: preview?.from, to: preview?.to }))).toEqual([
      { from: '2026-11-23T09:52:00.000Z', to: '2026-11-23T10:07:00.000Z' },
      { from: '2026-11-23T09:52:00.000Z', to: '2026-11-23T10:07:00.000Z' },
    ]);
    expect(query.mock.calls[1][0].query).toContain(
      '@timestamp >= "2026-11-23T09:52:00.000Z"\n    AND @timestamp < "2026-11-23T10:07:00.000Z"'
    );
  });

  it('returns lower is worse entities in ascending rank order', async () => {
    const query = jest.fn().mockResolvedValue(
      createResponse([
        ['2026-11-23T10:05:00.000Z', 'host-low', 0.1, 2],
        ['2026-11-23T10:06:00.000Z', 'host-low', 0.2, 2],
        ['2026-11-23T10:05:00.000Z', 'host-high', 0.6, 2],
      ])
    );
    const definition = createDefinition('host.memory.available', '<');

    const [result] = await runDefinitionPreviews({
      esClient: { esql: { query } } as never,
      definitions: [definition],
      previewPlans: [createPlan(definition.signal, '<')],
    });

    expect([...new Set(result.preview?.rows.map(({ entity }) => entity))]).toEqual([
      'host-low',
      'host-high',
    ]);
    expect(query.mock.calls[0][0].query).toContain('| INLINE STATS rank_value = MIN(value)');
    expect(query.mock.calls[0][0].query).toContain('| SORT rank_value ASC, host.name, minute');
  });
});
