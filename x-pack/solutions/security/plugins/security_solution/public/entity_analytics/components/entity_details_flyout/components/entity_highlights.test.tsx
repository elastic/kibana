/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { EntityHighlightsAccordion } from './entity_highlights';
import type { EntityType } from '../../../../../common/search_strategy';
import { TestProviders } from '../../../../common/mock';

// Mock the hooks
const mockUseFetchAnonymizationFields = jest.fn();
const mockUseAssistantContext = jest.fn();
const mockUseLoadInferenceConnectors = jest.fn();
const mockUseSpaceId = jest.fn();
const mockUseStoredAssistantConnectorId = jest.fn();
const mockUseAssistantAvailability = jest.fn();
const mockUseAgentBuilderAvailability = jest.fn();
const mockUseFetchEntityDetailsHighlights = jest.fn();
const mockUseHasEntityHighlightsLicense = jest.fn();

jest.mock('@kbn/elastic-assistant', () => ({
  useAssistantContext: () => mockUseAssistantContext(),
  useFetchAnonymizationFields: () => mockUseFetchAnonymizationFields(),
  AssistantProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-test-subj="assistant-provider">{children}</div>
  ),
  ConnectorSelectorInline: () => <div data-test-subj="connector-selector-inline" />,
}));

jest.mock('@kbn/elastic-assistant/impl/assistant_context', () => ({
  useAssistantContextValue: jest.fn(() => ({
    http: { post: jest.fn() },
    settings: { client: { get: jest.fn() } },
  })),
}));

jest.mock('../../../../assistant/use_assistant_availability', () => ({
  useAssistantAvailability: () => mockUseAssistantAvailability(),
}));

jest.mock('../../../../agent_builder/hooks/use_agent_builder_availability', () => ({
  useAgentBuilderAvailability: () => mockUseAgentBuilderAvailability(),
}));

jest.mock('../../../../onboarding/components/hooks/use_stored_state', () => ({
  useStoredAssistantConnectorId: () => mockUseStoredAssistantConnectorId(),
}));

jest.mock('../../../../common/hooks/use_space_id', () => ({
  useSpaceId: () => mockUseSpaceId(),
}));

jest.mock('../hooks/use_fetch_entity_details_highlights', () => ({
  useFetchEntityDetailsHighlights: () => mockUseFetchEntityDetailsHighlights(),
}));

jest.mock('../../../../common/hooks/use_has_entity_highlights_license', () => ({
  useHasEntityHighlightsLicense: () => mockUseHasEntityHighlightsLicense(),
}));

jest.mock('../tabs/risk_inputs/use_ask_ai_assistant', () => ({
  useAskAiAssistant: () => ({
    showAssistantOverlay: jest.fn(),
  }),
}));

jest.mock('../../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn(() => false),
}));

jest.mock('../../../../agent_builder/hooks/use_agent_builder_attachment', () => ({
  useAgentBuilderAttachment: () => ({
    openAgentBuilderFlyout: jest.fn(),
  }),
}));

jest.mock('../hooks/use_inference_connectors', () => ({
  useLoadInferenceConnectors: () => mockUseLoadInferenceConnectors(),
}));

