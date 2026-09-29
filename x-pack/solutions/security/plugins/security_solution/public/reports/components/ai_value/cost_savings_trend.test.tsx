/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, Mocked, MockedFunction } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { CostSavingsTrend } from './cost_savings_trend';
import { VisualizationEmbeddable } from '../../../common/components/visualization_actions/visualization_embeddable';
import { useKibana } from '../../../common/lib/kibana';
import { licenseService } from '../../../common/hooks/use_license';
import { useAssistantAvailability } from '../../../assistant/use_assistant_availability';
import { useFindCostSavingsPrompts } from '../../hooks/use_find_cost_savings_prompts';
import type { StartServices } from '../../../types';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useSignalIndexWithDefault } from '../../hooks/use_signal_index_with_default';

// Mock dependencies
vi.mock('../../../common/lib/kibana', () => {
  const mocked = {
    useKibana: vi.fn(),
    useToasts: vi.fn().mockReturnValue({
      addError: vi.fn(),
      addSuccess: vi.fn(),
      addWarning: vi.fn(),
      addInfo: vi.fn(),
      remove: vi.fn(),
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../common/hooks/use_license', () => {
  const mocked = {
    licenseService: {
      isEnterprise: vi.fn(),
    },
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../assistant/use_assistant_availability', () => {
  const mocked = {
    useAssistantAvailability: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../hooks/use_find_cost_savings_prompts', () => {
  const mocked = {
    useFindCostSavingsPrompts: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../hooks/use_signal_index_with_default', () => {
  const mocked = {
    useSignalIndexWithDefault: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

// Mock VisualizationEmbeddable
vi.mock('../../../common/components/visualization_actions/visualization_embeddable', () => {
  const mocked = {
    VisualizationEmbeddable: vi.fn(() => <div data-test-subj="mock-visualization-embeddable" />),
  };
  return { ...mocked, default: mocked };
});

const mockUseKibana = useKibana as Mock;
const mockLicenseService = licenseService as Mocked<typeof licenseService>;
const mockUseAssistantAvailability = useAssistantAvailability as Mock;
const mockUseFindCostSavingsPrompts = useFindCostSavingsPrompts as MockedFunction<
  typeof useFindCostSavingsPrompts
>;
const mockUseSignalIndexWithDefault = useSignalIndexWithDefault as MockedFunction<
  typeof useSignalIndexWithDefault
>;

const defaultProps = {
  isSample: false as const,
  from: '2023-01-01T00:00:00.000Z',
  to: '2023-01-31T23:59:59.999Z',
  minutesPerAlert: 10,
  analystHourlyRate: 100,
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

describe('CostSavingsTrend', () => {
  const createMockKibanaServices = (overrides: Partial<StartServices> = {}) =>
    ({
      services: {
        http: {
          fetch: vi.fn(),
        },
        featureFlags: {
          getBooleanValue: vi.fn().mockReturnValue(false),
        },
        notifications: {
          toasts: {
            addError: vi.fn(),
            addSuccess: vi.fn(),
            addWarning: vi.fn(),
          },
        },
        inference: {
          chatComplete: vi.fn(),
        },
        uiSettings: {
          get: vi.fn().mockReturnValue('test-connector-id'),
        },
        settings: {
          client: {
            get: vi.fn(),
          },
        },
        ...overrides,
      },
    } as Partial<StartServices>);

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseKibana.mockReturnValue(createMockKibanaServices());

    mockLicenseService.isEnterprise.mockReturnValue(true);
    mockUseAssistantAvailability.mockReturnValue({
      hasAssistantPrivilege: true,
      isAssistantEnabled: true,
    });

    mockUseFindCostSavingsPrompts.mockReturnValue({
      part1: 'Test prompt part 1',
      part2: 'Test prompt part 2',
    });
    mockUseSignalIndexWithDefault.mockReturnValue('.alerts-security.alerts-default');
  });

  it('renders CostSavingsTrend panel', () => {
    render(<CostSavingsTrend {...defaultProps} />, { wrapper });
    expect(screen.getByTestId('cost-savings-trend-panel')).toBeInTheDocument();
    expect(screen.getByTestId('mock-visualization-embeddable')).toBeInTheDocument();
  });

  it('passes correct props to VisualizationEmbeddable', () => {
    render(<CostSavingsTrend {...defaultProps} />, { wrapper });
    expect(VisualizationEmbeddable).toHaveBeenCalledWith(
      expect.objectContaining({
        'data-test-subj': 'embeddable-area-chart',
        getLensAttributes: expect.any(Function),
        timerange: { from: defaultProps.from, to: defaultProps.to },
        id: expect.stringContaining('CostSavingsTrendQuery-area-embeddable'),
        height: 300,
        inspectTitle: expect.any(String),
        scopeId: expect.any(String),
        withActions: expect.any(Array),
      }),
      {}
    );
  });

  it('calls useSignalIndexWithDefault hook', () => {
    render(<CostSavingsTrend {...defaultProps} />, { wrapper });
    expect(mockUseSignalIndexWithDefault).toHaveBeenCalled();
  });

  it('does not render VisualizationEmbeddable if isSample is set to true', () => {
    render(<CostSavingsTrend {...defaultProps} isSample={true} />, { wrapper });
    expect(VisualizationEmbeddable).not.toHaveBeenCalled();
    expect(screen.queryByTestId('mock-visualization-embeddable')).not.toBeInTheDocument();
    expect(screen.getByTestId('sample-cost-savings-trend')).toBeInTheDocument();
  });
});
