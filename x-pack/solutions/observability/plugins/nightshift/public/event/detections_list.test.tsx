/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { LifecycleDetection, SignificantEvent } from '@kbn/significant-events-schema';
import { DetectionsList, MAX_VISIBLE_DETECTIONS } from './detections_list';
import { useFetchEventLifecycle } from '../hooks/use_fetch_event_lifecycle';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useUiSetting: () => 'MMM D, YYYY @ HH:mm:ss.SSS',
}));

jest.mock('../hooks/use_fetch_event_lifecycle');
jest.mock('../detection/change_point_visualization', () => ({
  ChangePointSparkline: ({ data }: { data: Array<{ x: number; y: number }> }) => (
    <div data-test-subj="mockDetectionSparkline" data-point-count={data.length} />
  ),
}));

jest.mock('../hooks/use_kibana', () => ({
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

const mockEvent = (overrides: Partial<SignificantEvent> = {}): SignificantEvent => ({
  '@timestamp': '2026-07-10T12:00:00Z',
  event_id: 'evt-001',
  event_uuid: 'evt-uuid-001',
  status: 'open',
  stream_names: ['logs.web-frontend'],
  title: 'Event',
  summary: 'Summary',
  severity: '60-high',
  confidence: 0.9,
  blast_radius: [
    {
      type: 'entity',
      subtype: 'service',
      feature_id: 'web-frontend',
      name: 'web-frontend',
      stream_name: 'logs.web-frontend',
    },
  ],
  ...overrides,
});

const mockDetection = (overrides: Partial<LifecycleDetection> = {}): LifecycleDetection => ({
  detection_id: 'det-1',
  rule_name: 'latency-p95-spike',
  rule_uuid: 'rule-1',
  stream_name: 'logs.web-frontend',
  change_point_type: 'spike',
  '@timestamp': '2026-07-10T12:00:00Z',
  ...overrides,
});

const NEWEST_DETECTION_TIME_MS = Date.UTC(2026, 6, 10, 12);
const ONE_HOUR_MS = 60 * 60 * 1000;

const buildDetectionsNewestFirst = (count: number): LifecycleDetection[] =>
  Array.from({ length: count }, (_, index) =>
    mockDetection({
      detection_id: `det-${index}`,
      rule_name: `detection-${index}`,
      '@timestamp': new Date(NEWEST_DETECTION_TIME_MS - index * ONE_HOUR_MS).toISOString(),
    })
  );

function setLifecycle({
  detections = [] as LifecycleDetection[],
  isLoading = false,
  isFetching = false,
  isError = false,
  refetch = jest.fn(),
} = {}) {
  mockUseFetchEventLifecycle.mockReturnValue({
    data: isLoading || isError ? undefined : { detections, events: [] },
    isLoading,
    isFetching: isLoading || isFetching,
    isError,
    refetch,
  });
  return { refetch };
}

const defaultListEvent = mockEvent();

const renderList = (props: Partial<React.ComponentProps<typeof DetectionsList>> = {}) =>
  render(
    <I18nProvider>
      <DetectionsList event={defaultListEvent} eventUuid="evt-uuid-001" {...props} />
    </I18nProvider>
  );

describe('DetectionsList', () => {
  it('shows detection skeletons while fetching for the first time', () => {
    setLifecycle({ isLoading: true, isFetching: true });
    renderList();

    expect(screen.getAllByTestId('nightshiftDetectionCardSkeleton')).toHaveLength(2);
    expect(screen.queryByTestId('nightshiftDetectionCard')).not.toBeInTheDocument();
    expect(screen.queryByText('No detections found for this event.')).not.toBeInTheDocument();
  });

  it('keeps cached detections visible while refetching', () => {
    setLifecycle({
      detections: [
        mockDetection({ detection_id: 'det-1', rule_name: 'first-detection' }),
        mockDetection({ detection_id: 'det-2', rule_name: 'second-detection' }),
      ],
      isFetching: true,
    });
    renderList();

    expect(screen.queryByTestId('nightshiftDetectionCardSkeleton')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('nightshiftDetectionCard')).toHaveLength(2);
    expect(screen.getByText('first-detection')).toBeInTheDocument();
    expect(screen.getByText('second-detection')).toBeInTheDocument();
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
    expect(screen.getAllByText('web-frontend').length).toBeGreaterThan(0);
    expect(screen.queryByText('logs.web-frontend')).not.toBeInTheDocument();
  });

  it('passes real occurrences for the detection rule to its sparkline', () => {
    setLifecycle({ detections: [mockDetection()] });
    renderList({
      occurrencesByRuleUuid: new Map([
        [
          'rule-1',
          [
            { x: new Date('2026-07-10T11:55:00.000Z').getTime(), y: 2 },
            { x: new Date('2026-07-10T12:00:00.000Z').getTime(), y: 8 },
          ],
        ],
      ]),
    });

    expect(screen.getByTestId('mockDetectionSparkline')).toHaveAttribute('data-point-count', '2');
  });

  it('shows a sparkline skeleton while occurrences load', () => {
    setLifecycle({ detections: [mockDetection()] });
    renderList({ isLoadingOccurrences: true });

    expect(screen.getByTestId('nightshiftDetectionSparklineSkeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('mockDetectionSparkline')).not.toBeInTheDocument();
  });

  it('shows at most two entity pills plus an overflow pill', () => {
    setLifecycle({ detections: [mockDetection()] });

    renderList({
      event: mockEvent({
        blast_radius: [
          {
            type: 'entity',
            subtype: 'service',
            feature_id: 'entity-one',
            name: 'entity-one',
            stream_name: 'logs.web-frontend',
          },
          {
            type: 'entity',
            subtype: 'service',
            feature_id: 'entity-two',
            name: 'entity-two',
            stream_name: 'logs.web-frontend',
          },
        ],
        causal_features: [
          {
            type: 'entity',
            subtype: 'service',
            feature_id: 'entity-three',
            name: 'entity-three',
            stream_name: 'logs.web-frontend',
          },
        ],
      }),
    });

    expect(screen.getByText('entity-one')).toBeInTheDocument();
    expect(screen.getByText('entity-two')).toBeInTheDocument();
    expect(screen.queryByText('entity-three')).not.toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();
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
    expect(card).toHaveAttribute('data-ebt-action', 'viewDetection');
    expect(card).toHaveAttribute('data-ebt-element', 'nightshiftEventFlyoutDetections');
    expect(card).toHaveAttribute('data-ebt-detail', 'spike');
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
    expect(cards[1]).toHaveAttribute('data-ebt-action', 'closeFlyout');
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
          event={defaultListEvent}
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

  describe('detection overflow', () => {
    it('renders every detection without a toggle at the cap', () => {
      setLifecycle({ detections: buildDetectionsNewestFirst(MAX_VISIBLE_DETECTIONS) });
      renderList();

      expect(screen.getAllByTestId('nightshiftDetectionCard')).toHaveLength(MAX_VISIBLE_DETECTIONS);
      expect(screen.queryByTestId('nightshiftDetectionsShowMore')).not.toBeInTheDocument();
    });

    it('caps the list and counts what it hides', () => {
      setLifecycle({ detections: buildDetectionsNewestFirst(MAX_VISIBLE_DETECTIONS + 2) });
      renderList();

      expect(screen.getAllByTestId('nightshiftDetectionCard')).toHaveLength(MAX_VISIBLE_DETECTIONS);
      expect(screen.getByTestId('nightshiftDetectionsShowMore')).toHaveTextContent('+2 more');
      expect(screen.queryByText('detection-3')).not.toBeInTheDocument();
      expect(screen.queryByText('detection-4')).not.toBeInTheDocument();
    });

    it('expands to the full list and collapses back', () => {
      setLifecycle({ detections: buildDetectionsNewestFirst(MAX_VISIBLE_DETECTIONS + 2) });
      renderList();

      fireEvent.click(screen.getByTestId('nightshiftDetectionsShowMore'));

      expect(screen.getAllByTestId('nightshiftDetectionCard')).toHaveLength(
        MAX_VISIBLE_DETECTIONS + 2
      );
      expect(screen.getByText('detection-4')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('nightshiftDetectionsShowLess'));

      expect(screen.getAllByTestId('nightshiftDetectionCard')).toHaveLength(MAX_VISIBLE_DETECTIONS);
      expect(screen.getByTestId('nightshiftDetectionsShowMore')).toHaveTextContent('+2 more');
    });

    it('reports expansion state through the toggle attributes', () => {
      setLifecycle({ detections: buildDetectionsNewestFirst(MAX_VISIBLE_DETECTIONS + 2) });
      renderList();

      const showMore = screen.getByTestId('nightshiftDetectionsShowMore');
      expect(showMore).toHaveAttribute('aria-expanded', 'false');
      expect(showMore).toHaveAttribute('data-ebt-action', 'expandDetections');
      expect(showMore).toHaveAttribute('data-ebt-element', 'nightshiftEventFlyoutDetections');
      expect(showMore.querySelector('[data-euiicon-type="chevronSingleDown"]')).toBeInTheDocument();

      fireEvent.click(showMore);

      const showLess = screen.getByTestId('nightshiftDetectionsShowLess');
      expect(showLess).toHaveAttribute('aria-expanded', 'true');
      expect(showLess).toHaveAttribute('data-ebt-action', 'collapseDetections');
      expect(showLess).toHaveAttribute('data-ebt-element', 'nightshiftEventFlyoutDetections');
      expect(showLess.querySelector('[data-euiicon-type="chevronSingleUp"]')).toBeInTheDocument();
    });

    it('takes the last visible slot for a selected detection past the cap', () => {
      setLifecycle({ detections: buildDetectionsNewestFirst(MAX_VISIBLE_DETECTIONS + 2) });
      renderList({ selectedDetectionId: 'det-4', onDetectionClick: jest.fn() });

      const cards = screen.getAllByTestId('nightshiftDetectionCard');
      expect(cards).toHaveLength(MAX_VISIBLE_DETECTIONS);
      expect(cards[MAX_VISIBLE_DETECTIONS - 1]).toHaveTextContent('detection-4');
      expect(cards[MAX_VISIBLE_DETECTIONS - 1]).toHaveAttribute('aria-pressed', 'true');
      expect(screen.queryByText('detection-2')).not.toBeInTheDocument();
      expect(screen.getByTestId('nightshiftDetectionsShowMore')).toHaveTextContent('+2 more');
    });

    it('never offers a +0 more toggle when a single overflow detection is selected', () => {
      setLifecycle({ detections: buildDetectionsNewestFirst(MAX_VISIBLE_DETECTIONS + 1) });
      renderList({ selectedDetectionId: 'det-3', onDetectionClick: jest.fn() });

      const cards = screen.getAllByTestId('nightshiftDetectionCard');
      expect(cards).toHaveLength(MAX_VISIBLE_DETECTIONS);
      expect(cards[MAX_VISIBLE_DETECTIONS - 1]).toHaveTextContent('detection-3');
      expect(screen.getByTestId('nightshiftDetectionsShowMore')).toHaveTextContent('+1 more');
    });

    it('ignores a selected detection that is no longer in the list', () => {
      setLifecycle({ detections: buildDetectionsNewestFirst(MAX_VISIBLE_DETECTIONS + 2) });
      renderList({ selectedDetectionId: 'det-already-gone', onDetectionClick: jest.fn() });

      expect(screen.getAllByTestId('nightshiftDetectionCard')).toHaveLength(MAX_VISIBLE_DETECTIONS);
      expect(screen.getByTestId('nightshiftDetectionsShowMore')).toHaveTextContent('+2 more');
    });
  });
});
