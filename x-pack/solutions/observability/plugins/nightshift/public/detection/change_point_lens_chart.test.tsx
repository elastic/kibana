/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { LifecycleDetection } from '@kbn/significant-events-schema';
import { buildDetectionOccurrencesEsql, ChangePointLensChart } from './change_point_lens_chart';

const mockBuild = jest.fn();
const mockGetActiveSpace = jest.fn();
const mockEmbeddableComponent = jest.fn(({ attributes }: { attributes: { title: string } }) => (
  <div data-test-subj="mockLensEmbeddable">{attributes.title}</div>
));
const mockServices = {
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

jest.mock('../../../utils/kibana_react', () => ({
  useKibana: () => ({
    services: mockServices,
  }),
}));

const ruleUuid = 'rule-uuid-001';
const detection: LifecycleDetection = {
  detection_id: 'detection-1',
  rule_name: 'Checkout latency spike',
  rule_uuid: ruleUuid,
  stream_name: 'logs.checkout-api',
  change_point_type: 'spike',
  '@timestamp': '2026-07-10T12:00:00.000Z',
};

describe('ChangePointLensChart', () => {
  beforeEach(() => {
    mockBuild.mockReset().mockResolvedValue({ title: '[Logs] Spike' });
    mockGetActiveSpace.mockReset().mockResolvedValue({ id: 'space-a' });
    mockEmbeddableComponent.mockClear();
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

  it('renders a Lens embeddable with a bar series and change point annotation', async () => {
    render(
      <I18nProvider>
        <EuiProvider>
          <ChangePointLensChart detection={detection} />
        </EuiProvider>
      </I18nProvider>
    );

    await waitFor(() => expect(mockBuild).toHaveBeenCalled());

    const [config, options] = mockBuild.mock.calls[0];
    expect(config).toEqual(
      expect.objectContaining({
        chartType: 'xy',
        title: '[Logs] Spike',
        layers: [
          expect.objectContaining({
            type: 'series',
            seriesType: 'bar',
            xAxis: { field: 'timestamp', type: 'dateHistogram' },
          }),
          expect.objectContaining({
            type: 'annotation',
            events: [
              expect.objectContaining({
                name: 'Spike',
                datetime: detection['@timestamp'],
              }),
            ],
          }),
        ],
      })
    );
    expect(options.query.esql).toContain('FIELD_EXTRACT(data, "metric_value")');
    expect(options.query.esql).toContain('space_id == "space-a"');

    expect(await screen.findByTestId('mockLensEmbeddable')).toHaveTextContent('[Logs] Spike');
    expect(mockEmbeddableComponent.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        id: 'nightshift-detection-detection-1',
        timeRange: {
          from: '2026-07-10T11:00:00.000Z',
          to: '2026-07-10T12:15:00.000Z',
        },
        withDefaultActions: true,
      })
    );
  });

  it('shows the warning callout when the detection has no rule UUID', async () => {
    render(
      <I18nProvider>
        <EuiProvider>
          <ChangePointLensChart detection={{ ...detection, rule_uuid: undefined }} />
        </EuiProvider>
      </I18nProvider>
    );

    expect(await screen.findByText('Unable to load occurrence visualization')).toBeInTheDocument();
    expect(mockBuild).not.toHaveBeenCalled();
  });
});
