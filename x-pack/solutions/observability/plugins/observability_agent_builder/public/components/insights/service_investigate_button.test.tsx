/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { OBSERVABILITY_SERVICE_ATTACHMENT_TYPE_ID } from '../../../common';
import { ServiceInvestigateButton } from './service_investigate_button';
import { useKibana } from '../../hooks/use_kibana';
import { useLicense } from '../../hooks/use_license';
import { useGenAIConnectors } from '../../hooks/use_genai_connectors';

jest.mock('../../hooks/use_kibana');
jest.mock('../../hooks/use_license');
jest.mock('../../hooks/use_genai_connectors');

const mockUseUiSetting$ = jest.fn();
jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useUiSetting$: () => mockUseUiSetting$(),
}));

const mockUseKibana = useKibana as jest.Mock;
const mockUseLicense = useLicense as jest.Mock;
const mockUseGenAIConnectors = useGenAIConnectors as jest.Mock;

const BUTTON_SELECTOR = 'observabilityAgentBuilderServiceInvestigateButton';

const openChat = jest.fn();

const DEFAULT_PROPS = {
  serviceName: 'checkout',
  environment: 'production',
  start: 'now-15m',
  end: 'now',
};

interface Overrides {
  hasConnectors?: boolean;
  hasAgentBuilder?: boolean;
  chatExperience?: AIChatExperience;
  hasCapability?: boolean;
  hasEnterpriseLicense?: boolean;
}

function setup({
  hasConnectors = true,
  hasAgentBuilder = true,
  chatExperience = AIChatExperience.Agent,
  hasCapability = true,
  hasEnterpriseLicense = true,
}: Overrides = {}) {
  mockUseGenAIConnectors.mockReturnValue({ hasConnectors });
  mockUseUiSetting$.mockReturnValue([chatExperience]);
  mockUseLicense.mockReturnValue({
    getLicense: () => ({
      hasAtLeast: (tier: string) => (tier === 'enterprise' ? hasEnterpriseLicense : true),
    }),
  });
  mockUseKibana.mockReturnValue({
    services: {
      agentBuilder: hasAgentBuilder ? { openChat } : undefined,
      application: { capabilities: { agentBuilder: { show: hasCapability } } },
    },
  });

  return render(
    <EuiThemeProvider>
      <ServiceInvestigateButton {...DEFAULT_PROPS} />
    </EuiThemeProvider>
  );
}

describe('ServiceInvestigateButton', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders when all guard conditions pass', () => {
    setup();
    expect(screen.getByTestId(BUTTON_SELECTOR)).toBeInTheDocument();
  });

  it.each([
    ['no GenAI connectors', { hasConnectors: false }],
    ['no agentBuilder service', { hasAgentBuilder: false }],
    ['chat experience is not Agent', { chatExperience: AIChatExperience.Classic }],
    ['no agentBuilder capability', { hasCapability: false }],
    ['no enterprise license', { hasEnterpriseLicense: false }],
  ])('renders nothing when %s', (_label, overrides) => {
    setup(overrides as Overrides);
    expect(screen.queryByTestId(BUTTON_SELECTOR)).not.toBeInTheDocument();
  });

  it('opens the agent chat with all required service attachment fields on click', () => {
    setup();
    fireEvent.click(screen.getByTestId(BUTTON_SELECTOR));

    expect(openChat).toHaveBeenCalledTimes(1);
    expect(openChat).toHaveBeenCalledWith(
      expect.objectContaining({
        newConversation: true,
        autoSendInitialMessage: true,
        initialMessage: "What's wrong with this service?",
        attachments: [
          {
            type: OBSERVABILITY_SERVICE_ATTACHMENT_TYPE_ID,
            data: {
              serviceName: 'checkout',
              environment: 'production',
              // start and end are required by the observability.service attachment schema —
              // their absence causes a Bad Request at validateAttachmentsIfProvided.
              start: 'now-15m',
              end: 'now',
            },
          },
        ],
      })
    );
  });

  it('includes start and end in the attachment data (schema regression)', () => {
    // This test exists specifically to prevent the regression where start/end were
    // omitted from the openChat attachment, causing a Zod validation failure at runtime.
    setup();
    fireEvent.click(screen.getByTestId(BUTTON_SELECTOR));

    const call = openChat.mock.calls[0][0];
    const attachmentData = call.attachments[0].data;
    expect(attachmentData.start).toBe('now-15m');
    expect(attachmentData.end).toBe('now');
  });

  it('uses the default prompt when none is provided', () => {
    setup();
    fireEvent.click(screen.getByTestId(BUTTON_SELECTOR));
    expect(openChat).toHaveBeenCalledWith(
      expect.objectContaining({ initialMessage: "What's wrong with this service?" })
    );
  });

  it('uses a custom prompt when provided', () => {
    mockUseGenAIConnectors.mockReturnValue({ hasConnectors: true });
    mockUseUiSetting$.mockReturnValue([AIChatExperience.Agent]);
    mockUseLicense.mockReturnValue({ getLicense: () => ({ hasAtLeast: () => true }) });
    mockUseKibana.mockReturnValue({
      services: {
        agentBuilder: { openChat },
        application: { capabilities: { agentBuilder: { show: true } } },
      },
    });

    render(
      <EuiThemeProvider>
        <ServiceInvestigateButton
          serviceName="payment"
          start="now-30m"
          end="now"
          prompt="Why is this service erroring?"
        />
      </EuiThemeProvider>
    );

    fireEvent.click(screen.getByTestId(BUTTON_SELECTOR));
    expect(openChat).toHaveBeenCalledWith(
      expect.objectContaining({ initialMessage: 'Why is this service erroring?' })
    );
  });

  it('omits environment from attachment data when not provided', () => {
    mockUseGenAIConnectors.mockReturnValue({ hasConnectors: true });
    mockUseUiSetting$.mockReturnValue([AIChatExperience.Agent]);
    mockUseLicense.mockReturnValue({ getLicense: () => ({ hasAtLeast: () => true }) });
    mockUseKibana.mockReturnValue({
      services: {
        agentBuilder: { openChat },
        application: { capabilities: { agentBuilder: { show: true } } },
      },
    });

    render(
      <EuiThemeProvider>
        <ServiceInvestigateButton serviceName="payment" start="now-15m" end="now" />
      </EuiThemeProvider>
    );

    fireEvent.click(screen.getByTestId(BUTTON_SELECTOR));
    const attachmentData = openChat.mock.calls[0][0].attachments[0].data;
    expect(attachmentData.environment).toBeUndefined();
    expect(attachmentData.serviceName).toBe('payment');
    expect(attachmentData.start).toBe('now-15m');
    expect(attachmentData.end).toBe('now');
  });
});
