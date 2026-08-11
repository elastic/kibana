/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { sloFeatureId } from '@kbn/observability-plugin/common';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { SloHealthCallout } from './slo_health_callout';
import { useFetchSloHealth } from '../../../hooks/use_fetch_slo_health';
import { useRepairSlo } from '../../../hooks/use_repair_slo';
import { usePermissions } from '../../../hooks/use_permissions';
import { render } from '../../../utils/test_helper';
import { useKibana } from '../../../hooks/use_kibana';
import { cloneDeep } from 'lodash';
import { baseSlo } from '../../../data/slo';
import {
  aConflictingTransformHealth,
  aHealthyTransformHealth,
  aMissingTransformHealth,
  anUnhealthyTransformHealth,
} from '../../../data/slo/health';

jest.mock('../../../hooks/use_fetch_slo_health');
jest.mock('../../../hooks/use_repair_slo');
jest.mock('../../../hooks/use_permissions');
jest.mock('../../../hooks/use_kibana');

const mockUseFetchSloHealth = useFetchSloHealth as jest.MockedFunction<typeof useFetchSloHealth>;
const mockUseRepairSlo = useRepairSlo as jest.MockedFunction<typeof useRepairSlo>;
const mockUsePermissions = usePermissions as jest.MockedFunction<typeof usePermissions>;
const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

const mockSlo: SLOWithSummaryResponse = cloneDeep({
  ...baseSlo,
  id: 'test-slo-id',
  name: 'Test SLO',
});

const mockRepairSlo = jest.fn();

