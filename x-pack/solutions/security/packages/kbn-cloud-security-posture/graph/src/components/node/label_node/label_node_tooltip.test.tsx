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
  test('renders nothing with no events or alerts', () => {
    const analysis = analyzeDocuments({ uniqueEventsCount: 0, uniqueAlertsCount: 0 });

    const { container } = render(<LabelNodeTooltipContent analysis={analysis} />);

    // Verify that the container is mostly empty (only has the outer div)
    expect(container.firstChild).toBeEmptyDOMElement();
  });

  test('renders with a single event', () => {
    const analysis = analyzeDocuments({ uniqueEventsCount: 1, uniqueAlertsCount: 0 });

    render(<LabelNodeTooltipContent analysis={analysis} />);

    expect(screen.getByTestId(TEST_SUBJ_EVENT_SECTION)).toBeInTheDocument();
    expect(screen.queryByTestId(TEST_SUBJ_ALERT_SECTION)).not.toBeInTheDocument();

    expect(screen.getByTestId(TEST_SUBJ_EVENT_COUNT)).toHaveTextContent('1');
  });

  test('renders with a single alert', () => {
    const analysis = analyzeDocuments({ uniqueEventsCount: 0, uniqueAlertsCount: 1 });

    render(<LabelNodeTooltipContent analysis={analysis} />);

    expect(screen.getByTestId(TEST_SUBJ_ALERT_SECTION)).toBeInTheDocument();
    expect(screen.queryByTestId(TEST_SUBJ_EVENT_SECTION)).not.toBeInTheDocument();

    // Check that alert icon and count are both present for a single event
    expect(screen.getByTestId(TEST_SUBJ_ALERT_ICON)).toBeInTheDocument();
    expect(screen.getByTestId(TEST_SUBJ_ALERT_COUNT)).toBeInTheDocument();
  });

  test('renders with multiple events', () => {
    const uniqueEventsCount = 120;
    const analysis = analyzeDocuments({ uniqueEventsCount, uniqueAlertsCount: 0 });

    render(<LabelNodeTooltipContent analysis={analysis} />);

    expect(screen.getByTestId(TEST_SUBJ_EVENT_SECTION)).toBeInTheDocument();
    expect(screen.queryByTestId(TEST_SUBJ_ALERT_SECTION)).not.toBeInTheDocument();

    // Check that the event count badge is rendered for multiple events
    expect(screen.getByTestId(TEST_SUBJ_EVENT_COUNT)).toHaveTextContent(
      uniqueEventsCount.toString()
    );
  });

  test('renders with multiple alerts', () => {
    const uniqueAlertsCount = 120;
    const analysis = analyzeDocuments({ uniqueEventsCount: 0, uniqueAlertsCount });

    render(<LabelNodeTooltipContent analysis={analysis} />);

    expect(screen.getByTestId(TEST_SUBJ_ALERT_SECTION)).toBeInTheDocument();
    expect(screen.queryByTestId(TEST_SUBJ_EVENT_SECTION)).not.toBeInTheDocument();

    // Check that the alert icon and count are both present for multiple alerts
    expect(screen.getByTestId(TEST_SUBJ_ALERT_ICON)).toBeInTheDocument();
    expect(screen.getByTestId(TEST_SUBJ_ALERT_COUNT)).toHaveTextContent(
      uniqueAlertsCount.toString()
    );
  });

  test('renders with multiple events and alerts', () => {
    const uniqueEventsCount = 120;
    const uniqueAlertsCount = 120;
    const analysis = analyzeDocuments({ uniqueEventsCount, uniqueAlertsCount });

    render(<LabelNodeTooltipContent analysis={analysis} />);

    expect(screen.getByTestId(TEST_SUBJ_EVENT_SECTION)).toBeInTheDocument();
    expect(screen.getByTestId(TEST_SUBJ_ALERT_SECTION)).toBeInTheDocument();

    // Check that the alert icon and count are both present for multiple alerts
    expect(screen.getByTestId(TEST_SUBJ_ALERT_ICON)).toBeInTheDocument();
    expect(screen.getByTestId(TEST_SUBJ_ALERT_COUNT)).toHaveTextContent(
      uniqueAlertsCount.toString()
    );

    // Check that the event count is present for multiple events
    expect(screen.getByTestId(TEST_SUBJ_EVENT_COUNT)).toHaveTextContent(
      uniqueEventsCount.toString()
    );
  });

  test('renders abbreviated counters with very large number of events and alerts', () => {
    const uniqueEventsCount = 1_200_000;
    const uniqueAlertsCount = 1_200_000;
    const analysis = analyzeDocuments({ uniqueEventsCount, uniqueAlertsCount });

    render(<LabelNodeTooltipContent analysis={analysis} />);

    expect(screen.getByTestId(TEST_SUBJ_EVENT_SECTION)).toBeInTheDocument();
    expect(screen.getByTestId(TEST_SUBJ_ALERT_SECTION)).toBeInTheDocument();

    // Check that the alert icon and count are both present for multiple alerts
    expect(screen.getByTestId(TEST_SUBJ_ALERT_ICON)).toBeInTheDocument();
    expect(screen.getByTestId(TEST_SUBJ_ALERT_COUNT)).toHaveTextContent('1.2m');

    // Check that the event count is present for multiple events
    expect(screen.getByTestId(TEST_SUBJ_EVENT_COUNT)).toHaveTextContent('1.2m');
  });
});
