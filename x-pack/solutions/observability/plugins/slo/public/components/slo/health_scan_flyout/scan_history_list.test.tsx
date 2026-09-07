/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { HealthScanSummary } from '@kbn/slo-schema';
import { ScanHistoryList } from './scan_history_list';
import { useListHealthScans } from '../../../hooks/use_list_health_scans';
import { useScheduleHealthScan } from '../../../hooks/use_schedule_health_scan';
import { useKibana } from '../../../hooks/use_kibana';
import { render } from '../../../utils/test_helper';

jest.mock('../../../hooks/use_list_health_scans');
jest.mock('../../../hooks/use_schedule_health_scan');
jest.mock('../../../hooks/use_kibana');

const mockUseListHealthScans = useListHealthScans as jest.MockedFunction<typeof useListHealthScans>;
const mockUseScheduleHealthScan = useScheduleHealthScan as jest.MockedFunction<
  typeof useScheduleHealthScan
>;
const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

const mockScheduleHealthScan = jest.fn();

const mockScan: HealthScanSummary = {
  scanId: 'scan-abc',
  latestTimestamp: '2026-02-27T10:00:00.000Z',
  total: 15,
  problematic: 3,
  status: 'completed',
};

describe('ScanHistoryList', () => {
  const mockOnSelectScanId = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseKibana.mockReturnValue({
      services: {
        uiSettings: { get: jest.fn().mockReturnValue('MMM D, YYYY @ HH:mm:ss.SSS') },
        notifications: { toasts: { addSuccess: jest.fn(), addError: jest.fn() } },
      },
    } as any);

    mockUseListHealthScans.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    });

    mockUseScheduleHealthScan.mockReturnValue({
      mutate: mockScheduleHealthScan,
      isLoading: false,
    } as any);
  });

  it('shows loading spinner when loading with no data', () => {
    mockUseListHealthScans.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    render(<ScanHistoryList onSelectScanId={mockOnSelectScanId} />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows empty prompt when no scans exist', () => {
    mockUseListHealthScans.mockReturnValue({
      data: { scans: [] },
      isLoading: false,
      isError: false,
    });

    render(<ScanHistoryList onSelectScanId={mockOnSelectScanId} />);

    expect(screen.getByText('No scans yet')).toBeInTheDocument();
    expect(
      screen.getByText('Run a health scan to check all your SLOs for operational issues.')
    ).toBeInTheDocument();
  });

  it('renders scan history table with scan data', () => {
    mockUseListHealthScans.mockReturnValue({
      data: { scans: [mockScan] },
      isLoading: false,
      isError: false,
    });

    render(<ScanHistoryList onSelectScanId={mockOnSelectScanId} />);

    expect(screen.getByTestId('healthScanHistoryTable')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('completed')).toBeInTheDocument();
  });

  it('calls scheduleHealthScan with force when Run Scan button is clicked', () => {
    mockUseListHealthScans.mockReturnValue({
      data: { scans: [] },
      isLoading: false,
      isError: false,
    });

    render(<ScanHistoryList onSelectScanId={mockOnSelectScanId} />);

    fireEvent.click(screen.getByTestId('healthScanRunButton'));

    expect(mockScheduleHealthScan).toHaveBeenCalledWith({ force: true });
  });

  it('calls onSelectScanId when view results action is clicked', () => {
    mockUseListHealthScans.mockReturnValue({
      data: { scans: [mockScan] },
      isLoading: false,
      isError: false,
    });

    render(<ScanHistoryList onSelectScanId={mockOnSelectScanId} />);

    fireEvent.click(screen.getByTestId('healthScanViewResults-scan-abc'));

    expect(mockOnSelectScanId).toHaveBeenCalledWith('scan-abc');
  });
});
