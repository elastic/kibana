/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, screen } from '@testing-library/react';
import { useKibana } from '../../../../hooks/use_kibana';
import { useFetchApmIndices } from '../../../../hooks/use_fetch_apm_indices';
import { useGetPreviewData } from '../../../../hooks/use_get_preview_data';
import { render } from '../../../../utils/test_helper';
import {
  buildApmAvailabilityIndicator,
  buildApmLatencyIndicator,
} from '../../../../data/slo/indicator';
import { buildSlo } from '../../../../data/slo/slo';
import { EventsChartPanel } from './events_chart_panel';
import { getDiscoverLink, openInDiscover } from '../../utils/discover_links/get_discover_link';
import {
  getApmTracesEsqlLink,
  navigateToApmTracesEsqlLink,
} from '../../utils/discover_links/get_apm_traces_esql_link';
import type { SloEventType } from '../../types';
import type { TimeRange } from '@kbn/es-query';

jest.mock('../../../../hooks/use_kibana');
jest.mock('../../../../hooks/use_fetch_apm_indices');
jest.mock('../../../../hooks/use_get_preview_data');
jest.mock('../../utils/discover_links/get_discover_link');
jest.mock('../../utils/discover_links/get_apm_traces_esql_link');

let capturedOnBarClick: ((timeRange: TimeRange, eventType: SloEventType) => void) | undefined;
jest.mock('./good_bad_events_chart', () => ({
  GoodBadEventsChart: (props: {
    onBarClick?: (timeRange: TimeRange, eventType: SloEventType) => void;
  }) => {
    capturedOnBarClick = props.onBarClick;
    return <div />;
  },
}));
jest.mock('./metric_timeslice_events_chart', () => ({
  MetricTimesliceEventsChart: () => <div />,
}));

const useKibanaMock = useKibana as jest.Mock;
const useFetchApmIndicesMock = useFetchApmIndices as jest.Mock;
const useGetPreviewDataMock = useGetPreviewData as jest.Mock;
const getDiscoverLinkMock = getDiscoverLink as jest.Mock;
const getApmTracesEsqlLinkMock = getApmTracesEsqlLink as jest.Mock;
const navigateToApmTracesEsqlLinkMock = navigateToApmTracesEsqlLink as jest.Mock;
const openInDiscoverMock = openInDiscover as jest.Mock;

const RANGE = { from: new Date('2024-01-01T00:00:00Z'), to: new Date('2024-01-02T00:00:00Z') };

