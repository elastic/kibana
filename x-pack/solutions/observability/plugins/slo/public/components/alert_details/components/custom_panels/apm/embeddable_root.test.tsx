/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { buildSlo } from '../../../../../data/slo/slo';
import { buildApmLatencyIndicator } from '../../../../../data/slo/indicator';
import type { BurnRateAlert, BurnRateRule } from '../../../types';
import type { APMTransactionDurationSLOResponse } from './embeddable_root';
import { APMEmbeddableRoot } from './embeddable_root';

const mockGetSerializedState = jest.fn();

jest.mock('@kbn/embeddable-plugin/public', () => ({
  EmbeddableRenderer: ({
    getParentApi,
  }: {
    getParentApi: () => { getSerializedStateForChild: () => unknown };
  }) => {
    mockGetSerializedState(getParentApi().getSerializedStateForChild());
    return null;
  },
}));

const renderWithFilter = (
  filter: APMTransactionDurationSLOResponse['indicator']['params']['filter']
) =>
  render(
    <APMEmbeddableRoot
      slo={
        buildSlo({
          indicator: buildApmLatencyIndicator({ filter }),
        }) as APMTransactionDurationSLOResponse
      }
      dataTimeRange={{ from: new Date('2026-01-01'), to: new Date('2026-01-02') }}
      embeddableId="apm_alerting_latency_chart"
      alert={{} as BurnRateAlert}
      rule={{} as BurnRateRule}
    />
  );

describe('APMEmbeddableRoot', () => {
  beforeEach(() => mockGetSerializedState.mockClear());

  it('passes a string filter as kuery', () => {
    renderWithFilter('host.name : "a"');

    expect(mockGetSerializedState).toHaveBeenCalledWith(
      expect.objectContaining({ kuery: 'host.name : "a"' })
    );
  });

  it('passes the kqlQuery as kuery and the filter pills as filters for a kqlWithFilters filter', () => {
    renderWithFilter({
      kqlQuery: 'host.name : "a"',
      filters: [{ meta: {}, query: { match_phrase: { 'agent.name': 'beats' } } }],
    });

    const [[input]] = mockGetSerializedState.mock.calls;
    expect(input.kuery).toBe('host.name : "a"');
    expect(JSON.stringify(input.filters)).toContain('"agent.name":"beats"');
  });
});
