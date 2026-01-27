/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { EntityHighlightsSettings } from './entity_highlights_settings';
import { TestProviders } from '../../../../common/mock';

const mockShowAssistantOverlay = jest.fn();
const mockOnChangeShowAnonymizedValues = jest.fn();
const mockSetConnectorId = jest.fn();
const mockClosePopover = jest.fn();
const mockOpenPopover = jest.fn();
const mockOpenAgentBuilderFlyout = jest.fn();
const mockUseAgentBuilderAvailability = jest.fn(() => ({ isAgentBuilderEnabled: false }));

jest.mock('../tabs/risk_inputs/use_ask_ai_assistant', () => ({
  useAskAiAssistant: () => ({
    showAssistantOverlay: mockShowAssistantOverlay,
  }),
}));

jest.mock('../../../../agent_builder/hooks/use_agent_builder_availability', () => ({
  useAgentBuilderAvailability: () => mockUseAgentBuilderAvailability(),
}));

jest.mock('../../../../agent_builder/hooks/use_agent_builder_attachment', () => ({
  useAgentBuilderAttachment: () => ({
    openAgentBuilderFlyout: mockOpenAgentBuilderFlyout,
  }),
}));

jest.mock(
  '@kbn/elastic-assistant/impl/data_anonymization/settings/anonymization_settings_management',
  () => ({
    AnonymizationSettingsManagement: ({ onClose }: { onClose: () => void }) => (
      <div data-test-subj="anonymizationSettingsModal">
        <button type="button" data-test-subj="closeAnonymizationSettingsModal" onClick={onClose}>
          {'Close'}
        </button>
      </div>
    ),
  })
);

