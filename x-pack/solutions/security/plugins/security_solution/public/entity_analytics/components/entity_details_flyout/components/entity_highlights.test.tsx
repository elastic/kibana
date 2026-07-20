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
const mockUseMaybeAssistantContext = jest.fn();
const mockUseLoadConnectors = jest.fn();
const mockUseSpaceId = jest.fn();
const mockUseStoredAssistantConnectorId = jest.fn();
const mockUseAssistantAvailability = jest.fn();
const mockUseAgentBuilderAvailability = jest.fn();
const mockUseFetchEntityDetailsHighlights = jest.fn();
const mockUseFetchPersistedAiSummary = jest.fn();
const mockUseHasEntityHighlightsLicense = jest.fn();

jest.mock('@kbn/elastic-assistant', () => ({
  useAssistantContext: () => mockUseAssistantContext(),
  useMaybeAssistantContext: () => mockUseMaybeAssistantContext(),
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

jest.mock('../hooks/use_fetch_persisted_ai_summary', () => ({
  useFetchPersistedAiSummary: () => mockUseFetchPersistedAiSummary(),
}));

jest.mock('../../../../common/hooks/use_has_entity_highlights_license', () => ({
  useHasEntityHighlightsLicense: () => mockUseHasEntityHighlightsLicense(),
}));

jest.mock('@kbn/inference-connectors', () => ({
  useLoadConnectors: () => mockUseLoadConnectors(),
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
    data: [
      {
        id: 'connector-1',
        name: 'Test Connector',
        actionTypeId: '.gen-ai',
      },
    ],
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
    isGeneratingSummary: false,
    result: null,
    error: null,
  };

  const createAssistantResult = (overrides?: {
    title?: string;
    text?: string;
    generatedAt?: number;
    generatedBy?: string;
  }) => ({
    response: {
      highlights: [
        {
          title: overrides?.title ?? 'Key Insights',
          text: overrides?.text ?? 'User has high risk activity',
        },
      ],
      recommended_actions: null,
    },
    replacements: {},
    summaryAsText: '',
    generatedAt: overrides?.generatedAt ?? Date.now(),
    generatedBy: overrides?.generatedBy ?? 'test_user',
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseFetchAnonymizationFields.mockReturnValue(defaultAnonymizationFields);
    mockUseAssistantContext.mockReturnValue(defaultAssistantContext);
    mockUseMaybeAssistantContext.mockReturnValue(defaultAssistantContext);
    mockUseLoadConnectors.mockReturnValue(defaultLoadConnectors);
    mockUseSpaceId.mockReturnValue(defaultSpaceId);
    mockUseStoredAssistantConnectorId.mockReturnValue(defaultStoredAssistantConnectorId);
    mockUseAssistantAvailability.mockReturnValue(defaultAssistantAvailability);
    mockUseAgentBuilderAvailability.mockReturnValue(defaultAgentBuilderAvailability);
    mockUseFetchEntityDetailsHighlights.mockReturnValue(defaultFetchEntityDetailsHighlights);
    mockUseFetchPersistedAiSummary.mockReturnValue({
      summary: null,
      canRead: true,
      isLoading: false,
      isFetching: false,
      refetch: jest.fn(),
    });
    mockUseHasEntityHighlightsLicense.mockReturnValue(true);
  });

  it('renders EntityHighlights with title and icon', () => {
    render(<EntityHighlightsAccordion {...defaultProps} />, {
      wrapper: TestProviders,
    });

    expect(screen.getByText('Entity summary')).toBeInTheDocument();
    expect(screen.getByTestId('asset-criticality-selector')).toBeInTheDocument();
  });

  it('hides the section when user has insufficient license', () => {
    mockUseHasEntityHighlightsLicense.mockReturnValueOnce(false);

    render(<EntityHighlightsAccordion {...defaultProps} />, {
      wrapper: TestProviders,
    });

    expect(screen.queryByText('Entity summary')).not.toBeInTheDocument();
  });

  it('hides the section when rendered outside AssistantProvider (no assistant context)', () => {
    mockUseMaybeAssistantContext.mockReturnValueOnce(undefined);

    render(<EntityHighlightsAccordion {...defaultProps} />, {
      wrapper: TestProviders,
    });

    expect(screen.queryByText('Entity summary')).not.toBeInTheDocument();
  });

  it('hides the section when user does not have privileges to generate a summary and no summary exists', () => {
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

  it('hides the section when user has no connector read privilege and no persisted summary', () => {
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

  it('shows a read-only persisted summary when the user lacks generation privileges but has read access to the summary', () => {
    mockUseAssistantAvailability.mockReturnValue({
      hasAssistantPrivilege: false,
      hasConnectorsReadPrivilege: false,
      isAssistantVisible: false,
    });
    mockUseAgentBuilderAvailability.mockReturnValue({
      hasAgentBuilderPrivilege: false,
    });

    const mockAssistantResult = createAssistantResult({
      text: 'Persisted summary visible to read-only users',
    });

    mockUseFetchPersistedAiSummary.mockReturnValue({
      summary: {
        highlights: mockAssistantResult.response.highlights,
        recommended_actions: null,
        generated_at: mockAssistantResult.generatedAt,
        generated_by: mockAssistantResult.generatedBy,
      },
      canRead: true,
      isLoading: false,
      isFetching: false,
      refetch: jest.fn(),
    });
    mockUseFetchEntityDetailsHighlights.mockReturnValue({
      ...defaultFetchEntityDetailsHighlights,
      result: mockAssistantResult,
    });

    render(<EntityHighlightsAccordion {...defaultProps} />, {
      wrapper: TestProviders,
    });

    expect(screen.getByText('Entity summary')).toBeInTheDocument();
    expect(screen.getByText('Key Insights')).toBeInTheDocument();
    expect(
      screen.getByText('Persisted summary visible to read-only users', { exact: false })
    ).toBeInTheDocument();
    expect(screen.getByText(/Generated by/)).toBeInTheDocument();
    expect(screen.getByText('test_user')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Generate' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Regenerate summary')).not.toBeInTheDocument();
  });

  it('shows the Generate card when the user can generate but cannot read the metadata index', () => {
    mockUseFetchPersistedAiSummary.mockReturnValue({
      summary: null,
      canRead: false,
      isLoading: false,
      isFetching: false,
      refetch: jest.fn(),
    });

    render(<EntityHighlightsAccordion {...defaultProps} />, {
      wrapper: TestProviders,
    });

    expect(screen.getByText('Entity summary')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate' })).toBeInTheDocument();
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
    mockUseLoadConnectors.mockReturnValueOnce({ data: [] });
    render(<EntityHighlightsAccordion {...defaultProps} />, {
      wrapper: TestProviders,
    });

    const addConnectorButton = screen.getByRole('button', { name: 'Add connector' });
    expect(addConnectorButton).toBeInTheDocument();
    expect(addConnectorButton).not.toBeDisabled();
    expect(
      screen.getByText(
        'No AI connector is configured. Please configure an AI connector to generate a summary.'
      )
    ).toBeInTheDocument();
  });

  it('shows Generate button and calls fetchEntityHighlights when clicked', () => {
    render(<EntityHighlightsAccordion {...defaultProps} />, {
      wrapper: TestProviders,
    });

    const generateButton = screen.getByRole('button', { name: 'Generate' });
    expect(generateButton).toBeInTheDocument();
    expect(generateButton).not.toBeDisabled();

    fireEvent.click(generateButton);

    expect(mockFetchEntityHighlights).toHaveBeenCalled();
  });

  it('shows generating skeleton when chat is loading and there is no result yet', () => {
    mockUseFetchEntityDetailsHighlights.mockReturnValue({
      ...defaultFetchEntityDetailsHighlights,
      isGeneratingSummary: true,
    });

    render(<EntityHighlightsAccordion {...defaultProps} />, {
      wrapper: TestProviders,
    });

    expect(screen.getByText(/Generating AI summary and recommended actions/i)).toBeInTheDocument();
  });

  it('shows loading summary skeleton while the persisted summary is fetched', () => {
    mockUseFetchPersistedAiSummary.mockReturnValue({
      summary: null,
      canRead: true,
      isLoading: true,
      isFetching: true,
      refetch: jest.fn(),
    });

    render(<EntityHighlightsAccordion {...defaultProps} />, {
      wrapper: TestProviders,
    });

    expect(
      screen.getByRole('progressbar', { name: /loading entity summary/i })
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Generate' })).not.toBeInTheDocument();
  });

  it('keeps content mounted and shows a progress bar while the persisted summary refetches', () => {
    const mockAssistantResult = createAssistantResult({
      text: 'Summary stays visible during background refetch',
    });

    mockUseFetchPersistedAiSummary.mockReturnValue({
      summary: {
        highlights: mockAssistantResult.response.highlights,
        recommended_actions: null,
        generated_at: mockAssistantResult.generatedAt,
        generated_by: mockAssistantResult.generatedBy,
      },
      canRead: true,
      isLoading: false,
      isFetching: true,
      refetch: jest.fn(),
    });
    mockUseFetchEntityDetailsHighlights.mockReturnValue({
      ...defaultFetchEntityDetailsHighlights,
      result: mockAssistantResult,
    });

    render(<EntityHighlightsAccordion {...defaultProps} />, {
      wrapper: TestProviders,
    });

    expect(screen.getByText('Key Insights')).toBeInTheDocument();
    expect(screen.getByTestId('entity-highlights-refresh-progress')).toBeInTheDocument();
  });

  it('replaces content with the generating skeleton while regenerating', () => {
    const mockAssistantResult = createAssistantResult({
      text: 'Previous summary is replaced during regeneration',
    });

    mockUseFetchEntityDetailsHighlights.mockReturnValue({
      ...defaultFetchEntityDetailsHighlights,
      result: mockAssistantResult,
      isGeneratingSummary: true,
    });

    render(<EntityHighlightsAccordion {...defaultProps} />, {
      wrapper: TestProviders,
    });

    expect(screen.queryByText('Key Insights')).not.toBeInTheDocument();
    expect(screen.getByText(/Generating AI summary and recommended actions/i)).toBeInTheDocument();
    expect(screen.queryByTestId('entity-highlights-refresh-progress')).not.toBeInTheDocument();
  });

  it('keeps content mounted while anonymization fields are refetching', () => {
    const mockAssistantResult = createAssistantResult({
      text: 'Summary should not disappear when anonymization refetches',
    });

    mockUseFetchEntityDetailsHighlights.mockReturnValue({
      ...defaultFetchEntityDetailsHighlights,
      result: mockAssistantResult,
    });
    mockUseFetchAnonymizationFields.mockReturnValue({
      ...defaultAnonymizationFields,
      isLoading: true,
    });

    render(<EntityHighlightsAccordion {...defaultProps} />, {
      wrapper: TestProviders,
    });

    expect(screen.getByText('Key Insights')).toBeInTheDocument();
    expect(screen.queryByText(/Generating AI summary/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('progressbar', { name: /loading entity summary/i })
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('entity-highlights-refresh-progress')).not.toBeInTheDocument();
  });

  it('handles missing anonymization fields gracefully', () => {
    mockUseFetchAnonymizationFields.mockReturnValue({
      data: null,
      isLoading: false,
    });

    render(<EntityHighlightsAccordion {...defaultProps} />, {
      wrapper: TestProviders,
    });

    // Falls back to an empty anonymization list (`?? []`) and still offers generation.
    expect(screen.getByText('Entity summary')).toBeInTheDocument();
    const generateButton = screen.getByRole('button', { name: 'Generate' });
    expect(generateButton).toBeEnabled();
    fireEvent.click(generateButton);
    expect(mockFetchEntityHighlights).toHaveBeenCalled();
  });

  it('shows AI response when assistant result is available', () => {
    const mockAssistantResult = createAssistantResult({
      text: 'User has high risk activity\n- Multiple failed login attempts',
    });

    mockUseFetchEntityDetailsHighlights.mockReturnValue({
      ...defaultFetchEntityDetailsHighlights,
      result: {
        ...mockAssistantResult,
        replacements: { anonymized_user: 'test-user' },
        summaryAsText: '{"user": "test-user"}',
      },
    });

    render(<EntityHighlightsAccordion {...defaultProps} />, {
      wrapper: TestProviders,
    });

    expect(screen.getByText('Key Insights')).toBeInTheDocument();
    expect(screen.getByText('User has high risk activity', { exact: false })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Generate' })).not.toBeInTheDocument();
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
    expect(screen.getByRole('button', { name: 'Regenerate' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Generate' })).not.toBeInTheDocument();
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
    expect(screen.getByRole('button', { name: 'Generate' })).toBeInTheDocument();
  });

  it('shows error banner when a summary already exists', () => {
    const mockAssistantResult = createAssistantResult({ text: 'Some summary text' });

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

    fireEvent.click(screen.getByRole('button', { name: 'Regenerate' }));

    expect(mockFetchEntityHighlights).toHaveBeenCalled();
  });
});
