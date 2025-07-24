/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { LabelNodeBadges } from './label_node_badges';
import type { DocumentAnalysis } from './analyze_documents';

describe('LabelNodeBadges', () => {
  test('renders nothing for single event', () => {
    const analysis: DocumentAnalysis = {
      totalEvents: 1,
      totalAlerts: 0,
      totalDocuments: 1,
      isSingleEvent: true,
      isSingleAlert: false,
      isGroupOfEvents: false,
      isGroupOfAlerts: false,
      isGroupOfEventsAndAlerts: false,
      eventDocuments: [{ id: 'event1', type: 'event' }],
      alertDocuments: [],
    };

    const { container } = render(<LabelNodeBadges analysis={analysis} />);
    expect(container.firstChild).toBe(null);
  });

  test('renders warning icon for single alert', () => {
    const analysis: DocumentAnalysis = {
      totalEvents: 0,
      totalAlerts: 1,
      totalDocuments: 1,
      isSingleEvent: false,
      isSingleAlert: true,
      isGroupOfEvents: false,
      isGroupOfAlerts: false,
      isGroupOfEventsAndAlerts: false,
      eventDocuments: [],
      alertDocuments: [{ id: 'alert1', type: 'alert' }],
    };

    render(<LabelNodeBadges analysis={analysis} />);
    expect(screen.getByTestId('euiIcon')).toBeInTheDocument();
  });

  test('renders counter badge for group of events', () => {
    const analysis: DocumentAnalysis = {
      totalEvents: 3,
      totalAlerts: 0,
      totalDocuments: 3,
      isSingleEvent: false,
      isSingleAlert: false,
      isGroupOfEvents: true,
      isGroupOfAlerts: false,
      isGroupOfEventsAndAlerts: false,
      eventDocuments: [
        { id: 'event1', type: 'event' },
        { id: 'event2', type: 'event' },
        { id: 'event3', type: 'event' },
      ],
      alertDocuments: [],
    };

    render(<LabelNodeBadges analysis={analysis} />);
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  test('renders warning icon with counter for group of alerts', () => {
    const analysis: DocumentAnalysis = {
      totalEvents: 0,
      totalAlerts: 3,
      totalDocuments: 3,
      isSingleEvent: false,
      isSingleAlert: false,
      isGroupOfEvents: false,
      isGroupOfAlerts: true,
      isGroupOfEventsAndAlerts: false,
      eventDocuments: [],
      alertDocuments: [
        { id: 'alert1', type: 'alert' },
        { id: 'alert2', type: 'alert' },
        { id: 'alert3', type: 'alert' },
      ],
    };

    render(<LabelNodeBadges analysis={analysis} />);
    expect(screen.getByTestId('euiIcon')).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  test('renders both badges for group of events and alerts', () => {
    const analysis: DocumentAnalysis = {
      totalEvents: 2,
      totalAlerts: 2,
      totalDocuments: 4,
      isSingleEvent: false,
      isSingleAlert: false,
      isGroupOfEvents: false,
      isGroupOfAlerts: false,
      isGroupOfEventsAndAlerts: true,
      eventDocuments: [
        { id: 'event1', type: 'event' },
        { id: 'event2', type: 'event' },
      ],
      alertDocuments: [
        { id: 'alert1', type: 'alert' },
        { id: 'alert2', type: 'alert' },
      ],
    };

    render(<LabelNodeBadges analysis={analysis} />);
    expect(screen.getByTestId('euiIcon')).toBeInTheDocument();
    expect(screen.getAllByText('+1')).toHaveLength(2);
  });
});