describe('EntityHighlights', () => {
  const defaultProps = {
    entityIdentifier: 'test-user',
    entityType: 'user' as EntityType,
  };

  const mockFetchEntityHighlights = jest.fn();

  const defaultAnonymizationFields = {
    data: {
      data: [
        {
          id: 'test-field',
          field: 'user.name',
          allowed: true,
          anonymized: false,
        },
      ],
    },
    isLoading: false,
  };
  const defaultAssistantContext = {
    http: { post: jest.fn() },
    settings: { client: { get: jest.fn() } },
  };
  const defaultLoadConnectors = {
    data: {
      hasConnectors: true,
      connectors: [
        {
          connectorId: 'connector-1',
          name: 'Test Connector',
          actionTypeId: '.gen-ai',
        },
      ],
    },
  };
  const defaultSpaceId = 'default';
  const defaultStoredAssistantConnectorId = ['connector-1', jest.fn()];
  const defaultAssistantAvailability = {
    hasAssistantPrivilege: true,
    hasConnectorsReadPrivilege: true,
    isAssistantVisible: true,
  };
  const defaultAgentBuilderAvailability = {
    hasAgentBuilderPrivilege: true,
  };
  const defaultFetchEntityDetailsHighlights = {
    fetchEntityHighlights: mockFetchEntityHighlights,
    isChatLoading: false,
    result: null,
    error: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up default mock implementations
    mockUseFetchAnonymizationFields.mockReturnValue(defaultAnonymizationFields);
    mockUseAssistantContext.mockReturnValue(defaultAssistantContext);
    mockUseLoadInferenceConnectors.mockReturnValue(defaultLoadConnectors);
    mockUseSpaceId.mockReturnValue(defaultSpaceId);
    mockUseStoredAssistantConnectorId.mockReturnValue(defaultStoredAssistantConnectorId);
    mockUseAssistantAvailability.mockReturnValue(defaultAssistantAvailability);
    mockUseAgentBuilderAvailability.mockReturnValue(defaultAgentBuilderAvailability);
    mockUseFetchEntityDetailsHighlights.mockReturnValue(defaultFetchEntityDetailsHighlights);
    mockUseHasEntityHighlightsLicense.mockReturnValue(true);
  });

  it('renders EntityHighlights with title and icon', () => {
    render(<EntityHighlightsAccordion {...defaultProps} />, {
      wrapper: TestProviders,
    });

    expect(screen.getByText('Entity summary')).toBeInTheDocument();
    expect(screen.getByTestId('asset-criticality-selector')).toBeInTheDocument();
  });

  it('returns null when user has insufficent license', () => {
    mockUseHasEntityHighlightsLicense.mockReturnValueOnce(false);

    render(<EntityHighlightsAccordion {...defaultProps} />, {
      wrapper: TestProviders,
    });

    expect(screen.queryByText('Entity summary')).not.toBeInTheDocument();
  });

  it('returns null when user has no assistant privilege or agent builder privilege', () => {
    mockUseAssistantAvailability.mockReturnValueOnce({
      hasAssistantPrivilege: false,
      hasConnectorsReadPrivilege: true,
      isAssistantVisible: false,
    });
    mockUseAgentBuilderAvailability.mockReturnValueOnce({
      hasAgentBuilderPrivilege: false,
    });

    render(<EntityHighlightsAccordion {...defaultProps} />, {
      wrapper: TestProviders,
    });

    expect(screen.queryByText('Entity summary')).not.toBeInTheDocument();
  });

  it('returns null when user has no connector read privilege', () => {
    mockUseAssistantAvailability.mockReturnValueOnce({
      hasAssistantPrivilege: true,
      isAssistantVisible: true,
      hasConnectorsReadPrivilege: false,
    });
    mockUseAgentBuilderAvailability.mockReturnValueOnce({
      hasAgentBuilderPrivilege: true,
    });

    render(<EntityHighlightsAccordion {...defaultProps} />, {
      wrapper: TestProviders,
    });

    expect(screen.queryByText('Entity summary')).not.toBeInTheDocument();
  });

  it('renders if user has assistant privilege and no agent builder privilege', () => {
    mockUseAssistantAvailability.mockReturnValueOnce({
      hasAssistantPrivilege: true,
      isAssistantVisible: true,
      hasConnectorsReadPrivilege: true,
    });
    mockUseAgentBuilderAvailability.mockReturnValueOnce({
      hasAgentBuilderPrivilege: false,
    });

    render(<EntityHighlightsAccordion {...defaultProps} />, {
      wrapper: TestProviders,
    });

    expect(screen.getByText('Entity summary')).toBeInTheDocument();
  });

  it('renders if user has agent builder privilege and no assistant privilege', () => {
    mockUseAssistantAvailability.mockReturnValueOnce({
      hasAssistantPrivilege: false,
      isAssistantVisible: false,
      hasConnectorsReadPrivilege: true,
    });
    mockUseAgentBuilderAvailability.mockReturnValueOnce({
      hasAgentBuilderPrivilege: true,
    });

    render(<EntityHighlightsAccordion {...defaultProps} />, {
      wrapper: TestProviders,
    });

    expect(screen.getByText('Entity summary')).toBeInTheDocument();
  });

  it(`shows "Add Connector" button when no assistant result, not loading and no connectors`, () => {
    mockUseLoadInferenceConnectors.mockReturnValueOnce({
      data: { hasConnectors: false, connectors: [] },
    });
    render(<EntityHighlightsAccordion {...defaultProps} />, {
      wrapper: TestProviders,
    });

    const addConnectorButton = screen.getByText('Add connector');
    expect(addConnectorButton).toBeInTheDocument();
    expect(addConnectorButton).not.toBeDisabled();
    expect(
      screen.getByText(
        'No AI connector is configured. Please configure an AI connector to generate a summary.'
      )
    ).toBeInTheDocument();
  });

  it(`shows "Generate" button when no assistant result and not loading when connectors are available`, () => {
    render(<EntityHighlightsAccordion {...defaultProps} />, {
      wrapper: TestProviders,
    });

    const generateButton = screen.getByText('Generate');
    expect(generateButton).toBeInTheDocument();
    expect(generateButton).not.toBeDisabled();
  });

  it('calls fetchEntityHighlights when generate button is clicked', () => {
    render(<EntityHighlightsAccordion {...defaultProps} />, {
      wrapper: TestProviders,
    });

    const generateButton = screen.getByText('Generate');
    fireEvent.click(generateButton);

    expect(mockFetchEntityHighlights).toHaveBeenCalled();
  });

  it('shows loading state with skeleton text and loading message', () => {
    mockUseFetchEntityDetailsHighlights.mockReturnValue({
      ...defaultFetchEntityDetailsHighlights,
      isChatLoading: true,
    });

    render(<EntityHighlightsAccordion {...defaultProps} />, {
      wrapper: TestProviders,
    });

    expect(screen.getByText(/Generating AI summary and recommended actions/i)).toBeInTheDocument();
    expect(screen.getByTestId('euiSkeletonLoadingAriaWrapper')).toBeInTheDocument();
  });

  it('shows AI response when assistant result is available and not loading', () => {
    const mockAssistantResult = {
      response: {
        highlights: [
          {
            title: 'Key Insights',
            text: 'User has high risk activity\n- Multiple failed login attempts',
          },
        ],
        recommendedActions: null,
      },
      replacements: { anonymized_user: 'test-user' },
      summaryAsText: '{"user": "test-user"}',
      generatedAt: Date.now(),
    };

    mockUseFetchEntityDetailsHighlights.mockReturnValue({
      ...defaultFetchEntityDetailsHighlights,
      result: mockAssistantResult,
    });

    render(<EntityHighlightsAccordion {...defaultProps} />, {
      wrapper: TestProviders,
    });

    expect(screen.getByText('Key Insights')).toBeInTheDocument();
    expect(screen.getByText('User has high risk activity', { exact: false })).toBeInTheDocument();
    expect(screen.queryByText('Generate')).not.toBeInTheDocument();
  });

  it('handles missing anonymization fields gracefully', () => {
    mockUseFetchAnonymizationFields.mockReturnValue({
      data: null,
      isLoading: false,
    });

    render(<EntityHighlightsAccordion {...defaultProps} />, {
      wrapper: TestProviders,
    });

    // Component should still render without errors
    expect(screen.getByText('Entity summary')).toBeInTheDocument();
  });

  it('shows dismissible error banner when error is present', () => {
    mockUseFetchEntityDetailsHighlights.mockReturnValue({
      ...defaultFetchEntityDetailsHighlights,
      error: new Error('LLM failed'),
    });

    render(<EntityHighlightsAccordion {...defaultProps} />, {
      wrapper: TestProviders,
    });

    expect(screen.getByText('Error generating summary')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Due to an unexpected issue, LLM could not generate the summary. Please try again.'
      )
    ).toBeInTheDocument();
    expect(screen.getByTestId('entity-highlights-error-banner')).toBeInTheDocument();
    expect(screen.getByText('Regenerate')).toBeInTheDocument();
    // Empty state should be hidden while the error banner is visible
    expect(screen.queryByText('Generate')).not.toBeInTheDocument();
  });

  it('hides error banner after dismiss', () => {
    mockUseFetchEntityDetailsHighlights.mockReturnValue({
      ...defaultFetchEntityDetailsHighlights,
      error: new Error('LLM failed'),
    });

    render(<EntityHighlightsAccordion {...defaultProps} />, {
      wrapper: TestProviders,
    });

    const callout = screen.getByTestId('entity-highlights-error-banner');
    expect(callout).toBeInTheDocument();
    fireEvent.click(within(callout).getByLabelText('Dismiss this callout'));

    expect(screen.queryByTestId('entity-highlights-error-banner')).not.toBeInTheDocument();
    // Empty state is visible again (generate button exists)
    expect(screen.getByText('Generate')).toBeInTheDocument();
  });

  it('shows error banner when a summary already exists', () => {
    const mockAssistantResult = {
      response: {
        highlights: [
          {
            title: 'Key Insights',
            text: 'Some summary text',
          },
        ],
        recommendedActions: null,
      },
      replacements: {},
      summaryAsText: '{"user": "test-user"}',
      generatedAt: Date.now(),
    };

    mockUseFetchEntityDetailsHighlights.mockReturnValue({
      ...defaultFetchEntityDetailsHighlights,
      result: mockAssistantResult,
      error: new Error('LLM failed'),
    });

    render(<EntityHighlightsAccordion {...defaultProps} />, {
      wrapper: TestProviders,
    });

    expect(screen.getByTestId('entity-highlights-error-banner')).toBeInTheDocument();
    expect(screen.getByText('Key Insights')).toBeInTheDocument();
  });

  it('calls fetchEntityHighlights when regenerate button is clicked', () => {
    mockUseFetchEntityDetailsHighlights.mockReturnValue({
      ...defaultFetchEntityDetailsHighlights,
      error: new Error('LLM failed'),
    });

    render(<EntityHighlightsAccordion {...defaultProps} />, {
      wrapper: TestProviders,
    });

    fireEvent.click(screen.getByText('Regenerate'));

    expect(mockFetchEntityHighlights).toHaveBeenCalled();
  });

  it('renders with custom space ID', () => {
    const customSpaceId = 'custom-space';
    mockUseSpaceId.mockReturnValue(customSpaceId);

    render(<EntityHighlightsAccordion {...defaultProps} />, {
      wrapper: TestProviders,
    });

    // Component should still render without errors
    expect(screen.getByText('Entity summary')).toBeInTheDocument();
  });

  it('handles null space ID', () => {
    mockUseSpaceId.mockReturnValue(null);

    render(<EntityHighlightsAccordion {...defaultProps} />, {
      wrapper: TestProviders,
    });

    // Component should still render without errors
    expect(screen.getByText('Entity summary')).toBeInTheDocument();
  });

  it('returns null when entity highlights license is not available', () => {
    mockUseHasEntityHighlightsLicense.mockReturnValue(false);

    render(<EntityHighlightsAccordion {...defaultProps} />, {
      wrapper: TestProviders,
    });

    expect(screen.queryByText('Entity summary')).not.toBeInTheDocument();
  });
});
