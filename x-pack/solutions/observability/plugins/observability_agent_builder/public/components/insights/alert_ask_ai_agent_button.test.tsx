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
import { OBSERVABILITY_ALERT_ATTACHMENT_TYPE_ID } from '../../../common';
import { AlertAskAiAgentButton } from './alert_ask_ai_agent_button';
import { useKibana } from '../../hooks/use_kibana';
import { useLicense } from '../../hooks/use_license';
import { useGenAIConnectors } from '../../hooks/use_genai_connectors';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useUiSetting$: jest.fn(),
}));

jest.mock('../../hooks/use_kibana');
jest.mock('../../hooks/use_license');
jest.mock('../../hooks/use_genai_connectors');

const mockUseUiSetting$ = useUiSetting$ as jest.Mock;
const mockUseKibana = useKibana as jest.Mock;
const mockUseLicense = useLicense as jest.Mock;
const mockUseGenAIConnectors = useGenAIConnectors as jest.Mock;

const mockOpenChat = jest.fn();

const setupMocks = ({
  hasEnterpriseLicense = true,
  hasConnectors = true,
  isAgentExperience = true,
  hasCapability = true,
  hasAgentBuilder = true,
}: {
  hasEnterpriseLicense?: boolean;
  hasConnectors?: boolean;
  isAgentExperience?: boolean;
  hasCapability?: boolean;
  hasAgentBuilder?: boolean;
} = {}) => {
  mockUseLicense.mockReturnValue({
    hasAtLeast: (level: string) => (level === 'enterprise' ? hasEnterpriseLicense : false),
  });

  mockUseUiSetting$.mockReturnValue([
    isAgentExperience ? AIChatExperience.Agent : AIChatExperience.Classic,
  ]);

  mockUseGenAIConnectors.mockReturnValue({ hasConnectors });

  mockUseKibana.mockReturnValue({
    services: {
      agentBuilder: hasAgentBuilder ? { openChat: mockOpenChat } : undefined,
      application: {
        capabilities: {
          agentBuilder: { show: hasCapability },
        },
      },
    },
  });
};

const renderButton = (props = {}) =>
  render(
    <EuiThemeProvider>
      <AlertAskAiAgentButton alertId="alert-123" alertTitle="CPU threshold" {...props} />
    </EuiThemeProvider>
  );

describe('AlertAskAiAgentButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the button when all guard conditions are met', () => {
    setupMocks();
    const { getByTestId } = renderButton();
    expect(getByTestId('alertAskAiAgentButton')).toBeInTheDocument();
  });

  it('calls agentBuilder.openChat with alert attachment and initial message on click', () => {
    setupMocks();
    const { getByTestId } = renderButton();

    fireEvent.click(getByTestId('alertAskAiAgentButton'));

    expect(mockOpenChat).toHaveBeenCalledWith(
      expect.objectContaining({
        newConversation: true,
        initialMessage: 'Investigate this alert',
        autoSendInitialMessage: true,
        attachments: expect.arrayContaining([
          expect.objectContaining({
            id: 'alert-123',
            type: OBSERVABILITY_ALERT_ATTACHMENT_TYPE_ID,
            data: expect.objectContaining({
              alertId: 'alert-123',
              attachmentLabel: expect.stringContaining('CPU threshold'),
            }),
          }),
        ]),
      })
    );
  });

  it('returns null when enterprise license is missing', () => {
    setupMocks({ hasEnterpriseLicense: false });
    const { queryByTestId } = renderButton();
    expect(queryByTestId('alertAskAiAgentButton')).not.toBeInTheDocument();
  });

  it('returns null when no GenAI connectors are configured', () => {
    setupMocks({ hasConnectors: false });
    const { queryByTestId } = renderButton();
    expect(queryByTestId('alertAskAiAgentButton')).not.toBeInTheDocument();
  });

  it('returns null when chat experience is not set to agent', () => {
    setupMocks({ isAgentExperience: false });
    const { queryByTestId } = renderButton();
    expect(queryByTestId('alertAskAiAgentButton')).not.toBeInTheDocument();
  });

  it('returns null when agentBuilder capability is not present', () => {
    setupMocks({ hasCapability: false });
    const { queryByTestId } = renderButton();
    expect(queryByTestId('alertAskAiAgentButton')).not.toBeInTheDocument();
  });

  it('returns null when agentBuilder plugin is not available', () => {
    setupMocks({ hasAgentBuilder: false });
    const { queryByTestId } = renderButton();
    expect(queryByTestId('alertAskAiAgentButton')).not.toBeInTheDocument();
  });

  it('omits attachmentLabel from the payload when alertTitle is not provided', () => {
    setupMocks();
    const { getByTestId } = render(
      <EuiThemeProvider>
        <AlertAskAiAgentButton alertId="alert-123" />
      </EuiThemeProvider>
    );

    fireEvent.click(getByTestId('alertAskAiAgentButton'));

    expect(mockOpenChat).toHaveBeenCalledWith(
      expect.objectContaining({
        attachments: expect.arrayContaining([
          expect.objectContaining({
            id: 'alert-123',
            type: OBSERVABILITY_ALERT_ATTACHMENT_TYPE_ID,
            data: { alertId: 'alert-123' },
          }),
        ]),
      })
    );
    const [call] = mockOpenChat.mock.calls;
    expect(call[0].attachments[0].data).not.toHaveProperty('attachmentLabel');
  });

  it('renders the button but click is silent when agentBuilder has no openChat method', () => {
    mockUseLicense.mockReturnValue({
      hasAtLeast: () => true,
    });
    mockUseUiSetting$.mockReturnValue([AIChatExperience.Agent]);
    mockUseGenAIConnectors.mockReturnValue({ hasConnectors: true });
    mockUseKibana.mockReturnValue({
      services: {
        agentBuilder: {},
        application: { capabilities: { agentBuilder: { show: true } } },
      },
    });

    const { getByTestId } = renderButton();
    fireEvent.click(getByTestId('alertAskAiAgentButton'));
    expect(mockOpenChat).not.toHaveBeenCalled();
  });
});
