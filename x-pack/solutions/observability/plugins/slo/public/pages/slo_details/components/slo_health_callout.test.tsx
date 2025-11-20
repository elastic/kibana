/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, fireEvent, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { I18nProvider } from '@kbn/i18n-react';
import { SloHealthCallout } from './slo_health_callout';
import { useFetchSloHealth } from '../../../hooks/use_fetch_slo_health';
import { useActionModal } from '../../../context/action_modal';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';

jest.mock('../../../hooks/use_fetch_slo_health');
jest.mock('../../../context/action_modal');
jest.mock('@kbn/kibana-react-plugin/public');

const mockUseFetchSloHealth = useFetchSloHealth as jest.MockedFunction<typeof useFetchSloHealth>;
const mockUseActionModal = useActionModal as jest.MockedFunction<typeof useActionModal>;
const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

const mockSlo: SLOWithSummaryResponse = {
  id: 'test-slo-id',
  name: 'Test SLO',
  revision: 1,
  budgetingMethod: 'occurrences',
  objective: { target: 0.99 },
  timeWindow: { duration: '30d', type: 'rolling' },
  indicator: {
    type: 'sli.kql.custom',
    params: {
      index: 'test-index',
      good: 'status: 200',
      total: '*',
    },
  },
  summary: {
    sliValue: 0.95,
    errorBudget: {
      initial: 0.01,
      consumed: 0.5,
      remaining: 0.5,
    },
    status: 'HEALTHY',
  },
} as SLOWithSummaryResponse;

const mockTriggerAction = jest.fn();
const mockCreateUrl = jest.fn().mockReturnValue('#/management/data/transform/slo-test-slo-id-1');

