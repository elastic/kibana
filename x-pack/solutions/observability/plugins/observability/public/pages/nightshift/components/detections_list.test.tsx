/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { LifecycleDetection } from '@kbn/significant-events-schema';
import { DetectionsList } from './detections_list';
import { useFetchEventLifecycle } from '../hooks/use_fetch_event_lifecycle';

jest.mock('../hooks/use_fetch_event_lifecycle');

jest.mock('../../../utils/kibana_react', () => ({
  useKibana: () => ({
    services: {
      http: { basePath: { prepend: (path: string) => `/base${path}` } },
      charts: {
        theme: {
          useChartsBaseTheme: () => ({}),
          useSparklineOverrides: () => ({}),
        },
      },
    },
  }),
}));

const mockUseFetchEventLifecycle = useFetchEventLifecycle as jest.Mock;

const mockDetection = (overrides: Partial<LifecycleDetection> = {}): LifecycleDetection => ({
  detection_id: 'det-1',
  rule_name: 'latency-p95-spike',
  stream_name: 'logs.web-frontend',
  change_point_type: 'spike',
  '@timestamp': '2026-07-10T12:00:00Z',
  ...overrides,
});

function setLifecycle({
  detections = [] as LifecycleDetection[],
  isLoading = false,
  isError = false,
  refetch = jest.fn(),
} = {}) {
  mockUseFetchEventLifecycle.mockReturnValue({
    data: isLoading || isError ? undefined : { detections, discoveries: [], events: [] },
    isLoading,
    isError,
    refetch,
  });
  return { refetch };
}

const renderList = (props: Partial<React.ComponentProps<typeof DetectionsList>> = {}) =>
  render(
    <I18nProvider>
      <DetectionsList eventUuid="evt-uuid-001" {...props} />
    </I18nProvider>
  );

describe('DetectionsList', () => {
  it('shows a loading spinner while fetching', () => {
    setLifecycle({ isLoading: true });
    const { container } = renderList();

    expect(container.querySelector('.euiLoadingSpinner')).toBeInTheDocument();
    expect(screen.queryByText('No detections found for this event.')).not.toBeInTheDocument();
  });

  it('shows the empty state when there are no detections', () => {
    setLifecycle({ detections: [] });
    renderList();

    expect(screen.getByText('No detections found for this event.')).toBeInTheDocument();
  });

  it('shows an error state with a retry action instead of the empty state', () => {
    const { refetch } = setLifecycle({ isError: true });
    renderList();

    expect(screen.getByText('Unable to load detections')).toBeInTheDocument();
    expect(screen.queryByText('No detections found for this event.')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('nightshiftDetectionsRetryButton'));
    expect(refetch).toHaveBeenCalled();
  });

  it('renders detection cards with translated change-point labels', () => {
    setLifecycle({
      detections: [
        mockDetection(),
        mockDetection({
          detection_id: 'det-2',
          rule_name: 'error-rate-trend',
          change_point_type: 'trend_change',
          '@timestamp': '2026-07-09T12:00:00Z',
        }),
      ],
    });
    renderList();

    expect(screen.getByText('latency-p95-spike')).toBeInTheDocument();
    expect(screen.getByText('Spike')).toBeInTheDocument();
    expect(screen.getByText('Trend change')).toBeInTheDocument();
  });

  it('sorts detections with the most recent first', () => {
    setLifecycle({
      detections: [
        mockDetection({
          detection_id: 'det-old',
          rule_name: 'older-detection',
          '@timestamp': '2026-07-01T12:00:00Z',
        }),
        mockDetection({
          detection_id: 'det-new',
          rule_name: 'newer-detection',
          '@timestamp': '2026-07-10T12:00:00Z',
        }),
      ],
    });
    renderList();

    const cards = screen.getAllByTestId('nightshiftDetectionCard');
    expect(cards[0]).toHaveTextContent('newer-detection');
    expect(cards[1]).toHaveTextContent('older-detection');
  });

  it('renders the whole detection card as a clickable element', () => {
    setLifecycle({ detections: [mockDetection()] });
    renderList({ onDetectionClick: jest.fn() });

    const card = screen.getByTestId('nightshiftDetectionCard');
    expect(card).toHaveAttribute('role', 'button');
    expect(card).toHaveAttribute('tabindex', '0');
  });

  it('renders the rule name as plain text, not a link', () => {
    setLifecycle({ detections: [mockDetection()] });
    renderList();

    const title = screen.getByText('latency-p95-spike');
    expect(title.closest('a')).toBeNull();
  });

  it('calls onDetectionClick with the detection when a card is clicked', () => {
    const detection = mockDetection();
    const onDetectionClick = jest.fn();
    setLifecycle({ detections: [detection] });
    renderList({ onDetectionClick });

    fireEvent.click(screen.getByTestId('nightshiftDetectionCard'));
    expect(onDetectionClick).toHaveBeenCalledWith(detection);
  });

  it('marks the selected detection card with aria-pressed', () => {
    setLifecycle({
      detections: [
        mockDetection({ detection_id: 'det-1', rule_name: 'first-detection' }),
        mockDetection({ detection_id: 'det-2', rule_name: 'second-detection' }),
      ],
    });
    renderList({ selectedDetectionId: 'det-2', onDetectionClick: jest.fn() });

    const cards = screen.getAllByTestId('nightshiftDetectionCard');
    expect(cards[0]).toHaveAttribute('aria-pressed', 'false');
    expect(cards[1]).toHaveAttribute('aria-pressed', 'true');
  });

  it('only marks the clicked detection as selected when switching detections', () => {
    setLifecycle({
      detections: [
        mockDetection({ detection_id: 'det-1', rule_name: 'first-detection' }),
        mockDetection({ detection_id: 'det-2', rule_name: 'second-detection' }),
      ],
    });

    function DetectionListHarness() {
      const [selectedDetectionId, setSelectedDetectionId] = React.useState<string>();
      return (
        <DetectionsList
          eventUuid="evt-uuid-001"
          selectedDetectionId={selectedDetectionId}
          onDetectionClick={(detection) => setSelectedDetectionId(detection.detection_id)}
        />
      );
    }

    render(
      <I18nProvider>
        <DetectionListHarness />
      </I18nProvider>
    );

    const cards = screen.getAllByTestId('nightshiftDetectionCard');
    fireEvent.click(cards[0]);
    expect(cards[0]).toHaveAttribute('aria-pressed', 'true');
    expect(cards[1]).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(cards[1]);
    expect(cards[0]).toHaveAttribute('aria-pressed', 'false');
    expect(cards[1]).toHaveAttribute('aria-pressed', 'true');
  });
});
