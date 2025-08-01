/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  LabelNodeBadges,
  TEST_SUBJ_ALERT_ICON,
  TEST_SUBJ_ALERT_COUNT,
  TEST_SUBJ_EVENT_COUNT,
} from './label_node_badges';
import { analyzeDocuments } from './analyze_documents';

describe('LabelNodeBadges', () => {
  test('renders nothing for single event', () => {
    const analysis = analyzeDocuments([
      {
        id: 'event1',
        type: 'event' as const,
      },
    ]);

    const { container } = render(<LabelNodeBadges analysis={analysis} />);

    expect(container.firstChild).toBe(null);
    expect(screen.queryByTestId(TEST_SUBJ_EVENT_COUNT)).not.toBeInTheDocument();
    expect(screen.queryByTestId(TEST_SUBJ_ALERT_ICON)).not.toBeInTheDocument();
    expect(screen.queryByTestId(TEST_SUBJ_ALERT_COUNT)).not.toBeInTheDocument();
  });

  test('renders alert badge with icon only for single alert', () => {
    const analysis = analyzeDocuments([
      {
        id: 'alert1',
        type: 'alert' as const,
      },
    ]);

    render(<LabelNodeBadges analysis={analysis} />);

    expect(screen.queryByTestId(TEST_SUBJ_EVENT_COUNT)).not.toBeInTheDocument();
    expect(screen.queryByTestId(TEST_SUBJ_ALERT_ICON)).toBeInTheDocument();
    expect(screen.queryByTestId(TEST_SUBJ_ALERT_COUNT)).not.toBeInTheDocument();
  });

  test('renders event badge with counter for multiple events', () => {
    const analysis = analyzeDocuments([
      {
        id: 'event1',
        type: 'event' as const,
      },
      {
        id: 'event2',
        type: 'event' as const,
      },
      {
        id: 'event3',
        type: 'event' as const,
      },
    ]);

    render(<LabelNodeBadges analysis={analysis} />);

    expect(screen.getByTestId(TEST_SUBJ_EVENT_COUNT)).toHaveTextContent('3');
    expect(screen.queryByTestId(TEST_SUBJ_ALERT_ICON)).not.toBeInTheDocument();
    expect(screen.queryByTestId(TEST_SUBJ_ALERT_COUNT)).not.toBeInTheDocument();
  });

  test('renders alert badge with icon and counter for multiple alerts', () => {
    const analysis = analyzeDocuments([
      {
        id: 'alert1',
        type: 'alert' as const,
      },
      {
        id: 'alert2',
        type: 'alert' as const,
      },
      {
        id: 'alert3',
        type: 'alert' as const,
      },
    ]);

    render(<LabelNodeBadges analysis={analysis} />);

    expect(screen.queryByTestId(TEST_SUBJ_EVENT_COUNT)).not.toBeInTheDocument();
    expect(screen.queryByTestId(TEST_SUBJ_ALERT_ICON)).toBeInTheDocument();
    expect(screen.getByTestId(TEST_SUBJ_ALERT_COUNT)).toHaveTextContent('3');
  });

  test('renders event badge with counter and alert badge with icon only for one event and one alert', () => {
    const analysis = analyzeDocuments([
      {
        id: 'event1',
        type: 'event' as const,
      },
      {
        id: 'alert1',
        type: 'alert' as const,
      },
    ]);

    render(<LabelNodeBadges analysis={analysis} />);

    expect(screen.getByTestId(TEST_SUBJ_EVENT_COUNT)).toHaveTextContent('1');
    expect(screen.queryByTestId(TEST_SUBJ_ALERT_ICON)).toBeInTheDocument();
    expect(screen.queryByTestId(TEST_SUBJ_ALERT_COUNT)).not.toBeInTheDocument();
  });

  test('renders event badge with counter and alert badge with icon and counter for multiple events and alerts', () => {
    const analysis = analyzeDocuments([
      {
        id: 'event1',
        type: 'event' as const,
      },
      {
        id: 'event2',
        type: 'event' as const,
      },
      {
        id: 'alert1',
        type: 'alert' as const,
      },
      {
        id: 'alert2',
        type: 'alert' as const,
      },
    ]);

    render(<LabelNodeBadges analysis={analysis} />);

    expect(screen.getByTestId(TEST_SUBJ_EVENT_COUNT)).toHaveTextContent('2');
    expect(screen.queryByTestId(TEST_SUBJ_ALERT_ICON)).toBeInTheDocument();
    expect(screen.getByTestId(TEST_SUBJ_ALERT_COUNT)).toHaveTextContent('2');
  });

  test('renders event badge with limited counter and alert badge with icon and limited counter for multiple events and alerts', () => {
    const countOverLimit = 120;
    const events = Array.from({ length: countOverLimit }, (_, i) => ({
      id: `event${i}`,
      type: 'event' as const,
    }));
    const alerts = Array.from({ length: countOverLimit }, (_, i) => ({
      id: `alert${i}`,
      type: 'alert' as const,
    }));
    const analysis = analyzeDocuments([...events, ...alerts]);

    render(<LabelNodeBadges analysis={analysis} />);

    expect(screen.getByTestId(TEST_SUBJ_EVENT_COUNT)).toHaveTextContent('+99');
    expect(screen.queryByTestId(TEST_SUBJ_ALERT_ICON)).toBeInTheDocument();
    expect(screen.getByTestId(TEST_SUBJ_ALERT_COUNT)).toHaveTextContent('+99');
  });
});
