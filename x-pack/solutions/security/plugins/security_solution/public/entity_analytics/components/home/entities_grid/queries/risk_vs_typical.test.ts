/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import type { QueryArgs, Row } from '../common';
import { getRiskScoreIndex, OWN_RISK_SCORE_CONDITION } from './esql';
import {
  buildTypicalScoreQuery,
  RISK_TYPICAL_FIELD,
  RISK_VS_TYPICAL_FIELD,
  riskVsTypicalQuerySpec,
} from './risk_vs_typical';
import {
  setBaselineDataMode,
  setBaselineVersion,
} from '../../../../baseline_prototype/baseline_prototype_state';
import { getMockTypicalScore } from '../../../../baseline_prototype/prototype_data';

const args: QueryArgs = {
  namespace: 'default',
  timeRange: '7d',
  sort: { field: 'entity.risk.calculated_score_norm', direction: 'desc' },
  pageSize: 25,
  rowsMode: 'individual',
  concreteEntityIndexName: '.entities.v2.latest.security_default',
  anomalyJobIds: [],
};

const rows: Row[] = [
  { 'entity.id': 'user:a', 'entity.risk.calculated_score_norm': 80 },
  { 'entity.id': 'user:b', 'entity.risk.calculated_score_norm': 50 },
  { 'entity.id': 'user:c' },
];

const fetchValues = (runQuery: jest.Mock, queryArgs: QueryArgs = args) =>
  riskVsTypicalQuerySpec.enricher!.fetch(rows, queryArgs, {
    runQuery,
    http: httpServiceMock.createSetupContract(),
  });

describe('buildTypicalScoreQuery', () => {
  it('reads the risk score history of the given entities over the time range', () => {
    const query = buildTypicalScoreQuery(args, ['user:a', 'user:b']).join('\n');

    expect(query).toContain(`FROM ${getRiskScoreIndex('default')}`);
    expect(query).toContain('`@timestamp` >= NOW() - 7 days');
    expect(query).toContain('user.risk.id_value IN ("user:a", "user:b")');
    expect(query).toContain('entity_id IN ("user:a", "user:b")');
  });

  it('takes the median of the entity own scores for individual rows', () => {
    const query = buildTypicalScoreQuery(args, ['user:a']).join('\n');

    expect(query).toContain(`| WHERE ${OWN_RISK_SCORE_CONDITION}`);
    expect(query).toContain('| STATS typical_score = MEDIAN(score) BY entity_id');
    expect(query).not.toContain('is_group');
  });

  it('prefers the group median for resolved rows', () => {
    const query = buildTypicalScoreQuery({ ...args, rowsMode: 'resolved' }, ['user:a']).join('\n');

    expect(query).toContain('STATS typical = MEDIAN(score) BY entity_id, is_group');
    expect(query).toContain('typical_score = COALESCE(group_value, own_value)');
    expect(query).not.toContain(`| WHERE ${OWN_RISK_SCORE_CONDITION}`);
  });

  it.each([
    ['24h', 'NOW() - 1 days'],
    ['7d', 'NOW() - 7 days'],
    ['30d', 'NOW() - 30 days'],
  ] as const)('follows the %s time range', (timeRange, lookback) => {
    expect(buildTypicalScoreQuery({ ...args, timeRange }, ['user:a']).join('\n')).toContain(
      lookback
    );
  });
});

describe('riskVsTypicalQuerySpec', () => {
  // The prototype defaults to mock data once it is on; these tests name the version and mode.
  beforeEach(() => {
    setBaselineVersion('off');
    setBaselineDataMode('live');
  });

  it('is not sortable: sorting would read every entity over the whole range', () => {
    expect(riskVsTypicalQuerySpec.fetchSortPage).toBeUndefined();
    expect(riskVsTypicalQuerySpec.enricher?.fields).toEqual([
      RISK_VS_TYPICAL_FIELD,
      RISK_TYPICAL_FIELD,
    ]);
  });

  it('sets the difference and the typical score from the live query', async () => {
    const runQuery = jest.fn().mockResolvedValue([{ entity_id: 'user:a', typical_score: 60 }]);

    const values = await fetchValues(runQuery);

    expect(runQuery).toHaveBeenCalledTimes(1);
    expect(values.get('user:a')).toEqual({ [RISK_VS_TYPICAL_FIELD]: 20, [RISK_TYPICAL_FIELD]: 60 });
  });

  it('leaves an entity with no history, or no current score, empty', async () => {
    const runQuery = jest.fn().mockResolvedValue([{ entity_id: 'user:a', typical_score: 60 }]);

    const values = await fetchValues(runQuery);

    expect(values.get('user:b')).toEqual({
      [RISK_VS_TYPICAL_FIELD]: null,
      [RISK_TYPICAL_FIELD]: null,
    });
    expect(values.get('user:c')).toEqual({
      [RISK_VS_TYPICAL_FIELD]: null,
      [RISK_TYPICAL_FIELD]: null,
    });
  });

  it('reads as no history when the risk score index does not exist yet', async () => {
    const runQuery = jest
      .fn()
      .mockRejectedValue(new Error('Unknown index [risk-score.risk-score-default]'));

    const values = await fetchValues(runQuery);

    expect(values.get('user:a')).toEqual({
      [RISK_VS_TYPICAL_FIELD]: null,
      [RISK_TYPICAL_FIELD]: null,
    });
  });

  it('still fails on any other query error', async () => {
    const runQuery = jest.fn().mockRejectedValue(new Error('parsing_exception'));

    await expect(fetchValues(runQuery)).rejects.toThrow('parsing_exception');
  });

  it('reads the real history when the prototype is off, even if the data mode is mock', async () => {
    setBaselineDataMode('mock');
    const runQuery = jest.fn().mockResolvedValue([{ entity_id: 'user:a', typical_score: 60 }]);

    await fetchValues(runQuery);

    expect(runQuery).toHaveBeenCalledTimes(1);
  });

  it('runs no query in mock mode and returns the made-up typical score', async () => {
    setBaselineVersion('v0');
    setBaselineDataMode('mock');
    const runQuery = jest.fn();

    const values = await fetchValues(runQuery);

    expect(runQuery).not.toHaveBeenCalled();
    const typical = getMockTypicalScore('user:a', 80);
    expect(values.get('user:a')).toEqual({
      [RISK_VS_TYPICAL_FIELD]: 80 - typical,
      [RISK_TYPICAL_FIELD]: typical,
    });
  });

  it('runs nothing for a page with no entity ids', async () => {
    const runQuery = jest.fn();

    const values = await riskVsTypicalQuerySpec.enricher!.fetch([{}], args, {
      runQuery,
      http: httpServiceMock.createSetupContract(),
    });

    expect(runQuery).not.toHaveBeenCalled();
    expect(values.size).toBe(0);
  });
});
