/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { render } from '../../../../utils/test_helper';
import { SloDiscoverForm } from './slo_discover_form';
import { useDiscoverSlos } from '../../../../hooks/use_discover_slos';
import { useBulkCreateSlos } from '../../../../hooks/use_bulk_create_slos';
import { useKibana } from '../../../../hooks/use_kibana';
import { kibanaStartMock } from '../../../../utils/kibana_react.mock';

jest.mock('../../../../hooks/use_discover_slos');
jest.mock('../../../../hooks/use_bulk_create_slos');

const mockUseKibanaReturnValue = kibanaStartMock.startContract();

jest.mock('../../../../hooks/use_kibana', () => ({
  useKibana: jest.fn(() => mockUseKibanaReturnValue),
}));

const useKibanaMock = useKibana as jest.Mock;
const useDiscoverSlosMock = useDiscoverSlos as jest.Mock;
const useBulkCreateSlosMock = useBulkCreateSlos as jest.Mock;

const mockNavigate = jest.fn();

const mockProposals = [
  {
    sloDefinition: {
      name: 'API Availability',
      description: 'Tracks API error rate',
      indicator: {
        type: 'sli.apm.transactionErrorRate',
        params: { service: 'api-gateway', environment: 'production', index: 'metrics-apm*' },
      },
      timeWindow: { duration: '30d', type: 'rolling' },
      budgetingMethod: 'occurrences',
      objective: { target: 0.995 },
      tags: ['auto-discovered'],
    },
    rationale: 'Critical user-facing service',
    category: 'availability',
    priority: 'critical',
  },
  {
    sloDefinition: {
      name: 'Checkout Latency',
      description: 'P99 checkout latency',
      indicator: {
        type: 'sli.apm.transactionDuration',
        params: {
          service: 'checkout',
          environment: 'production',
          index: 'metrics-apm*',
          threshold: 500,
        },
      },
      timeWindow: { duration: '30d', type: 'rolling' },
      budgetingMethod: 'occurrences',
      objective: { target: 0.99 },
      tags: ['auto-discovered'],
    },
    rationale: 'High-traffic checkout flow',
    category: 'latency',
    priority: 'high',
  },
  {
    sloDefinition: {
      name: 'Log Error Rate',
      description: 'Log-based error rate',
      indicator: {
        type: 'sli.kql.custom',
        params: {
          index: 'logs-*',
          good: 'NOT log.level: error',
          total: '*',
          timestampField: '@timestamp',
        },
      },
      timeWindow: { duration: '7d', type: 'rolling' },
      budgetingMethod: 'occurrences',
      objective: { target: 0.95 },
      tags: ['auto-discovered'],
    },
    rationale: 'General log health',
    category: 'correctness',
    priority: 'medium',
  },
];

