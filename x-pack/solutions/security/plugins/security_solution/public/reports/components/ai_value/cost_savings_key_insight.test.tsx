/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { CostSavingsKeyInsight } from './cost_savings_key_insight';
import { useKibana } from '../../../common/lib/kibana';
import { licenseService } from '../../../common/hooks/use_license';
import { useAssistantAvailability } from '../../../assistant/use_assistant_availability';
import { useFindCostSavingsPrompts } from '../../hooks/use_find_cost_savings_prompts';
import { MessageRole } from '@kbn/inference-common';
import type { VisualizationTablesWithMeta } from '../../../common/components/visualization_actions/types';
import type { StartServices } from '../../../types';

// Mock dependencies
jest.mock('../../../common/lib/kibana', () => ({
  useKibana: jest.fn(),
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

const mockUseKibana = useKibana as jest.Mock;
const mockLicenseService = licenseService as jest.Mocked<typeof licenseService>;
const mockUseAssistantAvailability = useAssistantAvailability as jest.Mock;
const mockUseFindCostSavingsPrompts = useFindCostSavingsPrompts as jest.MockedFunction<
  typeof useFindCostSavingsPrompts
>;

const mockLensResponse = {
  tables: [],
  meta: {
    statistics: {
      totalCount: 1000,
    },
  },
} as unknown as VisualizationTablesWithMeta;

const defaultProps = {
  lensResponse: mockLensResponse,
};

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
        ...overrides,
      },
    } as Partial<StartServices>);

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock implementations
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
  });

  it('renders the component with correct data-test-subj', () => {
    render(<CostSavingsKeyInsight {...defaultProps} />);

    expect(screen.getByTestId('alertProcessingKeyInsightsContainer')).toBeInTheDocument();
  });

  it('renders the greeting group with correct data-test-subj', () => {
    render(<CostSavingsKeyInsight {...defaultProps} />);

    expect(screen.getByTestId('alertProcessingKeyInsightsGreetingGroup')).toBeInTheDocument();
  });

  it('renders the Elastic logo with correct data-test-subj', () => {
    render(<CostSavingsKeyInsight {...defaultProps} />);

    expect(screen.getByTestId('alertProcessingKeyInsightsLogo')).toBeInTheDocument();
  });

  it('renders the greeting text with correct data-test-subj', () => {
    render(<CostSavingsKeyInsight {...defaultProps} />);

    expect(screen.getByTestId('alertProcessingKeyInsightsGreeting')).toBeInTheDocument();
  });

  it('shows skeleton loading state initially', () => {
    render(<CostSavingsKeyInsight {...defaultProps} />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('calls useKibana hook', () => {
    render(<CostSavingsKeyInsight {...defaultProps} />);

    expect(mockUseKibana).toHaveBeenCalled();
  });

  it('calls licenseService.isEnterprise', () => {
    render(<CostSavingsKeyInsight {...defaultProps} />);

    expect(mockLicenseService.isEnterprise).toHaveBeenCalled();
  });

  it('calls useAssistantAvailability hook', () => {
    render(<CostSavingsKeyInsight {...defaultProps} />);

    expect(mockUseAssistantAvailability).toHaveBeenCalled();
  });

  it('calls useFindCostSavingsPrompts with correct parameters', () => {
    render(<CostSavingsKeyInsight {...defaultProps} />);

    expect(mockUseFindCostSavingsPrompts).toHaveBeenCalledWith({
      context: {
        isAssistantEnabled: true,
        httpFetch: expect.any(Function),
        toasts: expect.any(Object),
      },
      params: {
        prompt_group_id: 'aiForSoc',
        prompt_ids: ['costSavingsInsightPart1', 'costSavingsInsightPart2'],
      },
    });
  });

  it('handles null lensResponse', () => {
    const propsWithNullResponse = {
      lensResponse: null,
    };

    render(<CostSavingsKeyInsight {...propsWithNullResponse} />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('handles null prompts from useFindCostSavingsPrompts', () => {
    mockUseFindCostSavingsPrompts.mockReturnValue(null);

    render(<CostSavingsKeyInsight {...defaultProps} />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('handles missing connectorId', () => {
    mockUseKibana.mockReturnValue(
      createMockKibanaServices({
        // @ts-ignore
        uiSettings: {
          get: jest.fn().mockReturnValue(null),
        },
      })
    );

    render(<CostSavingsKeyInsight {...defaultProps} />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('handles non-enterprise license', () => {
    mockLicenseService.isEnterprise.mockReturnValue(false);

    render(<CostSavingsKeyInsight {...defaultProps} />);

    expect(mockUseFindCostSavingsPrompts).toHaveBeenCalledWith({
      context: {
        isAssistantEnabled: false,
        httpFetch: expect.any(Function),
        toasts: expect.any(Object),
      },
      params: {
        prompt_group_id: 'aiForSoc',
        prompt_ids: ['costSavingsInsightPart1', 'costSavingsInsightPart2'],
      },
    });
  });

  it('handles disabled assistant', () => {
    mockUseAssistantAvailability.mockReturnValue({
      hasAssistantPrivilege: false,
      isAssistantEnabled: false,
    });

    render(<CostSavingsKeyInsight {...defaultProps} />);

    expect(mockUseFindCostSavingsPrompts).toHaveBeenCalledWith({
      context: {
        isAssistantEnabled: false,
        httpFetch: expect.any(Function),
        toasts: expect.any(Object),
      },
      params: {
        prompt_group_id: 'aiForSoc',
        prompt_ids: ['costSavingsInsightPart1', 'costSavingsInsightPart2'],
      },
    });
  });

  it('calls inference.chatComplete with correct parameters when all conditions are met', async () => {
    const mockChatComplete = jest.fn().mockResolvedValue({
      content: 'Test insight result',
    });

    mockUseKibana.mockReturnValue(
      createMockKibanaServices({
        inference: {
          chatComplete: mockChatComplete,
        },
      })
    );

    render(<CostSavingsKeyInsight {...defaultProps} />);

    await waitFor(() => {
      expect(mockChatComplete).toHaveBeenCalledWith({
        connectorId: 'test-connector-id',
        messages: [
          {
            role: MessageRole.User,
            content: expect.stringContaining('Test prompt part 1'),
          },
        ],
      });
    });
  });

  it('displays insight result when chatComplete succeeds', async () => {
    const mockChatComplete = jest.fn().mockResolvedValue({
      content: '<p>Test insight result</p>',
    });

    mockUseKibana.mockReturnValue(
      createMockKibanaServices({
        inference: {
          chatComplete: mockChatComplete,
        },
      })
    );

    render(<CostSavingsKeyInsight {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Test insight result')).toBeInTheDocument();
    });
  });

  it('handles chatComplete error gracefully', async () => {
    const mockChatComplete = jest.fn().mockRejectedValue(new Error('API Error'));

    mockUseKibana.mockReturnValue(
      createMockKibanaServices({
        inference: {
          chatComplete: mockChatComplete,
        },
      })
    );

    render(<CostSavingsKeyInsight {...defaultProps} />);

    // Should still show loading state after error
    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  it('constructs prompt correctly with lensResponse data', async () => {
    const mockChatComplete = jest.fn().mockResolvedValue({
      content: 'Test result',
    });

    mockUseKibana.mockReturnValue(
      createMockKibanaServices({
        inference: {
          chatComplete: mockChatComplete,
        },
      })
    );

    render(<CostSavingsKeyInsight {...defaultProps} />);

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
    });
  });

  it('re-runs effect when lensResponse changes', async () => {
    const mockChatComplete = jest.fn().mockResolvedValue({
      content: 'Test result',
    });

    mockUseKibana.mockReturnValue(
      createMockKibanaServices({
        inference: {
          chatComplete: mockChatComplete,
        },
      })
    );

    const { rerender } = render(<CostSavingsKeyInsight {...defaultProps} />);

    await waitFor(() => {
      expect(mockChatComplete).toHaveBeenCalledTimes(1);
    });

    // Change lensResponse
    const newLensResponse = {
      ...mockLensResponse,
      meta: {
        statistics: {
          totalCount: 2000,
        },
      },
    };

    rerender(<CostSavingsKeyInsight lensResponse={newLensResponse} />);

    await waitFor(() => {
      expect(mockChatComplete).toHaveBeenCalledTimes(2);
    });
  });
});