describe('SloHealthCallout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseActionModal.mockReturnValue({
      triggerAction: mockTriggerAction,
    } as any);
    mockUseKibana.mockReturnValue({
      services: {
        share: {
          url: {
            locators: {
              get: () => ({
                getRedirectUrl: mockCreateUrl,
              }),
            },
          },
        },
      },
    } as any);
  });

  const renderComponent = (slo = mockSlo) => {
    return render(
      <I18nProvider>
        <SloHealthCallout slo={slo} />
      </I18nProvider>
    );
  };

  it('should not render when SLO health is loading', () => {
    mockUseFetchSloHealth.mockReturnValue({
      isLoading: true,
      isError: false,
      data: undefined,
    });

    const { container } = renderComponent();
    expect(container.firstChild).toBeNull();
  });

  it('should not render when SLO health has error', () => {
    mockUseFetchSloHealth.mockReturnValue({
      isLoading: false,
      isError: true,
      data: undefined,
    });

    const { container } = renderComponent();
    expect(container.firstChild).toBeNull();
  });

  it('should not render when SLO health is healthy', () => {
    mockUseFetchSloHealth.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [
        {
          sloId: 'test-slo-id',
          sloRevision: 1,
          sloName: 'Test SLO',
          health: {
            overall: 'healthy',
            rollup: {
              status: 'healthy',
              transformState: 'started',
            },
            summary: {
              status: 'healthy',
              transformState: 'started',
            },
          },
          state: 'running',
        },
      ],
    });

    const { container } = renderComponent();
    expect(container.firstChild).toBeNull();
  });

  it('should render callout with unhealthy rollup transform', () => {
    mockUseFetchSloHealth.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [
        {
          sloId: 'test-slo-id',
          sloRevision: 1,
          sloName: 'Test SLO',
          health: {
            overall: 'unhealthy',
            rollup: {
              status: 'unhealthy',
              transformState: 'started',
            },
            summary: {
              status: 'healthy',
              transformState: 'started',
            },
          },
          state: 'running',
        },
      ],
    });

    renderComponent();

    expect(screen.getByText('This SLO has issues with its transforms')).toBeInTheDocument();
    expect(screen.getByText(/slo-test-slo-id-1 \(unhealthy\)/)).toBeInTheDocument();
    expect(screen.getByText('Inspect')).toBeInTheDocument();
  });

  it('should render callout with missing rollup transform', () => {
    mockUseFetchSloHealth.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [
        {
          sloId: 'test-slo-id',
          sloRevision: 1,
          sloName: 'Test SLO',
          health: {
            overall: 'unhealthy',
            rollup: {
              status: 'missing',
            },
            summary: {
              status: 'healthy',
              transformState: 'started',
            },
          },
          state: 'running',
        },
      ],
    });

    renderComponent();

    expect(screen.getByText('This SLO has issues with its transforms')).toBeInTheDocument();
    expect(screen.getByText(/slo-test-slo-id-1 \(missing\)/)).toBeInTheDocument();
    expect(screen.getByText('Reset')).toBeInTheDocument();
  });

  it('should render callout with unhealthy summary transform', () => {
    mockUseFetchSloHealth.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [
        {
          sloId: 'test-slo-id',
          sloRevision: 1,
          sloName: 'Test SLO',
          health: {
            overall: 'unhealthy',
            rollup: {
              status: 'healthy',
              transformState: 'started',
            },
            summary: {
              status: 'unhealthy',
              transformState: 'started',
            },
          },
          state: 'running',
        },
      ],
    });

    renderComponent();

    expect(screen.getByText('This SLO has issues with its transforms')).toBeInTheDocument();
    expect(screen.getByText(/slo-summary-test-slo-id-1 \(unhealthy\)/)).toBeInTheDocument();
    expect(screen.getByText('Inspect')).toBeInTheDocument();
  });

  it('should render callout with missing summary transform', () => {
    mockUseFetchSloHealth.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [
        {
          sloId: 'test-slo-id',
          sloRevision: 1,
          sloName: 'Test SLO',
          health: {
            overall: 'unhealthy',
            rollup: {
              status: 'healthy',
              transformState: 'started',
            },
            summary: {
              status: 'missing',
            },
          },
          state: 'running',
        },
      ],
    });

    renderComponent();

    expect(screen.getByText('This SLO has issues with its transforms')).toBeInTheDocument();
    expect(screen.getByText(/slo-summary-test-slo-id-1 \(missing\)/)).toBeInTheDocument();
    expect(screen.getByText('Reset')).toBeInTheDocument();
  });

  it('should render callout with both unhealthy and missing transforms - rollup unhealthy, summary missing', () => {
    mockUseFetchSloHealth.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [
        {
          sloId: 'test-slo-id',
          sloRevision: 1,
          sloName: 'Test SLO',
          health: {
            overall: 'unhealthy',
            rollup: {
              status: 'unhealthy',
              transformState: 'started',
            },
            summary: {
              status: 'missing',
            },
          },
          state: 'running',
        },
      ],
    });

    renderComponent();

    expect(screen.getByText('This SLO has issues with its transforms')).toBeInTheDocument();
    expect(
      screen.getByText(/The following transforms are in an unhealthy or missing state/)
    ).toBeInTheDocument();

    // Should show both transforms
    expect(screen.getByText(/slo-test-slo-id-1 \(unhealthy\)/)).toBeInTheDocument();
    expect(screen.getByText(/slo-summary-test-slo-id-1 \(missing\)/)).toBeInTheDocument();

    // Should show both action buttons
    expect(screen.getByText('Inspect')).toBeInTheDocument();
    expect(screen.getByText('Reset')).toBeInTheDocument();
  });

  it('should render callout with both unhealthy and missing transforms - rollup missing, summary unhealthy', () => {
    mockUseFetchSloHealth.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [
        {
          sloId: 'test-slo-id',
          sloRevision: 1,
          sloName: 'Test SLO',
          health: {
            overall: 'unhealthy',
            rollup: {
              status: 'missing',
            },
            summary: {
              status: 'unhealthy',
              transformState: 'started',
            },
          },
          state: 'running',
        },
      ],
    });

    renderComponent();

    expect(screen.getByText('This SLO has issues with its transforms')).toBeInTheDocument();
    expect(
      screen.getByText(/The following transforms are in an unhealthy or missing state/)
    ).toBeInTheDocument();

    // Should show both transforms
    expect(screen.getByText(/slo-test-slo-id-1 \(missing\)/)).toBeInTheDocument();
    expect(screen.getByText(/slo-summary-test-slo-id-1 \(unhealthy\)/)).toBeInTheDocument();

    // Should show both action buttons
    expect(screen.getByText('Inspect')).toBeInTheDocument();
    expect(screen.getByText('Reset')).toBeInTheDocument();
  });

  it('should render callout with both transforms unhealthy', () => {
    mockUseFetchSloHealth.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [
        {
          sloId: 'test-slo-id',
          sloRevision: 1,
          sloName: 'Test SLO',
          health: {
            overall: 'unhealthy',
            rollup: {
              status: 'unhealthy',
              transformState: 'started',
            },
            summary: {
              status: 'unhealthy',
              transformState: 'started',
            },
          },
          state: 'running',
        },
      ],
    });

    renderComponent();

    expect(screen.getByText('This SLO has issues with its transforms')).toBeInTheDocument();
    expect(
      screen.getByText(/The following transforms are in an unhealthy state/)
    ).toBeInTheDocument();

    // Should show both transforms as unhealthy
    expect(screen.getByText(/slo-test-slo-id-1 \(unhealthy\)/)).toBeInTheDocument();
    expect(screen.getByText(/slo-summary-test-slo-id-1 \(unhealthy\)/)).toBeInTheDocument();

    // Should show only inspect buttons (no reset for unhealthy)
    expect(screen.getAllByText('Inspect')).toHaveLength(2);
    expect(screen.queryByText('Reset')).not.toBeInTheDocument();
  });

  it('should render callout with both transforms missing', () => {
    mockUseFetchSloHealth.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [
        {
          sloId: 'test-slo-id',
          sloRevision: 1,
          sloName: 'Test SLO',
          health: {
            overall: 'unhealthy',
            rollup: {
              status: 'missing',
            },
            summary: {
              status: 'missing',
            },
          },
          state: 'running',
        },
      ],
    });

    renderComponent();

    expect(screen.getByText('This SLO has issues with its transforms')).toBeInTheDocument();
    expect(screen.getByText(/The following transforms are in a missing state/)).toBeInTheDocument();

    // Should show both transforms as missing
    expect(screen.getByText(/slo-test-slo-id-1 \(missing\)/)).toBeInTheDocument();
    expect(screen.getByText(/slo-summary-test-slo-id-1 \(missing\)/)).toBeInTheDocument();

    // Should show only reset buttons (no inspect for missing)
    expect(screen.getAllByText('Reset')).toHaveLength(2);
    expect(screen.queryByText('Inspect')).not.toBeInTheDocument();
  });

  it('should trigger reset action when reset button is clicked', () => {
    mockUseFetchSloHealth.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [
        {
          sloId: 'test-slo-id',
          sloRevision: 1,
          sloName: 'Test SLO',
          health: {
            overall: 'unhealthy',
            rollup: {
              status: 'missing',
            },
            summary: {
              status: 'healthy',
              transformState: 'started',
            },
          },
          state: 'running',
        },
      ],
    });

    renderComponent();

    const resetButton = screen.getByText('Reset');
    fireEvent.click(resetButton);

    expect(mockTriggerAction).toHaveBeenCalledWith({
      type: 'reset',
      item: mockSlo,
    });
  });

  it('should generate correct transform management URLs', () => {
    mockUseFetchSloHealth.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [
        {
          sloId: 'test-slo-id',
          sloRevision: 1,
          sloName: 'Test SLO',
          health: {
            overall: 'unhealthy',
            rollup: {
              status: 'unhealthy',
              transformState: 'started',
            },
            summary: {
              status: 'healthy',
              transformState: 'started',
            },
          },
          state: 'running',
        },
      ],
    });

    renderComponent();

    const inspectLink = screen.getByTestId('sloHealthCalloutInspectLink');
    expect(inspectLink).toHaveAttribute('href');

    // URL should contain the transform ID
    const href = inspectLink.getAttribute('href');
    expect(href).toContain('slo-test-slo-id-1');
  });
});
