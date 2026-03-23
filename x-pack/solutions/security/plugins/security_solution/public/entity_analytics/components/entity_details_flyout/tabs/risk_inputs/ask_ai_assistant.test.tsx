/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AskAiAssistant } from './ask_ai_assistant';
import { TestProviders } from '../../../../../common/mock';
import type { EntityType } from '../../../../../../common/search_strategy';

// Hard code the generated anonymized value for easier testing
const ANONYMIZED_VALUE = 'anonymized-value';
jest.mock('@kbn/elastic-assistant-common', () => {
  const actual = jest.requireActual('@kbn/elastic-assistant-common');
  return {
    ...actual,
    getAnonymizedValue: () => ANONYMIZED_VALUE,
  };
});

jest.mock('../../../../../common/hooks/use_experimental_features', () => {
  const actual = jest.requireActual('../../../../../common/hooks/use_experimental_features');
  return {
    ...actual,
    useIsExperimentalFeatureEnabled: jest.fn().mockReturnValue(false), // default to false because we use a negative FF riskScoreAssistantToolDisabled
  };
});

const mockUseFetchAnonymizationFields = jest.fn().mockReturnValue({
  data: {
    data: [],
  },
});

jest.mock(
  '@kbn/elastic-assistant/impl/assistant/api/anonymization_fields/use_fetch_anonymization_fields',
  () => ({
    useFetchAnonymizationFields: () => mockUseFetchAnonymizationFields(),
  })
);

const mockUseAskInAiAssistant = jest.fn();
jest.mock('./use_ask_ai_assistant', () => {
  const actual = jest.requireActual('./use_ask_ai_assistant');
  return {
    ...actual,
    useAskAiAssistant: (params: unknown) => mockUseAskInAiAssistant(params),
  };
});

describe('ExplainWithAiAssistant', () => {
  const defaultProps = {
    entityType: 'user' as EntityType,
    entityName: 'test-user',
  };

  const mockShowAssistantOverlay = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFetchAnonymizationFields.mockReturnValue({
      data: {
        data: [{ field: 'user.name', allowed: true, anonymized: true }],
      },
    });
    mockUseAskInAiAssistant.mockReturnValue({
      showAssistantOverlay: mockShowAssistantOverlay,
      disabled: false,
    });
  });

  it('should render the button when AI assistant is enabled', () => {
    render(<AskAiAssistant {...defaultProps} />, { wrapper: TestProviders });

    expect(screen.getByTestId('explain-with-ai-button')).toBeInTheDocument();
    expect(screen.getByText('Ask AI Assistant')).toBeInTheDocument();
  });

  it('should not render the button when AI assistant is disabled', () => {
    mockUseAskInAiAssistant.mockReturnValue({
      showAssistantOverlay: mockShowAssistantOverlay,
      disabled: true,
    });

    const { container } = render(<AskAiAssistant {...defaultProps} />, {
      wrapper: TestProviders,
    });

    expect(container.firstChild).toBeNull();
  });

  it('should call showAssistantOverlay when button is clicked', () => {
    render(<AskAiAssistant {...defaultProps} />, { wrapper: TestProviders });

    const button = screen.getByTestId('explain-with-ai-button');
    fireEvent.click(button);

    expect(mockShowAssistantOverlay).toHaveBeenCalledTimes(1);
  });

  it('should handle missing anonymization fields data', () => {
    mockUseFetchAnonymizationFields.mockReturnValue({
      data: {
        data: null,
      },
    });

    render(<AskAiAssistant {...defaultProps} />, { wrapper: TestProviders });

    expect(screen.getByTestId('explain-with-ai-button')).toBeInTheDocument();
  });

  it('should use original entity name when anonymized value is not available', () => {
    mockUseFetchAnonymizationFields.mockReturnValue({
      data: {
        data: [],
      },
    });
    render(<AskAiAssistant {...defaultProps} />, { wrapper: TestProviders });

    expect(mockUseAskInAiAssistant).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Explain user 'test-user' Risk Score",
        description: 'Entity: test-user',
      })
    );
  });

  it('should pass correct props to useExplainInAiAssistant hook', () => {
    render(<AskAiAssistant {...defaultProps} />, { wrapper: TestProviders });

    expect(mockUseAskInAiAssistant).toHaveBeenCalledWith({
      title: "Explain user 'test-user' Risk Score",
      description: 'Entity: test-user',
      suggestedPrompt: expect.any(String),
      getPromptContext: expect.any(Function),
      replacements: expect.any(Object),
    });
  });

  it('should generate prompt with anonymized field', async () => {
    render(<AskAiAssistant {...defaultProps} />, { wrapper: TestProviders });

    const getPromptContext = mockUseAskInAiAssistant.mock.calls[0][0].getPromptContext;
    const promptContext = await getPromptContext();

    expect(promptContext).toContain(`Identifier: \`${ANONYMIZED_VALUE}\``);
  });

  it('should work with different entity types', () => {
    const hostProps = {
      entityType: 'host' as EntityType,
      entityName: 'test-host',
    };

    render(<AskAiAssistant {...hostProps} />, { wrapper: TestProviders });

    expect(mockUseAskInAiAssistant).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Explain host 'test-host' Risk Score",
      })
    );
  });
});
