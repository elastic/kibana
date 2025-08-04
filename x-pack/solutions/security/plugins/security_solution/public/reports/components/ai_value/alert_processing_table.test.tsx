/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { AlertsProcessingTable } from './alert_processing_table';

describe('AlertsProcessingTable', () => {
  const defaultProps = {
    totalAlerts: 1000,
    filteredAlerts: 800,
    escalatedAlerts: 200,
    filteredAlertsPerc: '80%',
    escalatedAlertsPerc: '20%',
  };

  it('renders total alerts with data-test-subj', () => {
    const { getByTestId } = render(<AlertsProcessingTable {...defaultProps} />);
    const el = getByTestId('alertsProcessingTableTotalAlerts');
    expect(el).toBeInTheDocument();
    expect(el).toHaveTextContent('1,000');
  });

  it('renders filtered alerts with data-test-subj', () => {
    const { getByTestId } = render(<AlertsProcessingTable {...defaultProps} />);
    const el = getByTestId('alertsProcessingTableFilteredAlerts');
    expect(el).toBeInTheDocument();
    expect(el).toHaveTextContent('800 (80%)');
  });

  it('renders escalated alerts with data-test-subj', () => {
    const { getByTestId } = render(<AlertsProcessingTable {...defaultProps} />);
    const el = getByTestId('alertsProcessingTableEscalatedAlerts');
    expect(el).toBeInTheDocument();
    expect(el).toHaveTextContent('200 (20%)');
  });
});
