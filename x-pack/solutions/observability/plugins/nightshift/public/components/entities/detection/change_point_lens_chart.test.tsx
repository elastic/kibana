/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { LifecycleDetection } from '@kbn/significant-events-schema';
import { buildDetectionOccurrencesEsql, ChangePointLensChart } from './change_point_lens_chart';

const mockBuild = jest.fn();
const mockGetActiveSpace = jest.fn();
const mockSourcesFetch = jest.fn();
const mockEmbeddableComponent = jest.fn(({ attributes }: { attributes: { title: string } }) => (
  <div data-test-subj="mockLensEmbeddable">{attributes.title}</div>
));
const mockServices: {
  dataViews: Record<string, never>;
  lens: { EmbeddableComponent: typeof mockEmbeddableComponent };
  spaces: { getActiveSpace: typeof mockGetActiveSpace };
  nightshiftSources?: { getClient: () => Promise<{ fetch: typeof mockSourcesFetch }> };
} = {
  dataViews: {},
  lens: {
    EmbeddableComponent: mockEmbeddableComponent,
  },
  spaces: {
    getActiveSpace: mockGetActiveSpace,
  },
};

jest.mock('@kbn/lens-embeddable-utils', () => ({
  LensConfigBuilder: jest.fn().mockImplementation(() => ({
    build: mockBuild,
  })),
}));

jest.mock('../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: mockServices,
  }),
}));

const ruleUuid = 'rule-uuid-001';
const detection: LifecycleDetection = {
  detection_id: 'detection-1',
  rule_name: 'Checkout latency spike',
  rule_uuid: ruleUuid,
  source_id: 'logs.checkout-api',
  change_point_type: 'spike',
  '@timestamp': '2026-07-10T12:00:00.000Z',
};

const renderChart = (node: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <EuiProvider>{node}</EuiProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
};

describe('ChangePointLensChart', () => {
  beforeEach(() => {
    mockBuild.mockReset().mockResolvedValue({ title: '[Logs] Spike' });
    mockGetActiveSpace.mockReset().mockResolvedValue({ id: 'space-a' });
    mockSourcesFetch.mockReset();
    delete mockServices.nightshiftSources;
  });

  it('builds the metric-series occurrence query for the active space and rule', () => {
    const query = buildDetectionOccurrencesEsql({
      ruleUuid,
      spaceId: 'space-a',
      from: '2026-07-10T11:00:00.000Z',
      to: '2026-07-10T12:15:00.000Z',
    });

    expect(query).toContain('FROM .rule-events');
    expect(query).toContain('space_id == "space-a"');
    expect(query).toContain('rule.id == "rule-uuid-001"');
    expect(query).toContain('FIELD_EXTRACT(data, "metric_value")');
    expect(query).toContain('FIELD_EXTRACT(data, "bucket")');
    expect(query).toContain('MAX(metric_value)');
    expect(query).toContain('SUM(minute_value)');
    expect(query).toContain('BUCKET(source_minute, 5 minutes)');
    expect(query).toContain('bucket >= TO_DATETIME("2026-07-10T11:00:00.000Z")');
    expect(query).toContain('bucket <= TO_DATETIME("2026-07-10T12:15:00.000Z")');
    expect(query).toContain('LIMIT 100');
    expect(query).not.toContain('COUNT_DISTINCT');
    expect(query).not.toContain('group_hash');
  });

  it('prefixes the title from the source FROM', async () => {
    mockServices.nightshiftSources = {
      getClient: async () => ({ fetch: mockSourcesFetch }),
    };
    mockSourcesFetch.mockResolvedValue({
      sources: [{ esql: 'FROM metrics-host' }],
      total: 1,
      page: 1,
      per_page: 1,
    });
    mockBuild.mockResolvedValue({ title: '[Metrics] Spike' });

    renderChart(<ChangePointLensChart detection={detection} />);

    await waitFor(() => expect(mockBuild).toHaveBeenCalled());
    const [config] = mockBuild.mock.calls.at(-1);
    expect(config.title).toBe('[Metrics] Spike');
    expect(mockSourcesFetch).toHaveBeenCalledWith('GET /internal/nightshift/sources', {
      params: {
        query: { ids: ['logs.checkout-api'], page: 1, per_page: 1 },
      },
      signal: expect.any(AbortSignal),
    });
  });
});
