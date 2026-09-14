/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import type { ProposalChartsSummaryResponse } from '@kbn/agentic-investigations-plugin/common';
import { useProposalChartsSummary } from '../../hooks/use_proposal_charts_summary';
import { ProposalsTrendChartRow } from './proposals_trend_chart_row';

jest.mock('../../hooks/use_proposal_charts_summary', () => ({
  DEFAULT_WINDOW_HOURS: 24,
  DEFAULT_BUCKET_MINUTES: 30,
  useProposalChartsSummary: jest.fn(),
}));

// @elastic/charts wants a real canvas; what this row owns is which series and
// which window reach the chart, so the chart itself stands in as its props.
jest.mock('./trend_sparkline', () => ({
  SPARKLINE_HEIGHT_SIZE: 'xxxl',
  TrendSparkline: ({
    series,
    panelId,
    bucketMinutes,
  }: {
    series: Array<{ x: number; y: number }>;
    panelId: string;
    bucketMinutes: number;
  }) => (
    <div
      data-test-subj={`sparkline-${panelId}`}
      data-series={JSON.stringify(series)}
      data-bucket-minutes={bucketMinutes}
    />
  ),
}));

const mockUseProposalChartsSummary = useProposalChartsSummary as jest.Mock;

const summary: ProposalChartsSummaryResponse = {
  buckets: [
    { timestamp: 1_700_000_000_000, counts: { respond: 1, investigate: 0, configure: 4 } },
    { timestamp: 1_700_001_800_000, counts: { respond: 5, investigate: 3, configure: 2 } },
  ],
};

const setup = (
  overrides: {
    data?: ProposalChartsSummaryResponse;
    isLoading?: boolean;
    error?: unknown;
  } = {}
) => {
  // `in` rather than a default, so a case can assert on *no* cached data.
  const data = 'data' in overrides ? overrides.data : summary;

  mockUseProposalChartsSummary.mockReturnValue({
    data,
    isLoading: overrides.isLoading ?? false,
    error: overrides.error ?? null,
  });

  return render(
    <EuiProvider>
      <ProposalsTrendChartRow />
    </EuiProvider>
  );
};

describe('ProposalsTrendChartRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render one card per panel, counting the most recent bucket', () => {
    setup();

    expect(screen.getByTestId('alertZeroProposalsTrendChartCount-respond')).toHaveTextContent('5');
    expect(screen.getByTestId('alertZeroProposalsTrendChartCount-investigate')).toHaveTextContent(
      '3'
    );
    expect(screen.getByTestId('alertZeroProposalsTrendChartCount-configure')).toHaveTextContent(
      '2'
    );
  });

  it('should pass the whole window to each sparkline, oldest bucket first', () => {
    setup();

    expect(screen.getByTestId('sparkline-configure')).toHaveAttribute(
      'data-series',
      JSON.stringify([
        { x: 1_700_000_000_000, y: 4 },
        { x: 1_700_001_800_000, y: 2 },
      ])
    );
  });

  /**
   * The row no longer takes a window, so the granularity the tooltip renders
   * can only be the one the hook fetched with.
   */
  it('should render the tooltip granularity the data was fetched with', () => {
    setup();

    expect(screen.getByTestId('sparkline-respond')).toHaveAttribute('data-bucket-minutes', '30');
    expect(mockUseProposalChartsSummary).toHaveBeenCalledWith();
  });

  it('should count a category absent from the bucket as zero rather than blank', () => {
    setup({ data: { buckets: [{ timestamp: 1_700_000_000_000, counts: { respond: 2 } }] } });

    expect(screen.getByTestId('alertZeroProposalsTrendChartCount-configure')).toHaveTextContent(
      '0'
    );
  });

  it('should render skeletons instead of charts while the first fetch is in flight', () => {
    setup({ isLoading: true, data: undefined });

    expect(screen.getByTestId('alertZeroProposalsTrendChartLoading-respond')).toBeInTheDocument();
    expect(
      screen.getByTestId('alertZeroProposalsTrendChartCountLoading-respond')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('sparkline-respond')).not.toBeInTheDocument();
  });

  // The queue below is the primary surface, so a permanently broken stats query
  // hides the row rather than taking the page down with it.
  it('should hide itself when the query fails with nothing cached', () => {
    setup({ error: new Error('boom'), data: undefined });

    expect(screen.queryByTestId('alertZeroProposalsTrendChartRow')).not.toBeInTheDocument();
  });

  it('should keep the cards up when a refetch fails but data is still cached', () => {
    setup({ error: new Error('boom') });

    expect(screen.getByTestId('alertZeroProposalsTrendChartCount-respond')).toHaveTextContent('5');
  });
});
