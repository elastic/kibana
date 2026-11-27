/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { APMTransactionDurationIndicator, SLOWithSummaryResponse } from '@kbn/slo-schema';
import { ALL_VALUE } from '@kbn/slo-schema';
import { convertSliApmParamsToApmAppDeeplinkUrl } from './convert_sli_apm_params_to_apm_app_deeplink_url';
import { buildSlo } from '../../data/slo/slo';
import { buildApmLatencyIndicator } from '../../data/slo/indicator';

const DEFAULT_PARAMS = {
  environment: 'fooEnvironment',
  filter: 'agent.name : "beats" and agent.version : 3.4.12',
  service: 'barService',
  transactionName: 'bazName',
  transactionType: 'blarfType',
};

const toUrl = (
  params: Partial<APMTransactionDurationIndicator['params']> = {},
  slo: Partial<SLOWithSummaryResponse> = {},
  timeRange?: { from: string; to: string }
): URL => {
  const url = convertSliApmParamsToApmAppDeeplinkUrl(
    buildSlo({ indicator: buildApmLatencyIndicator({ ...DEFAULT_PARAMS, ...params }), ...slo }),
    timeRange
  );
  return new URL(url ?? '', 'http://localhost');
};

describe('convertSliApmParamsToApmAppDeeplinkUrl', () => {
  it('builds the APM service overview deeplink from all params', () => {
    const { pathname, search } = toUrl();

    expect(`${pathname}${search}`).toMatchInlineSnapshot(
      `"/app/apm/services/barService/overview?comparisonEnabled=true&environment=fooEnvironment&transactionType=blarfType&rangeFrom=now-30d&rangeTo=now&kuery=transaction.name+%3A+%22bazName%22+and+%28agent.name+%3A+%22beats%22+and+agent.version+%3A+3.4.12%29"`
    );
  });

  it.each([
    ['environment', (url: URL) => url.searchParams.get('environment'), 'ENVIRONMENT_ALL'],
    ['transactionType', (url: URL) => url.searchParams.get('transactionType'), ''],
    ['service', (url: URL) => url.pathname, '/app/apm/services/*/overview'],
    ['transactionName', (url: URL) => url.searchParams.get('kuery'), `(${DEFAULT_PARAMS.filter})`],
  ])('maps %s set to ALL_VALUE', (param, pick, expected) => {
    expect(pick(toUrl({ [param]: ALL_VALUE }))).toBe(expected);
  });

  it.each([
    ['an empty KQL string filter', '', 'transaction.name : "bazName"'],
    ['a whitespace-only KQL string filter', '  ', 'transaction.name : "bazName"'],
    [
      'a kqlWithFilters filter (kqlQuery only, filter pills dropped)',
      {
        kqlQuery: 'host.name : "a"',
        filters: [{ meta: {}, query: { match_phrase: { 'agent.name': 'beats' } } }],
      },
      'transaction.name : "bazName" and (host.name : "a")',
    ],
    [
      'a KQL filter with an `or` clause',
      'host.name : "a" or host.name : "b"',
      'transaction.name : "bazName" and (host.name : "a" or host.name : "b")',
    ],
    [
      'a kqlWithFilters filter with an empty kqlQuery',
      { kqlQuery: '', filters: [] },
      'transaction.name : "bazName"',
    ],
  ])('builds the kuery for %s', (_, filter, expectedKuery) => {
    expect(toUrl({ filter }).searchParams.get('kuery')).toBe(expectedKuery);
  });

  it('appends the groupings of an SLO instance to the kuery', () => {
    const url = toUrl(
      {},
      { instanceId: 'project-123', groupings: { 'label.project_id': 'project-123' } }
    );

    expect(url.searchParams.get('kuery')).toBe(
      `transaction.name : "bazName" and (${DEFAULT_PARAMS.filter}) and label.project_id : "project-123"`
    );
  });

  it('ignores the groupings when instanceId is ALL_VALUE', () => {
    const url = toUrl({}, { instanceId: ALL_VALUE, groupings: { 'label.project_id': 'x' } });

    expect(url.searchParams.get('kuery')).not.toContain('label.project_id');
  });

  it('uses the service.name grouping as the service path instead of the kuery', () => {
    const url = toUrl(
      { service: ALL_VALUE },
      {
        instanceId: 'cart-service,project-123',
        groupings: { 'service.name': 'cart-service', 'label.project_id': 'project-123' },
      }
    );

    expect(url.pathname).toBe('/app/apm/services/cart-service/overview');
    expect(url.searchParams.get('kuery')).toBe(
      `transaction.name : "bazName" and (${DEFAULT_PARAMS.filter}) and label.project_id : "project-123"`
    );
  });

  it('uses the provided timeRange instead of the SLO duration', () => {
    const { searchParams } = toUrl({}, {}, { from: '2026-03-01T00:00:00.000Z', to: 'now' });

    expect(searchParams.get('rangeFrom')).toBe('2026-03-01T00:00:00.000Z');
    expect(searchParams.get('rangeTo')).toBe('now');
  });
});
