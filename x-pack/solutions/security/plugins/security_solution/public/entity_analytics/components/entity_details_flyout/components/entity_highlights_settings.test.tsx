/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EntityHighlightsSettings } from './entity_highlights_settings';
import { TestProviders } from '../../../../common/mock';

const mockShowAssistantOverlay = jest.fn();
const mockOnRegenerate = jest.fn();
const mockOnChangeShowAnonymizedValues = jest.fn();
const mockSetConnectorId = jest.fn();
const mockClosePopover = jest.fn();
const mockOpenPopover = jest.fn();

jest.mock('../tabs/risk_inputs/use_ask_ai_assistant', () => ({
  useAskAiAssistant: () => ({
    showAssistantOverlay: mockShowAssistantOverlay,
  }),
}));

describe('EntityHighlightsSettings', () => {
  const defaultProps = {
    onRegenerate: mockOnRegenerate,
    showAnonymizedValues: false,
    onChangeShowAnonymizedValues: mockOnChangeShowAnonymizedValues,
    setConnectorId: mockSetConnectorId,
    connectorId: 'test-connector',
    entityType: 'user',
    entityIdentifier: 'test-user',
    assistantResult: {
      aiResponse: 'Test AI response',
      replacements: { anonymized_user: 'test-user' },
      formattedEntitySummary: '{"user": "test-user"}',
    },
    closePopover: mockClosePopover,
    openPopover: mockOpenPopover,
    isLoading: false,
    isPopoverOpen: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
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

  it('renders regenerate menu item', () => {
    render(<EntityHighlightsSettings {...defaultProps} />, {
      wrapper: TestProviders,
    });

    expect(screen.getByText('Regenerate')).toBeInTheDocument();
  });

  it('calls onRegenerate when regenerate is clicked', () => {
    render(<EntityHighlightsSettings {...defaultProps} />, {
      wrapper: TestProviders,
    });

    fireEvent.click(screen.getByLabelText('Regenerate'));
    expect(mockOnRegenerate).toHaveBeenCalled();
  });

  it('disables regenerate button when loading', () => {
    render(<EntityHighlightsSettings {...defaultProps} isLoading={true} />, {
      wrapper: TestProviders,
    });

    expect(screen.getByLabelText('Regenerate')).toBeDisabled();
  });

  it('disables regenerate button when no assistant result', () => {
    render(<EntityHighlightsSettings {...defaultProps} assistantResult={null} />, {
      wrapper: TestProviders,
    });

    expect(screen.getByLabelText('Regenerate')).toBeDisabled();
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
        formattedEntitySummary: '{"user": "test-user"}',
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

  it('renders connector selector', () => {
    render(<EntityHighlightsSettings {...defaultProps} />, {
      wrapper: TestProviders,
    });

    expect(screen.getByTestId('addNewConnectorButton')).toBeInTheDocument();
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
});
