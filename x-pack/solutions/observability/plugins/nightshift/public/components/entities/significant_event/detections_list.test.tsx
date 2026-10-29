/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { LifecycleDetection, SignificantEvent } from '@kbn/significant-events-schema';
import { DetectionsList, MAX_VISIBLE_DETECTIONS } from './detections_list';
import { useFetchEventLifecycle } from '../../../hooks/use_fetch_event_lifecycle';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  ...jest.requireActual('@kbn/kibana-react-plugin/public'),
  useUiSetting: () => 'MMM D, YYYY @ HH:mm:ss.SSS',
}));

jest.mock('../../../hooks/use_fetch_event_lifecycle');
jest.mock('../detection/change_point_visualization', () => ({
  ChangePointSparkline: ({ data }: { data: Array<{ x: number; y: number }> }) => (
    <div data-test-subj="mockDetectionSparkline" data-point-count={data.length} />
  ),
}));

jest.mock('../../../hooks/use_kibana', () => ({
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
  status: 'active',
  source_ids: ['logs.web-frontend'],
  title: 'Event',
  summary: 'Summary',
  severity: 'high',
  confidence: 0.9,
  blast_radius: [
    {
      type: 'entity',
      subtype: 'service',
      feature_id: 'web-frontend',
      name: 'web-frontend',
      source_id: 'logs.web-frontend',
    },
  ],
  ...overrides,
});

const mockDetection = (overrides: Partial<LifecycleDetection> = {}): LifecycleDetection => ({
  detection_id: 'det-1',
  rule_name: 'latency-p95-spike',
  rule_uuid: 'rule-1',
  source_id: 'logs.web-frontend',
  change_point_type: 'spike',
  '@timestamp': '2026-07-10T12:00:00Z',
  ...overrides,
});

const FIRST_DETECTION_TIME_MS = Date.UTC(2026, 6, 10, 12);
const ONE_HOUR_MS = 60 * 60 * 1000;

const buildDetectionsEarliestFirst = (count: number): LifecycleDetection[] =>
  Array.from({ length: count }, (_, index) =>
    mockDetection({
      detection_id: `det-${index}`,
      rule_name: `detection-${index}`,
      '@timestamp': new Date(FIRST_DETECTION_TIME_MS + index * ONE_HOUR_MS).toISOString(),
    })
  );

function setLifecycle({ detections = [] as LifecycleDetection[] } = {}) {
  mockUseFetchEventLifecycle.mockReturnValue({
    data: { detections, events: [] },
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: jest.fn(),
  });
}

const defaultListEvent = mockEvent();

const renderList = (props: Partial<React.ComponentProps<typeof DetectionsList>> = {}) =>
  render(
    <I18nProvider>
      <DetectionsList event={defaultListEvent} eventId="evt-001" {...props} />
    </I18nProvider>
  );

describe('DetectionsList', () => {
  it('sorts detections with the earliest first', () => {
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
    expect(cards[0]).toHaveTextContent('older-detection');
    expect(cards[1]).toHaveTextContent('newer-detection');
  });

  describe('detection overflow', () => {
    it('caps the list and counts what it hides', () => {
      setLifecycle({ detections: buildDetectionsEarliestFirst(MAX_VISIBLE_DETECTIONS + 2) });
      renderList();

      expect(screen.getAllByTestId('nightshiftDetectionCard')).toHaveLength(MAX_VISIBLE_DETECTIONS);
      expect(screen.getByTestId('nightshiftDetectionsShowMore')).toHaveTextContent('Show 2 more');
      expect(screen.queryByText(`detection-${MAX_VISIBLE_DETECTIONS}`)).not.toBeInTheDocument();
      expect(screen.queryByText(`detection-${MAX_VISIBLE_DETECTIONS + 1}`)).not.toBeInTheDocument();
    });

    it('takes the last visible slot for a selected detection past the cap', () => {
      setLifecycle({ detections: buildDetectionsEarliestFirst(MAX_VISIBLE_DETECTIONS + 2) });
      renderList({
        selectedDetectionId: `det-${MAX_VISIBLE_DETECTIONS + 1}`,
        onDetectionClick: jest.fn(),
      });

      const cards = screen.getAllByTestId('nightshiftDetectionCard');
      expect(cards).toHaveLength(MAX_VISIBLE_DETECTIONS);
      expect(cards[MAX_VISIBLE_DETECTIONS - 1]).toHaveTextContent(
        `detection-${MAX_VISIBLE_DETECTIONS + 1}`
      );
      expect(cards[MAX_VISIBLE_DETECTIONS - 1]).toHaveAttribute('aria-pressed', 'true');
      expect(screen.queryByText(`detection-${MAX_VISIBLE_DETECTIONS - 1}`)).not.toBeInTheDocument();
      expect(screen.getByTestId('nightshiftDetectionsShowMore')).toHaveTextContent('Show 2 more');
    });

    it('never offers a zero-more toggle when a single overflow detection is selected', () => {
      setLifecycle({ detections: buildDetectionsEarliestFirst(MAX_VISIBLE_DETECTIONS + 1) });
      renderList({
        selectedDetectionId: `det-${MAX_VISIBLE_DETECTIONS}`,
        onDetectionClick: jest.fn(),
      });

      const cards = screen.getAllByTestId('nightshiftDetectionCard');
      expect(cards).toHaveLength(MAX_VISIBLE_DETECTIONS);
      expect(cards[MAX_VISIBLE_DETECTIONS - 1]).toHaveTextContent(
        `detection-${MAX_VISIBLE_DETECTIONS}`
      );
      expect(screen.getByTestId('nightshiftDetectionsShowMore')).toHaveTextContent('Show 1 more');
    });
  });
});
