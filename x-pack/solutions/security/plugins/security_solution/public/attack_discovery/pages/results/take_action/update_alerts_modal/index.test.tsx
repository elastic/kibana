/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UpdateAlertsModal } from '.';

// Mock EUI hooks and components as needed (see history/index.test.tsx for style)
jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    useEuiTheme: () => ({ euiTheme: { size: { m: '8px', xxxl: '32px' } } }),
    useGeneratedHtmlId: jest.fn(() => 'generated-id'),
  };
});

const defaultProps = {
  alertsCount: 2,
  attackDiscoveriesCount: 3,
  onCancel: jest.fn(),
  onClose: jest.fn(),
  onConfirm: jest.fn(),
  workflowStatus: 'acknowledged' as const,
};

describe('UpdateAlertsModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the modal body with correct counts', () => {
    render(<UpdateAlertsModal {...defaultProps} />);

    expect(screen.getByTestId('modalBody')).toHaveTextContent(
      'Update 2 alerts associated with 3 attack discoveries?'
    );
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(<UpdateAlertsModal {...defaultProps} />);

    fireEvent.click(screen.getByTestId('cancel'));

    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it('calls onConfirm with updateAlerts: false when markDiscoveriesOnly is clicked', () => {
    render(<UpdateAlertsModal {...defaultProps} />);

    fireEvent.click(screen.getByTestId('markDiscoveriesOnly'));

    expect(defaultProps.onConfirm).toHaveBeenCalledWith({
      updateAlerts: false,
      workflowStatus: 'acknowledged',
    });
  });

  it('calls onConfirm with updateAlerts: true when markAlertsAndDiscoveries is clicked', () => {
    render(<UpdateAlertsModal {...defaultProps} />);

    fireEvent.click(screen.getByTestId('markAlertsAndDiscoveries'));

    expect(defaultProps.onConfirm).toHaveBeenCalledWith({
      updateAlerts: true,
      workflowStatus: 'acknowledged',
    });
  });

  it.each([
    { workflowStatus: 'open', expected: 'Mark alerts & discoveries as open' },
    { workflowStatus: 'acknowledged', expected: 'Mark alerts & discoveries as acknowledged' },
    { workflowStatus: 'closed', expected: 'Mark alerts & discoveries as closed' },
  ])(
    'renders the correct button text for workflowStatus: $workflowStatus',
    ({ workflowStatus, expected }) => {
      render(
        <UpdateAlertsModal
          {...defaultProps}
          workflowStatus={workflowStatus as 'open' | 'acknowledged' | 'closed'}
        />
      );
      expect(screen.getByTestId('markAlertsAndDiscoveries')).toHaveTextContent(expected);
    }
  );
});
