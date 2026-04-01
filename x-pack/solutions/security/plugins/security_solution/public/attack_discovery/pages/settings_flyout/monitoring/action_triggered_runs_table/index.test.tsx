/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

import { ActionTriggeredRunsTable } from '.';
import type { ActionTriggeredGeneration } from '../types';

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <IntlProvider locale="en">{children}</IntlProvider>
);

const mockItems: ActionTriggeredGeneration[] = [
  {
    connector_id: 'connector-1',
    execution_uuid: 'exec-uuid-1',
    source_metadata: {
      action_execution_uuid: 'action-1',
      rule_id: 'rule-1',
      rule_name: 'Test Rule Alpha',
    },
    status: 'succeeded',
    timestamp: '2026-03-09T12:00:00.000Z',
  },
  {
    connector_id: 'connector-2',
    execution_uuid: 'exec-uuid-2',
    source_metadata: null,
    status: 'failed',
    timestamp: '2026-03-08T10:00:00.000Z',
  },
];

const defaultProps = {
  items: mockItems,
  onPageChange: jest.fn(),
  onViewDetails: jest.fn(),
  pageIndex: 0,
  pageSize: 20,
  total: 2,
};

describe('ActionTriggeredRunsTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the table', () => {
    render(<ActionTriggeredRunsTable {...defaultProps} />, { wrapper: Wrapper });

    expect(screen.getByTestId('actionTriggeredRunsTable')).toBeInTheDocument();
  });

  it('renders a row for each item', () => {
    render(<ActionTriggeredRunsTable {...defaultProps} />, { wrapper: Wrapper });

    expect(screen.getByText('Test Rule Alpha')).toBeInTheDocument();
    expect(screen.getByText('connector-1')).toBeInTheDocument();
  });

  it('renders a dash when source_metadata is null', () => {
    render(<ActionTriggeredRunsTable {...defaultProps} />, { wrapper: Wrapper });

    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders status badges', () => {
    render(<ActionTriggeredRunsTable {...defaultProps} />, { wrapper: Wrapper });

    expect(screen.getByText('Succeeded')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('calls onViewDetails when inspect button is clicked', () => {
    render(<ActionTriggeredRunsTable {...defaultProps} />, { wrapper: Wrapper });

    fireEvent.click(screen.getByTestId('viewDetails-exec-uuid-1'));

    expect(defaultProps.onViewDetails).toHaveBeenCalledWith(mockItems[0]);
  });
});
