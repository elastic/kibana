/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
jest.mock('../../../common/lib/kibana', () => ({
  useKibana: jest.fn(),
  useToasts: jest.fn().mockReturnValue({
    addError: jest.fn(),
    addSuccess: jest.fn(),
    addWarning: jest.fn(),
    addInfo: jest.fn(),
    remove: jest.fn(),
  }),
}));

jest.mock('../../../common/hooks/use_license', () => ({
  licenseService: {
    isEnterprise: jest.fn(),
  },
}));

jest.mock('../../../assistant/use_assistant_availability', () => ({
  useAssistantAvailability: jest.fn(),
}));

jest.mock('../../hooks/use_find_cost_savings_prompts', () => ({
  useFindCostSavingsPrompts: jest.fn(),
}));

jest.mock('../../hooks/use_signal_index_with_default', () => ({
  useSignalIndexWithDefault: jest.fn(),
}));

// Mock VisualizationEmbeddable
jest.mock('../../../common/components/visualization_actions/visualization_embeddable', () => ({
  VisualizationEmbeddable: jest.fn(() => <div data-test-subj="mock-visualization-embeddable" />),
}));

const mockUseKibana = useKibana as jest.Mock;
const mockLicenseService = licenseService as jest.Mocked<typeof licenseService>;
const mockUseAssistantAvailability = useAssistantAvailability as jest.Mock;
const mockUseFindCostSavingsPrompts = useFindCostSavingsPrompts as jest.MockedFunction<
  typeof useFindCostSavingsPrompts
>;
const mockUseSignalIndexWithDefault = useSignalIndexWithDefault as jest.MockedFunction<
  typeof useSignalIndexWithDefault
>;

const defaultProps = {
  from: '2023-01-01T00:00:00.000Z',
  to: '2023-01-31T23:59:59.999Z',
  isLoading: false,
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
          fetch: jest.fn(),
        },
        featureFlags: {
          getBooleanValue: jest.fn().mockReturnValue(false),
        },
        notifications: {
          toasts: {
            addError: jest.fn(),
            addSuccess: jest.fn(),
            addWarning: jest.fn(),
          },
        },
        inference: {
          chatComplete: jest.fn(),
        },
        uiSettings: {
          get: jest.fn().mockReturnValue('test-connector-id'),
        },
        settings: {
          client: {
            get: jest.fn(),
          },
        },
        ...overrides,
      },
    } as Partial<StartServices>);

  beforeEach(() => {
    jest.clearAllMocks();
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
});