describe('EntityHighlightsSettings', () => {
  const defaultProps = {
    showAnonymizedValues: false,
    onChangeShowAnonymizedValues: mockOnChangeShowAnonymizedValues,
    setConnectorId: mockSetConnectorId,
    connectorId: 'test-connector',
    connectorName: 'Elastic Managed LLM',
    entityType: 'user',
    entityIdentifier: 'test-user',
    assistantResult: {
      aiResponse: 'Test AI response',
      replacements: { anonymized_user: 'test-user' },
      summaryAsText: '{"user": "test-user"}',
    },
    closePopover: mockClosePopover,
    openPopover: mockOpenPopover,
    isLoading: false,
    isPopoverOpen: true,
    isAssistantVisible: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAgentBuilderAvailability.mockReturnValue({ isAgentBuilderEnabled: false });
  });

  it('renders the settings button', () => {
    render(<EntityHighlightsSettings {...defaultProps} />, {
      wrapper: TestProviders,
    });

    expect(screen.getByLabelText('Entity highlights settings menu')).toBeInTheDocument();
  });

  it('opens popover when button is clicked', () => {
    render(<EntityHighlightsSettings {...defaultProps} isPopoverOpen={false} />, {
      wrapper: TestProviders,
    });

    fireEvent.click(screen.getByLabelText('Entity highlights settings menu'));
    expect(mockOpenPopover).toHaveBeenCalled();
  });

  it('renders anonymized values switch', () => {
    render(<EntityHighlightsSettings {...defaultProps} />, {
      wrapper: TestProviders,
    });

    expect(screen.getByLabelText('Show anonymized values')).toBeInTheDocument();
  });

  it('calls onChangeShowAnonymizedValues when switch is toggled', () => {
    render(<EntityHighlightsSettings {...defaultProps} />, {
      wrapper: TestProviders,
    });

    fireEvent.click(screen.getByRole('switch'));

    expect(mockOnChangeShowAnonymizedValues).toHaveBeenCalled();
  });

  it('disables anonymized values switch when no replacements', () => {
    const propsWithoutReplacements = {
      ...defaultProps,
      assistantResult: {
        aiResponse: 'Test AI response',
        replacements: {},
        summaryAsText: '{"user": "test-user"}',
      },
    };

    render(<EntityHighlightsSettings {...propsWithoutReplacements} />, {
      wrapper: TestProviders,
    });

    expect(screen.getByRole('switch')).toBeDisabled();
  });

  it('renders Ask AI Assistant menu item', () => {
    render(<EntityHighlightsSettings {...defaultProps} />, {
      wrapper: TestProviders,
    });

    expect(screen.getByText('Ask AI Assistant')).toBeInTheDocument();
  });

  it('shows assistant overlay and closes popover when Ask AI Assistant is clicked', async () => {
    render(<EntityHighlightsSettings {...defaultProps} />, {
      wrapper: TestProviders,
    });

    fireEvent.click(screen.getByLabelText('Ask AI Assistant'));

    await waitFor(() => {
      expect(mockShowAssistantOverlay).toHaveBeenCalled();
      expect(mockClosePopover).toHaveBeenCalled();
    });
  });

  it('disables Ask AI Assistant when loading', () => {
    render(<EntityHighlightsSettings {...defaultProps} isLoading={true} />, {
      wrapper: TestProviders,
    });

    expect(screen.getByLabelText('Ask AI Assistant')).toBeDisabled();
  });

  it('disables Ask AI Assistant when no assistant result', () => {
    render(<EntityHighlightsSettings {...defaultProps} assistantResult={null} />, {
      wrapper: TestProviders,
    });

    expect(screen.getByLabelText('Ask AI Assistant')).toBeDisabled();
  });

  it('enables Ask AI Assistant when assistant result exists and not loading', () => {
    render(<EntityHighlightsSettings {...defaultProps} isLoading={false} />, {
      wrapper: TestProviders,
    });

    expect(screen.getByLabelText('Ask AI Assistant')).not.toBeDisabled();
  });

  it('disables Ask AI Assistant when agent builder is enabled and no assistant result', () => {
    mockUseAgentBuilderAvailability.mockImplementation(() => ({
      isAgentBuilderEnabled: true,
      hasAgentBuilderPrivilege: true,
      isAgentChatExperienceEnabled: true,
      hasValidAgentBuilderLicense: true,
    }));

    render(<EntityHighlightsSettings {...defaultProps} assistantResult={null} />, {
      wrapper: TestProviders,
    });

    const agentButton = screen.getByTestId('newAgentBuilderAttachment');
    expect(agentButton).toBeDisabled();

    fireEvent.click(agentButton);
    expect(mockOpenAgentBuilderFlyout).not.toHaveBeenCalled();
  });

  it('enables Ask AI Assistant when agent builder is enabled and assistant result exists', () => {
    mockUseAgentBuilderAvailability.mockImplementation(() => ({
      isAgentBuilderEnabled: true,
      hasAgentBuilderPrivilege: true,
      isAgentChatExperienceEnabled: true,
      hasValidAgentBuilderLicense: true,
    }));

    render(<EntityHighlightsSettings {...defaultProps} isLoading={false} />, {
      wrapper: TestProviders,
    });
    const agentButton = screen.getByTestId('newAgentBuilderAttachment');

    expect(agentButton).not.toBeDisabled();

    fireEvent.click(agentButton);
    expect(mockOpenAgentBuilderFlyout).toHaveBeenCalled();
  });

  it('renders connector selector', async () => {
    render(<EntityHighlightsSettings {...defaultProps} />, {
      wrapper: TestProviders,
    });

    fireEvent.click(screen.getByTestId('entity-highlights-settings-connector'));

    await waitFor(() => {
      expect(screen.getByTestId('addNewConnectorButton')).toBeInTheDocument();
    });
  });

  it('disables settings button when loading', () => {
    render(<EntityHighlightsSettings {...defaultProps} isLoading={true} />, {
      wrapper: TestProviders,
    });

    expect(screen.getByLabelText('Entity highlights settings menu')).toBeDisabled();
  });

  it('shows checked switch when showAnonymizedValues is true', () => {
    render(<EntityHighlightsSettings {...defaultProps} showAnonymizedValues={true} />, {
      wrapper: TestProviders,
    });

    expect(screen.getByRole('switch')).toBeChecked();
  });

  it('shows unchecked switch when showAnonymizedValues is false', () => {
    render(<EntityHighlightsSettings {...defaultProps} showAnonymizedValues={false} />, {
      wrapper: TestProviders,
    });

    expect(screen.getByRole('switch')).not.toBeChecked();
  });

  it('renders the anonymization settings button', () => {
    render(<EntityHighlightsSettings {...defaultProps} />, {
      wrapper: TestProviders,
    });

    expect(screen.getByTestId('anonymizationSettings')).toBeInTheDocument();
  });

  it('opens the anonymization settings modal when the settings button is clicked', async () => {
    render(<EntityHighlightsSettings {...defaultProps} />, {
      wrapper: TestProviders,
    });

    await userEvent.click(screen.getByTestId('anonymizationSettings'));
    await waitFor(() =>
      expect(screen.getByTestId('anonymizationSettingsModal')).toBeInTheDocument()
    );
  });

  it('closes the anonymization settings modal when onClose is triggered', async () => {
    render(<EntityHighlightsSettings {...defaultProps} />, {
      wrapper: TestProviders,
    });

    await userEvent.click(screen.getByTestId('anonymizationSettings'));
    await waitFor(() => expect(screen.getByTestId('anonymizationSettingsModal')).toBeVisible());

    await userEvent.click(screen.getByTestId('closeAnonymizationSettingsModal'));
    await waitFor(() =>
      expect(screen.queryByTestId('anonymizationSettingsModal')).not.toBeInTheDocument()
    );
  });
});
