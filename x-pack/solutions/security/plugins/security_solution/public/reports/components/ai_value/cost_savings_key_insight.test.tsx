/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { InferencePublicStart } from '@kbn/inference-plugin/public';
import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public/types';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CostSavingsKeyInsight } from './cost_savings_key_insight';
import { useKibana } from '../../../common/lib/kibana';
import { licenseService } from '../../../common/hooks/use_license';
import { useAssistantAvailability } from '../../../assistant/use_assistant_availability';
import { useFindCostSavingsPrompts } from '../../hooks/use_find_cost_savings_prompts';
import { useAIConnectors } from '../../../common/hooks/use_ai_connectors';
import { MessageRole } from '@kbn/inference-common';
import type { VisualizationTablesWithMeta } from '../../../common/components/visualization_actions/types';
import type { StartServices } from '../../../types';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';

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

jest.mock('../../../common/hooks/use_ai_connectors', () => ({
  useAIConnectors: jest.fn(),
}));

const mockUseKibana = useKibana as jest.Mock;
const mockLicenseService = licenseService as jest.Mocked<typeof licenseService>;
const mockUseAssistantAvailability = useAssistantAvailability as jest.Mock;
const mockUseFindCostSavingsPrompts = useFindCostSavingsPrompts as jest.MockedFunction<
  typeof useFindCostSavingsPrompts
>;
const mockUseAIConnectors = useAIConnectors as jest.MockedFunction<typeof useAIConnectors>;

const mockLensResponse = {
  tables: [],
  meta: {
    statistics: {
      totalCount: 1000,
    },
  },
} as unknown as VisualizationTablesWithMeta;

const defaultProps = {
  isLoading: false,
  lensResponse: mockLensResponse,
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

describe('CostSavingsKeyInsight', () => {
  const createMockKibanaServices = (overrides: Partial<StartServices> = {}) =>
    ({
      services: {
        http: {
          fetch: jest.fn(),
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
        featureFlags: {
          getBooleanValue: jest.fn().mockReturnValue(false),
        },
        ...overrides,
      },
    } as Partial<StartServices>);
  const chatCompleteResult = 'Test result';

  const mockChatComplete = jest.fn().mockResolvedValue({
    content: chatCompleteResult,
  });
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

    mockUseAIConnectors.mockReturnValue({
      aiConnectors: [
        {
          id: 'test-connector-id',
          name: 'Test Connector',
          actionTypeId: '.gen-ai',
        } as ActionConnector,
      ],
      isLoading: false,
      error: null,
    });

    mockUseKibana.mockReturnValue(
      createMockKibanaServices({
        inference: {
          chatComplete: mockChatComplete,
        } as unknown as InferencePublicStart,
      })
    );
  });

  it('renders component correctly and calls expected hooks', async () => {
    render(<CostSavingsKeyInsight {...defaultProps} />, { wrapper });

    await waitFor(() => {
      expect(screen.getByTestId('alertProcessingKeyInsightsContainer')).toBeInTheDocument();
      expect(screen.getByTestId('alertProcessingKeyInsightsGreetingGroup')).toBeInTheDocument();
      expect(screen.getByTestId('alertProcessingKeyInsightsLogo')).toBeInTheDocument();
      expect(screen.getByTestId('alertProcessingKeyInsightsGreeting')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(mockUseKibana).toHaveBeenCalled();
      expect(mockLicenseService.isEnterprise).toHaveBeenCalled();
      expect(mockUseAssistantAvailability).toHaveBeenCalled();
      expect(mockUseFindCostSavingsPrompts).toHaveBeenCalledWith({
        context: {
          isAssistantEnabled: true,
          httpFetch: expect.any(Function),
          toasts: expect.any(Object),
        },
      });
    });
  });

  it('handles non-enterprise license correctly', async () => {
    mockLicenseService.isEnterprise.mockReturnValue(false);
    render(<CostSavingsKeyInsight {...defaultProps} />, { wrapper });

    await waitFor(() => {
      expect(mockUseFindCostSavingsPrompts).toHaveBeenCalledWith({
        context: {
          isAssistantEnabled: false,
          httpFetch: expect.any(Function),
          toasts: expect.any(Object),
        },
      });
    });
  });

  it('handles disabled assistant availability correctly', async () => {
    mockUseAssistantAvailability.mockReturnValue({
      hasAssistantPrivilege: false,
      isAssistantEnabled: false,
    });
    render(<CostSavingsKeyInsight {...defaultProps} />, { wrapper });

    await waitFor(() => {
      expect(mockUseFindCostSavingsPrompts).toHaveBeenCalledWith({
        context: {
          isAssistantEnabled: false,
          httpFetch: expect.any(Function),
          toasts: expect.any(Object),
        },
      });
    });
  });

  it('calls chatComplete with correct parameters and displays result', async () => {
    render(<CostSavingsKeyInsight {...defaultProps} />, { wrapper });

    await waitFor(() => {
      expect(mockChatComplete).toHaveBeenCalledWith({
        connectorId: 'test-connector-id',
        messages: [
          {
            role: MessageRole.User,
            content: expect.stringMatching(
              /Test prompt part 1\s*```\s*.*"totalCount":1000.*\s*```\s*Test prompt part 2/
            ),
          },
        ],
      });
      expect(screen.getByText(chatCompleteResult)).toBeInTheDocument();
    });
  });

  it('handles chatComplete errors correctly', async () => {
    const mockChatCompleteError = jest.fn().mockRejectedValue(new Error('API Error'));
    mockUseKibana.mockReturnValue(
      createMockKibanaServices({
        // @ts-ignore
        inference: {
          chatComplete: mockChatCompleteError,
        },
      })
    );
    render(<CostSavingsKeyInsight {...defaultProps} />, { wrapper });

    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  it('shows loading state when lensResponse is null', () => {
    render(<CostSavingsKeyInsight isLoading={false} lensResponse={null} />, { wrapper });
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows loading state when prompts are null', () => {
    mockUseFindCostSavingsPrompts.mockReturnValue(null);
    render(<CostSavingsKeyInsight {...defaultProps} />, { wrapper });
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows loading state when connectorId is null', () => {
    mockUseKibana.mockReturnValue(
      createMockKibanaServices({
        // @ts-ignore
        uiSettings: {
          get: jest.fn().mockReturnValue(null),
        },
      })
    );
    render(<CostSavingsKeyInsight {...defaultProps} />, { wrapper });
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('re-runs effect when lensResponse changes', async () => {
    const { rerender } = render(<CostSavingsKeyInsight {...defaultProps} />, { wrapper });

    await waitFor(() => {
      expect(mockChatComplete).toHaveBeenCalledTimes(1);
    });

    const newLensResponse = {
      ...mockLensResponse,
      meta: {
        statistics: {
          totalCount: 2000,
        },
      },
    };

    rerender(<CostSavingsKeyInsight isLoading={false} lensResponse={newLensResponse} />);

    await waitFor(() => {
      expect(mockChatComplete).toHaveBeenCalledTimes(2);
    });
  });
});
