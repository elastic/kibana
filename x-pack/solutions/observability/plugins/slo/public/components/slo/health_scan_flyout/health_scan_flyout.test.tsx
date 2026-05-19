/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HealthScanFlyout } from './health_scan_flyout';
import { render } from '../../../utils/test_helper';

let mockOnSelectScanId: (scanId: string) => void;

jest.mock('./scan_history_list', () => ({
  ScanHistoryList: ({ onSelectScanId }: { onSelectScanId: (scanId: string) => void }) => {
    mockOnSelectScanId = onSelectScanId;
    return <div data-test-subj="scanHistoryList">ScanHistoryList</div>;
  },
}));

jest.mock('./scan_results_panel', () => ({
  ScanResultsPanel: ({ scanId }: { scanId: string }) => (
    <div data-test-subj="scanResultsPanel">ScanResultsPanel: {scanId}</div>
  ),
}));

describe('HealthScanFlyout', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders flyout with "Health Scans" title and ScanHistoryList by default', () => {
    render(<HealthScanFlyout onClose={mockOnClose} />);

    expect(screen.getByText('Health Scans')).toBeInTheDocument();
    expect(screen.getByTestId('scanHistoryList')).toBeInTheDocument();
    expect(screen.queryByTestId('scanResultsPanel')).not.toBeInTheDocument();
    expect(screen.queryByTestId('healthScanBackButton')).not.toBeInTheDocument();
  });

  it('calls onClose when Close button is clicked', () => {
    render(<HealthScanFlyout onClose={mockOnClose} />);

    fireEvent.click(screen.getByTestId('healthScanCloseButton'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('shows Back button and "Health Scan Results" title when a scan is selected', () => {
    render(<HealthScanFlyout onClose={mockOnClose} />);

    act(() => mockOnSelectScanId('scan-123'));

    expect(screen.getByText('Health Scan Results')).toBeInTheDocument();
    expect(screen.getByTestId('healthScanBackButton')).toBeInTheDocument();
    expect(screen.getByTestId('scanResultsPanel')).toBeInTheDocument();
    expect(screen.getByText('ScanResultsPanel: scan-123')).toBeInTheDocument();
    expect(screen.queryByTestId('scanHistoryList')).not.toBeInTheDocument();
  });

  it('clicking Back returns to the scan history list', () => {
    render(<HealthScanFlyout onClose={mockOnClose} />);

    act(() => mockOnSelectScanId('scan-123'));
    expect(screen.getByText('Health Scan Results')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('healthScanBackButton'));

    expect(screen.getByText('Health Scans')).toBeInTheDocument();
    expect(screen.getByTestId('scanHistoryList')).toBeInTheDocument();
    expect(screen.queryByTestId('scanResultsPanel')).not.toBeInTheDocument();
  });
});