describe('EventsChartPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useKibanaMock.mockReturnValue({ services: { discover: {}, uiSettings: {} } });
    useFetchApmIndicesMock.mockReturnValue({
      data: { transaction: 'traces-apm*,apm-*', metric: 'metrics-apm*' },
    });
    useGetPreviewDataMock.mockReturnValue({ isLoading: false, data: { results: [] } });
    getDiscoverLinkMock.mockReturnValue('discover-link');
    getApmTracesEsqlLinkMock.mockReturnValue('esql-link');
  });

  describe('View events link href', () => {
    it('uses getApmTracesEsqlLink for APM latency SLOs', () => {
      const slo = buildSlo({ indicator: buildApmLatencyIndicator() });

      render(<EventsChartPanel slo={slo} range={RANGE} />);

      expect(getApmTracesEsqlLinkMock).toHaveBeenCalled();
      expect(getDiscoverLinkMock).not.toHaveBeenCalled();
      expect(screen.getByTestId('sloDetailDiscoverLink')).toHaveAttribute('href', 'esql-link');
    });

    it('uses getApmTracesEsqlLink for APM availability SLOs', () => {
      const slo = buildSlo({ indicator: buildApmAvailabilityIndicator() });

      render(<EventsChartPanel slo={slo} range={RANGE} />);

      expect(getApmTracesEsqlLinkMock).toHaveBeenCalled();
      expect(getDiscoverLinkMock).not.toHaveBeenCalled();
      expect(screen.getByTestId('sloDetailDiscoverLink')).toHaveAttribute('href', 'esql-link');
    });

    it('uses getDiscoverLink for non-APM SLOs', () => {
      const slo = buildSlo();

      render(<EventsChartPanel slo={slo} range={RANGE} />);

      expect(getDiscoverLinkMock).toHaveBeenCalled();
      expect(getApmTracesEsqlLinkMock).not.toHaveBeenCalled();
      expect(screen.getByTestId('sloDetailDiscoverLink')).toHaveAttribute('href', 'discover-link');
    });

    it('hides the link when the href cannot be resolved', () => {
      getApmTracesEsqlLinkMock.mockReturnValue(undefined);
      const slo = buildSlo({ indicator: buildApmLatencyIndicator() });

      render(<EventsChartPanel slo={slo} range={RANGE} />);

      expect(screen.queryByTestId('sloDetailDiscoverLink')).not.toBeInTheDocument();
    });
  });

  describe('time range passed to link builders', () => {
    it('passes a relative time range when dynamicTimeRange is false', () => {
      const slo = buildSlo({ indicator: buildApmLatencyIndicator() });

      render(<EventsChartPanel slo={slo} range={RANGE} dynamicTimeRange={false} />);

      expect(getApmTracesEsqlLinkMock).toHaveBeenCalledWith(
        expect.objectContaining({
          timeRange: { from: 'now-24h', to: 'now', mode: 'relative' },
        })
      );
    });

    it('passes absolute ISO time range when dynamicTimeRange is true', () => {
      const slo = buildSlo({ indicator: buildApmLatencyIndicator() });

      render(<EventsChartPanel slo={slo} range={RANGE} dynamicTimeRange={true} />);

      expect(getApmTracesEsqlLinkMock).toHaveBeenCalledWith(
        expect.objectContaining({
          timeRange: {
            from: RANGE.from.toISOString(),
            to: RANGE.to.toISOString(),
          },
        })
      );
    });
  });

  describe('"Last 24h" label', () => {
    it('shows the label when dynamicTimeRange is false', () => {
      const slo = buildSlo();

      render(<EventsChartPanel slo={slo} range={RANGE} dynamicTimeRange={false} />);

      expect(screen.getByText('Last 24h')).toBeTruthy();
    });

    it('hides the label when dynamicTimeRange is true', () => {
      const slo = buildSlo();

      render(<EventsChartPanel slo={slo} range={RANGE} dynamicTimeRange={true} />);

      expect(screen.queryByText('Last 24h')).toBeNull();
    });
  });

  describe('bar click navigation', () => {
    const barTimeRange: TimeRange = {
      from: '2024-01-01T00:00:00.000Z',
      to: '2024-01-01T00:10:00.000Z',
      mode: 'absolute',
    };

    it('calls navigateToApmTracesEsqlLink with Good for APM SLO when Good bar is clicked', () => {
      const slo = buildSlo({ indicator: buildApmLatencyIndicator() });

      render(<EventsChartPanel slo={slo} range={RANGE} />);
      act(() => capturedOnBarClick?.(barTimeRange, 'Good'));

      expect(navigateToApmTracesEsqlLinkMock).toHaveBeenCalledWith(
        expect.objectContaining({ selectedEventType: 'Good', timeRange: barTimeRange })
      );
      expect(openInDiscoverMock).not.toHaveBeenCalled();
    });

    it('calls navigateToApmTracesEsqlLink with Bad for APM SLO when Bad bar is clicked', () => {
      const slo = buildSlo({ indicator: buildApmAvailabilityIndicator() });

      render(<EventsChartPanel slo={slo} range={RANGE} />);
      act(() => capturedOnBarClick?.(barTimeRange, 'Bad'));

      expect(navigateToApmTracesEsqlLinkMock).toHaveBeenCalledWith(
        expect.objectContaining({ selectedEventType: 'Bad', timeRange: barTimeRange })
      );
      expect(openInDiscoverMock).not.toHaveBeenCalled();
    });

    it('calls openInDiscover with showGood=true for non-APM SLO when Good bar is clicked', () => {
      const slo = buildSlo();

      render(<EventsChartPanel slo={slo} range={RANGE} />);
      act(() => capturedOnBarClick?.(barTimeRange, 'Good'));

      expect(openInDiscoverMock).toHaveBeenCalledWith(
        expect.objectContaining({ showGood: true, showBad: false, timeRange: barTimeRange })
      );
      expect(navigateToApmTracesEsqlLinkMock).not.toHaveBeenCalled();
    });

    it('calls openInDiscover with showBad=true for non-APM SLO when Bad bar is clicked', () => {
      const slo = buildSlo();

      render(<EventsChartPanel slo={slo} range={RANGE} />);
      act(() => capturedOnBarClick?.(barTimeRange, 'Bad'));

      expect(openInDiscoverMock).toHaveBeenCalledWith(
        expect.objectContaining({ showGood: false, showBad: true, timeRange: barTimeRange })
      );
      expect(navigateToApmTracesEsqlLinkMock).not.toHaveBeenCalled();
    });
  });
});
