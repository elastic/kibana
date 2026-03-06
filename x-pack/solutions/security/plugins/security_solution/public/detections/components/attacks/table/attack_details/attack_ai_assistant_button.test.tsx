/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import {
  AttackAiAssistantButton,
  NEW_AGENT_BUILDER_ATTACHMENT_TEST_ID,
  VIEW_IN_AI_ASSISTANT_TEST_ID,
} from './attack_ai_assistant_button';
import { TestProviders } from '../../../../../common/mock/test_providers';
import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import { useAgentBuilderAvailability } from '../../../../../agent_builder/hooks/use_agent_builder_availability';
import { useAttackDiscoveryAttachment } from '../../../../../attack_discovery/pages/results/use_attack_discovery_attachment';
import { NewAgentBuilderAttachment } from '../../../../../agent_builder/components/new_agent_builder_attachment';
import type { AgentBuilderAddToChatTelemetry } from '../../../../../agent_builder/hooks/use_report_add_to_chat';

// Mock child components
jest.mock(
  '../../../../../attack_discovery/pages/results/attack_discovery_panel/view_in_ai_assistant',
  () => ({
    ViewInAiAssistant: jest.fn(() => (
      <div data-test-subj="viewInAiAssistant">{'ViewInAiAssistant'}</div>
    )),
  })
);

jest.mock('../../../../../agent_builder/components/new_agent_builder_attachment', () => ({
  NewAgentBuilderAttachment: jest.fn(() => (
    <div data-test-subj="newAgentBuilderAttachment">{'NewAgentBuilderAttachment'}</div>
  )),
}));

// Mock hooks
jest.mock('../../../../../agent_builder/hooks/use_agent_builder_availability', () => ({
  useAgentBuilderAvailability: jest.fn(),
}));

jest.mock('../../../../../attack_discovery/pages/results/use_attack_discovery_attachment', () => ({
  useAttackDiscoveryAttachment: jest.fn(),
}));

describe('AttackAiAssistantButton', () => {
  const mockAttack = {
    id: 'mock-id',
    summaryMarkdown: 'Summary',
  } as unknown as AttackDiscoveryAlert;

  const defaultProps: {
    attack: AttackDiscoveryAlert;
    pathway: AgentBuilderAddToChatTelemetry['pathway'];
  } = {
    attack: mockAttack,
    pathway: 'attacks_page_group_summary',
  };

  const renderComponent = (props = {}) =>
    render(
      <TestProviders>
        <AttackAiAssistantButton {...defaultProps} {...props} />
      </TestProviders>
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders NewAgentBuilderAttachment when isAgentChatExperienceEnabled is true', () => {
    (useAgentBuilderAvailability as jest.Mock).mockReturnValue({
      isAgentChatExperienceEnabled: true,
    });
    (useAttackDiscoveryAttachment as jest.Mock).mockReturnValue(jest.fn());

    renderComponent();

    expect(screen.getByTestId(NEW_AGENT_BUILDER_ATTACHMENT_TEST_ID)).toBeInTheDocument();
    expect(screen.queryByTestId(VIEW_IN_AI_ASSISTANT_TEST_ID)).not.toBeInTheDocument();
    expect(NewAgentBuilderAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        telemetry: {
          pathway: 'attacks_page_group_summary',
          attachments: ['alert'],
        },
      }),
      {}
    );
  });

  it('renders ViewInAiAssistant when isAgentChatExperienceEnabled is false', () => {
    (useAgentBuilderAvailability as jest.Mock).mockReturnValue({
      isAgentChatExperienceEnabled: false,
    });
    (useAttackDiscoveryAttachment as jest.Mock).mockReturnValue(jest.fn());

    renderComponent();

    expect(screen.getByTestId(VIEW_IN_AI_ASSISTANT_TEST_ID)).toBeInTheDocument();
    expect(screen.queryByTestId(NEW_AGENT_BUILDER_ATTACHMENT_TEST_ID)).not.toBeInTheDocument();
  });
});
