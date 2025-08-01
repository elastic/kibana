/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { LabelNodeTooltipContent } from './label_node_tooltip';
import { analyzeDocuments } from './analyze_documents';

const TEST_SUBJ_ALERT_SECTION = 'label-node-tooltip-alert-section';
const TEST_SUBJ_ALERT_ICON = 'label-node-tooltip-alert-icon';
const TEST_SUBJ_ALERT_COUNT = 'label-node-tooltip-alert-count';

const TEST_SUBJ_EVENT_SECTION = 'label-node-tooltip-event-section';
const TEST_SUBJ_EVENT_COUNT = 'label-node-tooltip-event-count';

describe('LabelNodeTooltipContent', () => {
  test('renders nothing when no events or alerts', () => {
    const analysis = analyzeDocuments([]);

    const { container } = render(<LabelNodeTooltipContent analysis={analysis} />);

    // Verify that the container is mostly empty (only has the outer div)
    expect(container.firstChild).toBeEmptyDOMElement();
  });

  test('renders with a single event', () => {
    const analysis = analyzeDocuments([{ id: 'event1', type: 'event' }]);

    render(<LabelNodeTooltipContent analysis={analysis} />);

    expect(screen.getByTestId(TEST_SUBJ_EVENT_SECTION)).toBeInTheDocument();
    expect(screen.queryByTestId(TEST_SUBJ_ALERT_SECTION)).not.toBeInTheDocument();

    expect(screen.getByTestId(TEST_SUBJ_EVENT_COUNT)).toHaveTextContent('1');
  });

  test('renders with a single alert', () => {
    const analysis = analyzeDocuments([{ id: 'alert1', type: 'alert' }]);

    render(<LabelNodeTooltipContent analysis={analysis} />);

    expect(screen.getByTestId(TEST_SUBJ_ALERT_SECTION)).toBeInTheDocument();
    expect(screen.queryByTestId(TEST_SUBJ_EVENT_SECTION)).not.toBeInTheDocument();

    // Check that the alert icon is present but NOT the count for a single event
    expect(screen.getByTestId(TEST_SUBJ_ALERT_ICON)).toBeInTheDocument();
    expect(screen.queryByTestId(TEST_SUBJ_ALERT_COUNT)).not.toBeInTheDocument();
  });

  test('renders with multiple events', () => {
    const eventCount = 120;
    const analysis = analyzeDocuments(
      Array.from({ length: eventCount }, (_, i) => ({
        id: `event${i + 1}`,
        type: 'event',
      }))
    );

    render(<LabelNodeTooltipContent analysis={analysis} />);

    expect(screen.getByTestId(TEST_SUBJ_EVENT_SECTION)).toBeInTheDocument();
    expect(screen.queryByTestId(TEST_SUBJ_ALERT_SECTION)).not.toBeInTheDocument();

    // Check that the event count badge is rendered for multiple events
    expect(screen.getByTestId(TEST_SUBJ_EVENT_COUNT)).toHaveTextContent(eventCount.toString());
  });

  test('renders with multiple alerts', () => {
    const alertCount = 120;
    const analysis = analyzeDocuments(
      Array.from({ length: alertCount }, (_, i) => ({
        id: `alert${i + 1}`,
        type: 'alert',
      }))
    );

    render(<LabelNodeTooltipContent analysis={analysis} />);

    expect(screen.getByTestId(TEST_SUBJ_ALERT_SECTION)).toBeInTheDocument();
    expect(screen.queryByTestId(TEST_SUBJ_EVENT_SECTION)).not.toBeInTheDocument();

    // Check that the alert icon and count are both present for multiple alerts
    expect(screen.getByTestId(TEST_SUBJ_ALERT_ICON)).toBeInTheDocument();
    expect(screen.getByTestId(TEST_SUBJ_ALERT_COUNT)).toHaveTextContent(alertCount.toString());
  });

  test('renders with multiple events and alerts', () => {
    const eventCount = 120;
    const alertCount = 120;

    const events = Array.from({ length: eventCount }, (_, i) => ({
      id: `event${i + 1}`,
      type: 'event' as const,
    }));

    const alerts = Array.from({ length: alertCount }, (_, i) => ({
      id: `alert${i + 1}`,
      type: 'alert' as const,
    }));

    const analysis = analyzeDocuments([...events, ...alerts]);

    render(<LabelNodeTooltipContent analysis={analysis} />);

    expect(screen.getByTestId(TEST_SUBJ_EVENT_SECTION)).toBeInTheDocument();
    expect(screen.getByTestId(TEST_SUBJ_ALERT_SECTION)).toBeInTheDocument();

    // Check that the alert icon and count are both present for multiple alerts
    expect(screen.getByTestId(TEST_SUBJ_ALERT_ICON)).toBeInTheDocument();
    expect(screen.getByTestId(TEST_SUBJ_ALERT_COUNT)).toHaveTextContent(alertCount.toString());

    // Check that the event count is present for multiple events
    expect(screen.getByTestId(TEST_SUBJ_EVENT_COUNT)).toHaveTextContent(eventCount.toString());
  });
});
