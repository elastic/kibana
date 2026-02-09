/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { useUiSetting$ } from '@kbn/kibana-react-plugin/public';
import { AiInsight } from './ai_insight';
import { useKibana } from '../../hooks/use_kibana';
import { useLicense } from '../../hooks/use_license';
import { useGenAIConnectors } from '../../hooks/use_genai_connectors';
import { useStreamingAiInsight } from '../../hooks/use_streaming_ai_insight';
import { OBSERVABILITY_AGENT_ID } from '../../../common/constants';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useUiSetting$: jest.fn(),
}));

jest.mock('../../hooks/use_kibana');
jest.mock('../../hooks/use_license');
jest.mock('../../hooks/use_genai_connectors');
jest.mock('../../hooks/use_streaming_ai_insight');

const mockUseUiSetting$ = useUiSetting$ as jest.Mock;
const mockUseKibana = useKibana as jest.Mock;
const mockUseLicense = useLicense as jest.Mock;
const mockUseGenAIConnectors = useGenAIConnectors as jest.Mock;
const mockUseStreamingAiInsight = useStreamingAiInsight as jest.Mock;
const mockCreateStream = jest.fn();
const AiInsightTest = AiInsight as React.ComponentType<any>;

const renderComponent = () =>
  render(
    <EuiThemeProvider>
      <AiInsightTest
        title="AI Insight"
        createStream={mockCreateStream}
        buildAttachments={jest.fn().mockReturnValue([])}
      />
    </EuiThemeProvider>
  );

const mockOpenConversationFlyout = jest.fn();

const baseStreamingState = () => ({
  isLoading: false,
  error: undefined as string | undefined,
  summary: '',
  context: '',
  wasStopped: false,
  fetch: jest.fn(),
  stop: jest.fn(),
  regenerate: jest.fn(),
});

const createStreamingState = (overrides: Partial<ReturnType<typeof baseStreamingState>> = {}) => ({
  ...baseStreamingState(),
  ...overrides,
});

describe('AiInsight', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseUiSetting$.mockReturnValue([AIChatExperience.Agent]);
    mockUseKibana.mockReturnValue({
      services: {
        agentBuilder: {
          openConversationFlyout: mockOpenConversationFlyout,
        },
        application: {
          capabilities: {
            agentBuilder: { show: true },
          },
        },
      },
    });
    mockUseLicense.mockReturnValue({
      getLicense: () => ({
        hasAtLeast: () => true,
      }),
    });
    mockUseGenAIConnectors.mockReturnValue({
      hasConnectors: true,
    });
    mockUseStreamingAiInsight.mockReturnValue(createStreamingState());
  });

  it('fetches insights when the accordion is opened', () => {
    const fetch = jest.fn();
    mockUseStreamingAiInsight.mockReturnValue(createStreamingState({ fetch }));

    const { container, unmount } = renderComponent();
    const toggle = container.querySelector('[data-test-subj="agentBuilderAiInsight"]');

    expect(toggle).toBeTruthy();
    fireEvent.click(toggle!);

    expect(fetch).toHaveBeenCalledTimes(1);
    unmount();
  });

  describe('when an error occurs', () => {
    it('displays an error banner with error message', () => {
      mockUseStreamingAiInsight.mockReturnValue(createStreamingState({ error: 'Boom' }));

      const { container, getByText, unmount } = renderComponent();
      const toggle = container.querySelector('[data-test-subj="agentBuilderAiInsight"]');
      fireEvent.click(toggle!);

      const errorBanner = container.querySelector('[data-test-subj="AiInsightErrorBanner"]');
      expect(errorBanner).toBeTruthy();

      expect(getByText('Failed to generate AI insight')).toBeTruthy();
      expect(getByText('The AI insight could not be generated: Boom')).toBeTruthy();

      const retryButton = container.querySelector(
        '[data-test-subj="AiInsightErrorBannerRetryButton"]'
      );
      expect(retryButton).toBeTruthy();

      unmount();
    });

    it('refetches insights when retry button is clicked', () => {
      const fetch = jest.fn();
      mockUseStreamingAiInsight.mockReturnValue(createStreamingState({ error: 'Boom', fetch }));

      const { container, unmount } = renderComponent();
      const toggle = container.querySelector('[data-test-subj="agentBuilderAiInsight"]');
      fireEvent.click(toggle!);

      const retryButton = container.querySelector(
        '[data-test-subj="AiInsightErrorBannerRetryButton"]'
      );
      fireEvent.click(retryButton!);

      expect(fetch).toHaveBeenCalledTimes(1);

      unmount();
    });
  });

  describe('when a summary has been generated', () => {
    it('displays start conversation button', () => {
      mockUseStreamingAiInsight.mockReturnValue(
        createStreamingState({ summary: 'Hello world', context: 'context' })
      );

      const { container, unmount } = renderComponent();
      const toggle = container.querySelector('[data-test-subj="agentBuilderAiInsight"]');
      fireEvent.click(toggle!);

      const startConversationButton = container.querySelector(
        '[data-test-subj="aiAgentStartConversationButton"]'
      );

      expect(startConversationButton).toBeTruthy();

      unmount();
    });

    it('opens the conversation flyout with correct attachments when start conversation is clicked', () => {
      const buildAttachments = jest.fn().mockReturnValue([{ type: 'test', data: {} }]);
      mockUseStreamingAiInsight.mockReturnValue(
        createStreamingState({ summary: 'Hello world', context: 'context' })
      );

      const { container, unmount } = render(
        <EuiThemeProvider>
          <AiInsightTest
            title="AI Insight"
            createStream={mockCreateStream}
            buildAttachments={buildAttachments}
          />
        </EuiThemeProvider>
      );

      const toggle = container.querySelector('[data-test-subj="agentBuilderAiInsight"]');
      fireEvent.click(toggle!);

      const startConversationButton = container.querySelector(
        '[data-test-subj="aiAgentStartConversationButton"]'
      );
      fireEvent.click(startConversationButton!);

      expect(buildAttachments).toHaveBeenCalledWith('Hello world', 'context');
      expect(mockOpenConversationFlyout).toHaveBeenCalledWith({
        newConversation: true,
        attachments: [{ type: 'test', data: {} }],
        agentId: OBSERVABILITY_AGENT_ID,
      });

      unmount();
    });
  });

  it('shows regenerate button after stream is stopped', () => {
    const regenerate = jest.fn();
    mockUseStreamingAiInsight.mockReturnValue(
      createStreamingState({ summary: 'Partial response', wasStopped: true, regenerate })
    );

    const { container, unmount } = renderComponent();

    const toggle = container.querySelector('[data-test-subj="agentBuilderAiInsight"]');
    fireEvent.click(toggle!);

    const regenerateButton = container.querySelector(
      '[data-test-subj="observabilityAgentBuilderRegenerateButton"]'
    );
    expect(regenerateButton).toBeTruthy();

    fireEvent.click(regenerateButton!);
    expect(regenerate).toHaveBeenCalledTimes(1);

    unmount();
  });
});
