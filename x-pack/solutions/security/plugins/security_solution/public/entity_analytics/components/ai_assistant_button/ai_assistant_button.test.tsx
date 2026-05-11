/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AiAssistantButton } from './ai_assistant_button';
import type { AiAssistantButtonProps } from './ai_assistant_button';
import { TestProviders } from '../../../common/mock';
import type { EntityType } from '../../../../common/search_strategy';
import { ENTITY_PROMPT } from '../../../agent_builder/components/prompts';

// Hard code the generated anonymized value for easier testing
const ANONYMIZED_VALUE = 'anonymized-value';
jest.mock('@kbn/elastic-assistant-common', () => {
  const actual = jest.requireActual('@kbn/elastic-assistant-common');
  return {
    ...actual,
    getAnonymizedValue: () => ANONYMIZED_VALUE,
  };
});

const mockUseFetchAnonymizationFields = jest.fn();
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

const mockUseAgentBuilderAvailability = jest.fn();
jest.mock('../../../agent_builder/hooks/use_agent_builder_availability', () => ({
  useAgentBuilderAvailability: () => mockUseAgentBuilderAvailability(),
}));

const mockOpenAgentBuilderFlyout = jest.fn();
jest.mock('../../../agent_builder/hooks/use_agent_builder_attachment', () => ({
  useAgentBuilderAttachment: () => ({
    openAgentBuilderFlyout: mockOpenAgentBuilderFlyout,
  }),
}));

describe('AiAssistantButton', () => {
  const defaultProps: AiAssistantButtonProps<EntityType> = {
    entityType: 'user' as EntityType,
    entityName: 'test-user',
    telemetryPathway: 'entity_flyout',
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
    mockUseAgentBuilderAvailability.mockReturnValue({
      isAgentBuilderEnabled: false,
      isAgentChatExperienceEnabled: false,
    });
  });

  it('renders the classic Ask AI Assistant button when agent chat experience is disabled', () => {
    render(<AiAssistantButton {...defaultProps} />, { wrapper: TestProviders });

    expect(screen.getByTestId('ai-assistant-button')).toBeInTheDocument();
    expect(screen.getByText('Ask AI Assistant')).toBeInTheDocument();
  });

  it('renders the agent builder attachment when agent chat experience is enabled', () => {
    mockUseAgentBuilderAvailability.mockReturnValue({
      isAgentBuilderEnabled: true,
      isAgentChatExperienceEnabled: true,
      hasAgentBuilderPrivilege: true,
      hasValidAgentBuilderLicense: true,
    });

    render(<AiAssistantButton {...defaultProps} />, { wrapper: TestProviders });

    expect(screen.getByTestId('newAgentBuilderAttachment')).toBeInTheDocument();
    expect(screen.queryByTestId('ai-assistant-button')).not.toBeInTheDocument();
  });

  it('returns null when classic AI assistant is disabled and agent builder is unavailable', () => {
    mockUseAskInAiAssistant.mockReturnValue({
      showAssistantOverlay: mockShowAssistantOverlay,
      disabled: true,
    });

    const { container } = render(<AiAssistantButton {...defaultProps} />, {
      wrapper: TestProviders,
    });

    expect(container.firstChild).toBeNull();
  });

  it('still renders agent builder attachment when classic assistant is disabled but agent builder is available', () => {
    mockUseAskInAiAssistant.mockReturnValue({
      showAssistantOverlay: mockShowAssistantOverlay,
      disabled: true,
    });
    mockUseAgentBuilderAvailability.mockReturnValue({
      isAgentBuilderEnabled: true,
      isAgentChatExperienceEnabled: true,
      hasAgentBuilderPrivilege: true,
      hasValidAgentBuilderLicense: true,
    });

    render(<AiAssistantButton {...defaultProps} />, { wrapper: TestProviders });

    expect(screen.getByTestId('newAgentBuilderAttachment')).toBeInTheDocument();
  });

  it('calls showAssistantOverlay when the classic button is clicked', () => {
    render(<AiAssistantButton {...defaultProps} />, { wrapper: TestProviders });

    fireEvent.click(screen.getByTestId('ai-assistant-button'));

    expect(mockShowAssistantOverlay).toHaveBeenCalledTimes(1);
  });

  it('calls openAgentBuilderFlyout when the agent builder attachment is clicked', () => {
    mockUseAgentBuilderAvailability.mockReturnValue({
      isAgentBuilderEnabled: true,
      isAgentChatExperienceEnabled: true,
      hasAgentBuilderPrivilege: true,
      hasValidAgentBuilderLicense: true,
    });

    render(<AiAssistantButton {...defaultProps} />, { wrapper: TestProviders });

    fireEvent.click(screen.getByTestId('newAgentBuilderAttachment'));

    expect(mockOpenAgentBuilderFlyout).toHaveBeenCalledTimes(1);
  });

  it('passes the derived title, description, suggested prompt, prompt context, and replacements to useAskAiAssistant', () => {
    render(<AiAssistantButton {...defaultProps} />, { wrapper: TestProviders });

    expect(mockUseAskInAiAssistant).toHaveBeenCalledWith({
      title: "Explain user 'test-user' Risk Score",
      description: 'Entity: test-user',
      suggestedPrompt: ENTITY_PROMPT,
      getPromptContext: expect.any(Function),
      replacements: expect.any(Object),
    });
  });

  it('handles missing anonymization fields data', () => {
    mockUseFetchAnonymizationFields.mockReturnValue({
      data: {
        data: null,
      },
    });

    render(<AiAssistantButton {...defaultProps} />, { wrapper: TestProviders });

    expect(screen.getByTestId('ai-assistant-button')).toBeInTheDocument();
  });

  it('generates prompt with anonymized identifier when anonymization fields are present', async () => {
    render(<AiAssistantButton {...defaultProps} />, { wrapper: TestProviders });

    const getPromptContext = mockUseAskInAiAssistant.mock.calls[0][0].getPromptContext;
    const promptContext = await getPromptContext();

    expect(promptContext).toContain(`Identifier: \`${ANONYMIZED_VALUE}\``);
  });

  it('falls back to original entity name when no anonymized value is available', () => {
    mockUseFetchAnonymizationFields.mockReturnValue({
      data: {
        data: [],
      },
    });

    render(<AiAssistantButton {...defaultProps} />, { wrapper: TestProviders });

    expect(mockUseAskInAiAssistant).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Explain user 'test-user' Risk Score",
        description: 'Entity: test-user',
      })
    );
  });
});
