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
    const analysis = analyzeDocuments({ uniqueEventsCount: 1, uniqueAlertsCount: 0 });

    const { container } = render(<LabelNodeBadges analysis={analysis} />);

    expect(container.firstChild).toBe(null);
    expect(screen.queryByTestId(TEST_SUBJ_EVENT_COUNT)).not.toBeInTheDocument();
    expect(screen.queryByTestId(TEST_SUBJ_ALERT_ICON)).not.toBeInTheDocument();
    expect(screen.queryByTestId(TEST_SUBJ_ALERT_COUNT)).not.toBeInTheDocument();
  });

  test('renders alert badge with icon only for single alert', () => {
    const analysis = analyzeDocuments({ uniqueEventsCount: 0, uniqueAlertsCount: 1 });

    render(<LabelNodeBadges analysis={analysis} />);

    expect(screen.queryByTestId(TEST_SUBJ_EVENT_COUNT)).not.toBeInTheDocument();
    expect(screen.queryByTestId(TEST_SUBJ_ALERT_ICON)).toBeInTheDocument();
    expect(screen.queryByTestId(TEST_SUBJ_ALERT_COUNT)).not.toBeInTheDocument();
  });

  test('renders event badge with counter for multiple events', () => {
    const uniqueEventsCount = 3;
    const analysis = analyzeDocuments({ uniqueEventsCount, uniqueAlertsCount: 0 });

    render(<LabelNodeBadges analysis={analysis} />);

    expect(screen.getByTestId(TEST_SUBJ_EVENT_COUNT)).toHaveTextContent(
      uniqueEventsCount.toString()
    );
    expect(screen.queryByTestId(TEST_SUBJ_ALERT_ICON)).not.toBeInTheDocument();
    expect(screen.queryByTestId(TEST_SUBJ_ALERT_COUNT)).not.toBeInTheDocument();
  });

  test('renders alert badge with icon and counter for multiple alerts', () => {
    const uniqueAlertsCount = 3;
    const analysis = analyzeDocuments({ uniqueEventsCount: 0, uniqueAlertsCount });

    render(<LabelNodeBadges analysis={analysis} />);

    expect(screen.queryByTestId(TEST_SUBJ_EVENT_COUNT)).not.toBeInTheDocument();
    expect(screen.queryByTestId(TEST_SUBJ_ALERT_ICON)).toBeInTheDocument();
    expect(screen.getByTestId(TEST_SUBJ_ALERT_COUNT)).toHaveTextContent(
      uniqueAlertsCount.toString()
    );
  });

  test('renders event badge with counter and alert badge with icon and counter for one event and one alert', () => {
    const analysis = analyzeDocuments({ uniqueEventsCount: 1, uniqueAlertsCount: 1 });

    render(<LabelNodeBadges analysis={analysis} />);

    expect(screen.getByTestId(TEST_SUBJ_EVENT_COUNT)).toHaveTextContent('1');
    expect(screen.queryByTestId(TEST_SUBJ_ALERT_ICON)).toBeInTheDocument();
    expect(screen.queryByTestId(TEST_SUBJ_ALERT_COUNT)).toBeInTheDocument();
  });

  test('renders event badge with counter and alert badge with icon and counter for multiple events and alerts', () => {
    const uniqueEventsCount = 2;
    const uniqueAlertsCount = 2;
    const analysis = analyzeDocuments({ uniqueEventsCount, uniqueAlertsCount });

    render(<LabelNodeBadges analysis={analysis} />);

    expect(screen.getByTestId(TEST_SUBJ_EVENT_COUNT)).toHaveTextContent(
      uniqueEventsCount.toString()
    );
    expect(screen.queryByTestId(TEST_SUBJ_ALERT_ICON)).toBeInTheDocument();
    expect(screen.getByTestId(TEST_SUBJ_ALERT_COUNT)).toHaveTextContent(
      uniqueAlertsCount.toString()
    );
  });

  test('renders event badge with limited counter and alert badge with icon and limited counter for multiple events and alerts', () => {
    const countOverLimit = 120;
    const analysis = analyzeDocuments({
      uniqueEventsCount: countOverLimit,
      uniqueAlertsCount: countOverLimit,
    });

    render(<LabelNodeBadges analysis={analysis} />);

    expect(screen.getByTestId(TEST_SUBJ_EVENT_COUNT)).toHaveTextContent('+99');
    expect(screen.queryByTestId(TEST_SUBJ_ALERT_ICON)).toBeInTheDocument();
    expect(screen.getByTestId(TEST_SUBJ_ALERT_COUNT)).toHaveTextContent('+99');
  });
});