describe('SloHealthCallout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRepairSlo.mockReturnValue({
      mutate: mockRepairSlo,
      isLoading: false,
      isSuccess: false,
      isError: false,
    } as any);
    mockUseKibana.mockReturnValue({
      services: {
        application: {
          capabilities: {
            [sloFeatureId]: { read: true, write: true },
          },
        },
        notifications: {
          toasts: {
            addSuccess: jest.fn(),
            addError: jest.fn(),
            addDanger: jest.fn(),
          },
        },
        share: {
          url: {
            locators: {
              get: () => ({
                getRedirectUrl: jest.fn(),
              }),
            },
          },
        },
      },
    } as any);

    // Default mock for useFetchSloHealth - individual tests will override this
    mockUseFetchSloHealth.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [],
    });

    // Default mock for usePermissions - individual tests can override this
    mockUsePermissions.mockReturnValue({
      isLoading: false,
      data: {
        hasAllWriteRequested: true,
        hasAllReadRequested: true,
        capabilities: {
          read: true,
          write: true,
        },
        privileges: {
          read: true,
          write: true,
        },
      },
    });
  });

  const renderComponent = (slo = mockSlo) => {
    return render(<SloHealthCallout slo={slo} />);
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

  it('should not render when SLO health is not problematic', () => {
    mockUseFetchSloHealth.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [
        {
          id: 'test-slo-id',
          instanceId: 'irrelevant',
          revision: 1,
          name: 'Test SLO',
          health: {
            isProblematic: false,
            rollup: aHealthyTransformHealth,
            summary: aHealthyTransformHealth,
          },
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
          id: 'test-slo-id',
          instanceId: 'irrelevant',
          revision: 1,
          name: 'Test SLO',
          health: {
            isProblematic: true,
            rollup: anUnhealthyTransformHealth,
            summary: aHealthyTransformHealth,
          },
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
          id: 'test-slo-id',
          instanceId: 'irrelevant',
          revision: 1,
          name: 'Test SLO',
          health: {
            isProblematic: true,
            rollup: aMissingTransformHealth,
            summary: aHealthyTransformHealth,
          },
        },
      ],
    });

    renderComponent();

    expect(screen.getByText('This SLO has issues with its transforms')).toBeInTheDocument();
    expect(screen.getByTestId('sloSloHealthCalloutRepairButton')).toBeInTheDocument();
  });

  it('should render callout with conflicting state for rollup transform', () => {
    mockUseFetchSloHealth.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [
        {
          id: 'test-slo-id',
          instanceId: 'irrelevant',
          revision: 1,
          name: 'Test SLO',
          health: {
            isProblematic: true,
            rollup: aConflictingTransformHealth,
            summary: aHealthyTransformHealth,
          },
        },
      ],
    });

    renderComponent();

    expect(screen.getByText('This SLO has issues with its transforms')).toBeInTheDocument();
    expect(screen.getByTestId('sloSloHealthCalloutRepairButton')).toBeInTheDocument();
  });

  it('should render callout with unhealthy summary transform', () => {
    mockUseFetchSloHealth.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [
        {
          id: 'test-slo-id',
          instanceId: 'irrelevant',
          revision: 1,
          name: 'Test SLO',
          health: {
            isProblematic: true,
            rollup: aHealthyTransformHealth,
            summary: anUnhealthyTransformHealth,
          },
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
          id: 'test-slo-id',
          instanceId: 'irrelevant',
          revision: 1,
          name: 'Test SLO',
          health: {
            isProblematic: true,
            rollup: aHealthyTransformHealth,
            summary: aMissingTransformHealth,
          },
        },
      ],
    });

    renderComponent();

    expect(screen.getByText('This SLO has issues with its transforms')).toBeInTheDocument();
    expect(screen.getByTestId('sloSloHealthCalloutRepairButton')).toBeInTheDocument();
  });

  it('should render callout with conflicting state for summary transform', () => {
    mockUseFetchSloHealth.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [
        {
          id: 'test-slo-id',
          instanceId: 'irrelevant',
          revision: 1,
          name: 'Test SLO',
          health: {
            isProblematic: true,
            rollup: aHealthyTransformHealth,
            summary: aConflictingTransformHealth,
          },
        },
      ],
    });

    renderComponent();

    expect(screen.getByText('This SLO has issues with its transforms')).toBeInTheDocument();
    expect(screen.getByTestId('sloSloHealthCalloutRepairButton')).toBeInTheDocument();
  });

  it('should render callout with both unhealthy and missing transforms - rollup unhealthy, summary missing', () => {
    mockUseFetchSloHealth.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [
        {
          id: 'test-slo-id',
          instanceId: 'irrelevant',
          revision: 1,
          name: 'Test SLO',
          health: {
            isProblematic: true,
            rollup: anUnhealthyTransformHealth,
            summary: aMissingTransformHealth,
          },
        },
      ],
    });

    renderComponent();

    expect(screen.getByText('This SLO has issues with its transforms')).toBeInTheDocument();
    expect(screen.getByTestId('sloSloHealthCalloutRepairButton')).toBeInTheDocument();
  });

  it('should render callout with both unhealthy and missing transforms - rollup missing, summary unhealthy', () => {
    mockUseFetchSloHealth.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [
        {
          id: 'test-slo-id',
          instanceId: 'irrelevant',
          revision: 1,
          name: 'Test SLO',
          health: {
            isProblematic: true,
            rollup: aMissingTransformHealth,
            summary: anUnhealthyTransformHealth,
          },
        },
      ],
    });

    renderComponent();

    expect(screen.getByText('This SLO has issues with its transforms')).toBeInTheDocument();
    expect(screen.getByTestId('sloSloHealthCalloutRepairButton')).toBeInTheDocument();
  });

  it('should render callout with both transforms unhealthy', () => {
    mockUseFetchSloHealth.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [
        {
          id: 'test-slo-id',
          instanceId: 'irrelevant',
          revision: 1,
          name: 'Test SLO',
          health: {
            isProblematic: true,
            rollup: anUnhealthyTransformHealth,
            summary: anUnhealthyTransformHealth,
          },
        },
      ],
    });

    renderComponent();

    expect(screen.getByText('This SLO has issues with its transforms')).toBeInTheDocument();
    expect(screen.getByText(/slo-test-slo-id-1 \(unhealthy\)/)).toBeInTheDocument();
    expect(screen.getByText(/slo-summary-test-slo-id-1 \(unhealthy\)/)).toBeInTheDocument();
    expect(screen.getAllByText('Inspect')).toHaveLength(2);
  });

  it('should render callout with both transforms missing', () => {
    mockUseFetchSloHealth.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [
        {
          id: 'test-slo-id',
          instanceId: 'irrelevant',
          revision: 1,
          name: 'Test SLO',
          health: {
            isProblematic: true,
            rollup: aMissingTransformHealth,
            summary: aMissingTransformHealth,
          },
        },
      ],
    });

    renderComponent();

    expect(screen.getByText('This SLO has issues with its transforms')).toBeInTheDocument();
    expect(screen.getByTestId('sloSloHealthCalloutRepairButton')).toBeInTheDocument();
  });

  it('should call repairSlo when repair button is clicked', () => {
    mockUseFetchSloHealth.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [
        {
          id: 'test-slo-id',
          instanceId: 'irrelevant',
          revision: 1,
          name: 'Test SLO',
          health: {
            isProblematic: true,
            rollup: aMissingTransformHealth,
            summary: aHealthyTransformHealth,
          },
        },
      ],
    });

    renderComponent();

    expect(screen.getByText('This SLO has issues with its transforms')).toBeInTheDocument();
    const repairButton = screen.getByTestId('sloSloHealthCalloutRepairButton');
    expect(repairButton).toBeInTheDocument();

    fireEvent.click(repairButton);

    expect(mockRepairSlo).toHaveBeenCalledWith();
  });
});