describe('SloDiscoverForm', () => {
  const mockMutate = jest.fn();
  const mockBulkCreate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    useKibanaMock.mockReturnValue({
      services: {
        ...mockUseKibanaReturnValue.services,
        application: {
          navigateToUrl: mockNavigate,
        },
        http: {
          basePath: {
            prepend: (path: string) => path,
          },
        },
      },
    });

    useDiscoverSlosMock.mockReturnValue({
      mutate: mockMutate,
      isLoading: false,
    });

    useBulkCreateSlosMock.mockReturnValue({
      mutate: mockBulkCreate,
      isLoading: false,
      batchProgress: null,
      abort: jest.fn(),
    });
  });

  it('renders the initial empty prompt', () => {
    render(<SloDiscoverForm />);

    expect(screen.getByTestId('sloDiscoverForm')).toBeTruthy();
    expect(screen.getByTestId('sloDiscoverButton')).toBeTruthy();
    expect(screen.getByText('Auto-discover SLOs from your data')).toBeTruthy();
  });

  it('calls discover mutation when scan button is clicked', () => {
    render(<SloDiscoverForm />);

    fireEvent.click(screen.getByTestId('sloDiscoverButton'));
    expect(mockMutate).toHaveBeenCalledWith({}, expect.any(Object));
  });

  it('shows loading state during discovery', () => {
    useDiscoverSlosMock.mockReturnValue({
      mutate: mockMutate,
      isLoading: true,
    });

    render(<SloDiscoverForm />);

    expect(screen.getByText(/Scanning your cluster/)).toBeTruthy();
  });

  it('renders discovered proposals after successful scan', () => {
    mockMutate.mockImplementation((_input: unknown, options: { onSuccess: Function }) => {
      options.onSuccess({
        proposedSlos: mockProposals,
        summary: 'Found 3 data sources suitable for SLOs',
        clusterSummary: '',
      });
    });

    render(<SloDiscoverForm />);
    fireEvent.click(screen.getByTestId('sloDiscoverButton'));

    expect(screen.getByText('API Availability')).toBeTruthy();
    expect(screen.getByText('Checkout Latency')).toBeTruthy();
    expect(screen.getByText('Log Error Rate')).toBeTruthy();
  });

  it('auto-selects critical and high priority proposals', () => {
    mockMutate.mockImplementation((_input: unknown, options: { onSuccess: Function }) => {
      options.onSuccess({
        proposedSlos: mockProposals,
        summary: 'Found 3 SLOs',
        clusterSummary: '',
      });
    });

    render(<SloDiscoverForm />);
    fireEvent.click(screen.getByTestId('sloDiscoverButton'));

    expect(screen.getByText('2 of 3 selected')).toBeTruthy();
  });

  it('shows no proposals callout when cluster has no data', () => {
    mockMutate.mockImplementation((_input: unknown, options: { onSuccess: Function }) => {
      options.onSuccess({
        proposedSlos: [],
        summary: 'No data sources found',
        clusterSummary: '',
      });
    });

    render(<SloDiscoverForm />);
    fireEvent.click(screen.getByTestId('sloDiscoverButton'));

    expect(screen.getByText('No SLOs discovered')).toBeTruthy();
  });

  it('renders select all and deselect all buttons', () => {
    mockMutate.mockImplementation((_input: unknown, options: { onSuccess: Function }) => {
      options.onSuccess({
        proposedSlos: mockProposals,
        summary: 'Found 3 SLOs',
        clusterSummary: '',
      });
    });

    render(<SloDiscoverForm />);
    fireEvent.click(screen.getByTestId('sloDiscoverButton'));

    expect(screen.getByTestId('sloDiscoverSelectAll')).toBeTruthy();
    expect(screen.getByTestId('sloDiscoverDeselectAll')).toBeTruthy();
  });

  it('selects all proposals when select all is clicked', () => {
    mockMutate.mockImplementation((_input: unknown, options: { onSuccess: Function }) => {
      options.onSuccess({
        proposedSlos: mockProposals,
        summary: 'Found 3 SLOs',
        clusterSummary: '',
      });
    });

    render(<SloDiscoverForm />);
    fireEvent.click(screen.getByTestId('sloDiscoverButton'));

    fireEvent.click(screen.getByTestId('sloDiscoverSelectAll'));
    expect(screen.getByText('3 of 3 selected')).toBeTruthy();
  });

  it('deselects all proposals when deselect all is clicked', () => {
    mockMutate.mockImplementation((_input: unknown, options: { onSuccess: Function }) => {
      options.onSuccess({
        proposedSlos: mockProposals,
        summary: 'Found 3 SLOs',
        clusterSummary: '',
      });
    });

    render(<SloDiscoverForm />);
    fireEvent.click(screen.getByTestId('sloDiscoverButton'));

    fireEvent.click(screen.getByTestId('sloDiscoverDeselectAll'));
    expect(screen.getByText('0 of 3 selected')).toBeTruthy();
  });

  it('disables create button when no proposals are selected', () => {
    mockMutate.mockImplementation((_input: unknown, options: { onSuccess: Function }) => {
      options.onSuccess({
        proposedSlos: mockProposals,
        summary: 'Found 3 SLOs',
        clusterSummary: '',
      });
    });

    render(<SloDiscoverForm />);
    fireEvent.click(screen.getByTestId('sloDiscoverButton'));

    fireEvent.click(screen.getByTestId('sloDiscoverDeselectAll'));

    const createButton = screen.getByTestId('sloDiscoverCreateButton');
    expect(createButton.hasAttribute('disabled')).toBe(true);
  });

  it('calls bulk create with selected proposals when create button is clicked', () => {
    mockMutate.mockImplementation((_input: unknown, options: { onSuccess: Function }) => {
      options.onSuccess({
        proposedSlos: mockProposals,
        summary: 'Found 3 SLOs',
        clusterSummary: '',
      });
    });

    render(<SloDiscoverForm />);
    fireEvent.click(screen.getByTestId('sloDiscoverButton'));

    fireEvent.click(screen.getByTestId('sloDiscoverSelectAll'));
    fireEvent.click(screen.getByTestId('sloDiscoverCreateButton'));

    expect(mockBulkCreate).toHaveBeenCalledWith(
      { slos: expect.any(Array) },
      expect.any(Object)
    );

    const { slos } = mockBulkCreate.mock.calls[0][0];
    expect(slos).toHaveLength(3);
  });

  it('renders rescan button after discovery', () => {
    mockMutate.mockImplementation((_input: unknown, options: { onSuccess: Function }) => {
      options.onSuccess({
        proposedSlos: mockProposals,
        summary: 'Found 3 SLOs',
        clusterSummary: '',
      });
    });

    render(<SloDiscoverForm />);
    fireEvent.click(screen.getByTestId('sloDiscoverButton'));

    expect(screen.getByTestId('sloDiscoverRescanButton')).toBeTruthy();
  });

  it('renders batch progress when creating', () => {
    mockMutate.mockImplementation((_input: unknown, options: { onSuccess: Function }) => {
      options.onSuccess({
        proposedSlos: mockProposals,
        summary: 'Found 3 SLOs',
        clusterSummary: '',
      });
    });

    useBulkCreateSlosMock.mockReturnValue({
      mutate: mockBulkCreate,
      isLoading: true,
      batchProgress: {
        currentBatch: 1,
        totalBatches: 2,
        completedSlos: 0,
        totalSlos: 3,
        successCount: 0,
        failureCount: 0,
      },
      abort: jest.fn(),
    });

    render(<SloDiscoverForm />);
    fireEvent.click(screen.getByTestId('sloDiscoverButton'));

    expect(screen.getByText('Creating batch 1 of 2...')).toBeTruthy();
    expect(screen.getByText('0 of 3 SLOs processed')).toBeTruthy();
  });

  it('renders abort button during batch creation', () => {
    useBulkCreateSlosMock.mockReturnValue({
      mutate: mockBulkCreate,
      isLoading: true,
      batchProgress: {
        currentBatch: 1,
        totalBatches: 2,
        completedSlos: 0,
        totalSlos: 3,
        successCount: 0,
        failureCount: 0,
      },
      abort: jest.fn(),
    });

    mockMutate.mockImplementation((_input: unknown, options: { onSuccess: Function }) => {
      options.onSuccess({
        proposedSlos: mockProposals,
        summary: 'Found 3 SLOs',
        clusterSummary: '',
      });
    });

    render(<SloDiscoverForm />);
    fireEvent.click(screen.getByTestId('sloDiscoverButton'));

    expect(screen.getByTestId('sloDiscoverAbortButton')).toBeTruthy();
  });

  it('displays priority stats after discovery', () => {
    mockMutate.mockImplementation((_input: unknown, options: { onSuccess: Function }) => {
      options.onSuccess({
        proposedSlos: mockProposals,
        summary: 'Found 3 SLOs',
        clusterSummary: '',
      });
    });

    render(<SloDiscoverForm />);
    fireEvent.click(screen.getByTestId('sloDiscoverButton'));

    expect(screen.getByText('Discovered 3 SLOs')).toBeTruthy();
  });
});
