/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { DataTableRecord } from '@kbn/discover-utils';
import { TestProviders } from '../../../../../common/mock';
import { RelatedThreatReportsPanel } from './related_threat_reports_panel';
import { RELATED_THREAT_REPORTS_PANEL_TEST_ID } from './test_ids';
import { useFlyoutInsights } from '../hooks/use_flyout_insights';

jest.mock('../hooks/use_flyout_insights');

const mockHit: DataTableRecord = {
  id: 'alert-1',
  raw: { _id: 'alert-1', _index: '.alerts-security.alerts-default' },
  flattened: { 'kibana.alert.rule.uuid': ['rule-uuid'] },
  isAnchor: false,
};

const renderPanel = () =>
  render(
    <TestProviders>
      <RelatedThreatReportsPanel hit={mockHit} />
    </TestProviders>
  );

describe('<RelatedThreatReportsPanel />', () => {
  beforeEach(() => {
    jest.mocked(useFlyoutInsights).mockReturnValue({
      enabled: true,
      loading: false,
      error: undefined,
      data: undefined,
      refetch: jest.fn(),
    });
  });

  it('renders nothing when feature is disabled', () => {
    jest.mocked(useFlyoutInsights).mockReturnValue({
      enabled: false,
      loading: false,
      error: undefined,
      data: undefined,
      refetch: jest.fn(),
    });

    const { container } = renderPanel();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders empty state when no related reports', () => {
    jest.mocked(useFlyoutInsights).mockReturnValue({
      enabled: true,
      loading: false,
      error: undefined,
      data: {
        status: 'ok',
        related_reports: [],
        meta: {
          layer_1_resolved: false,
          technique_overlap_count: 0,
          reports_returned: 0,
        },
      },
      refetch: jest.fn(),
    });

    const { getByTestId, getByText } = renderPanel();

    expect(getByTestId(RELATED_THREAT_REPORTS_PANEL_TEST_ID)).toBeInTheDocument();
    expect(getByText('No related threat reports found for this alert.')).toBeInTheDocument();
  });

  it('renders related report rows', () => {
    jest.mocked(useFlyoutInsights).mockReturnValue({
      enabled: true,
      loading: false,
      error: undefined,
      data: {
        status: 'ok',
        related_reports: [
          {
            report_id: 'report-1',
            title: 'Test report',
            source: { type: 'rss', name: 'Feed' },
            severity: 'high',
            extracted_at: '2026-05-01T00:00:00.000Z',
            techniques: ['T1059'],
            environment_hits_total: 2,
            join_reason: 'technique_overlap',
            matched_technique_ids: ['T1059'],
          },
        ],
        meta: {
          layer_1_resolved: false,
          technique_overlap_count: 1,
          reports_returned: 1,
        },
      },
      refetch: jest.fn(),
    });

    const { getByTestId, getByText } = renderPanel();

    expect(getByTestId('relatedThreatReportRow-report-1')).toBeInTheDocument();
    expect(getByText('Test report')).toBeInTheDocument();
  });
});
