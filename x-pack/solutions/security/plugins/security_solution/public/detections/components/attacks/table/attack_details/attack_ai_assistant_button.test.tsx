/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

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
import { useViewInAiAssistant } from '../../../../../attack_discovery/pages/results/attack_discovery_panel/view_in_ai_assistant/use_view_in_ai_assistant';
import { NewAgentBuilderAttachment } from '../../../../../agent_builder/components/new_agent_builder_attachment';
import type { AgentBuilderAddToChatTelemetry } from '../../../../../agent_builder/hooks/use_report_add_to_chat';

vi.mock('../../../../../agent_builder/components/new_agent_builder_attachment', () => {
  const mocked = {
    NewAgentBuilderAttachment: vi.fn(() => (
      <div data-test-subj="newAgentBuilderAttachment">{'NewAgentBuilderAttachment'}</div>
    )),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../../agent_builder/hooks/use_agent_builder_availability', () => {
  const mocked = {
    useAgentBuilderAvailability: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../../attack_discovery/pages/results/use_attack_discovery_attachment', () => {
  const mocked = {
    useAttackDiscoveryAttachment: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock(
  '../../../../../attack_discovery/pages/results/attack_discovery_panel/view_in_ai_assistant/use_view_in_ai_assistant',
  () => {
    const mocked = {
      useViewInAiAssistant: vi.fn(),
    };
    return { ...mocked, default: mocked };
  }
);

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

  const mockShowAssistantOverlay = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useViewInAiAssistant as Mock).mockReturnValue({
      disabled: false,
      showAssistantOverlay: mockShowAssistantOverlay,
      isAssistantVisible: true,
    });
  });

  it('renders NewAgentBuilderAttachment when isAgentChatExperienceEnabled is true', () => {
    (useAgentBuilderAvailability as Mock).mockReturnValue({
      isAgentChatExperienceEnabled: true,
    });
    (useAttackDiscoveryAttachment as Mock).mockReturnValue(vi.fn());

    renderComponent();

    expect(screen.getByTestId(NEW_AGENT_BUILDER_ATTACHMENT_TEST_ID)).toBeInTheDocument();
    expect(screen.queryByTestId(VIEW_IN_AI_ASSISTANT_TEST_ID)).not.toBeInTheDocument();
    expect(NewAgentBuilderAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        telemetry: {
          pathway: 'attacks_page_group_summary',
          attachments: ['attack_discovery'],
        },
      }),
      {}
    );
  });

  it('renders AiButton when isAgentChatExperienceEnabled is false', () => {
    (useAgentBuilderAvailability as Mock).mockReturnValue({
      isAgentChatExperienceEnabled: false,
    });
    (useAttackDiscoveryAttachment as Mock).mockReturnValue(vi.fn());

    renderComponent();

    expect(screen.getByTestId(VIEW_IN_AI_ASSISTANT_TEST_ID)).toBeInTheDocument();
    expect(screen.queryByTestId(NEW_AGENT_BUILDER_ATTACHMENT_TEST_ID)).not.toBeInTheDocument();
    expect(screen.getByText('View in AI Assistant')).toBeInTheDocument();
  });

  it('disables the AiButton when useViewInAiAssistant returns disabled', () => {
    (useAgentBuilderAvailability as Mock).mockReturnValue({
      isAgentChatExperienceEnabled: false,
    });
    (useAttackDiscoveryAttachment as Mock).mockReturnValue(vi.fn());
    (useViewInAiAssistant as Mock).mockReturnValue({
      disabled: true,
      showAssistantOverlay: mockShowAssistantOverlay,
      isAssistantVisible: true,
    });

    renderComponent();

    expect(screen.getByTestId(VIEW_IN_AI_ASSISTANT_TEST_ID)).toBeDisabled();
  });

  it('does not render when isAssistantVisible is false', () => {
    (useAgentBuilderAvailability as Mock).mockReturnValue({
      isAgentChatExperienceEnabled: false,
    });
    (useAttackDiscoveryAttachment as Mock).mockReturnValue(vi.fn());
    (useViewInAiAssistant as Mock).mockReturnValue({
      disabled: false,
      showAssistantOverlay: mockShowAssistantOverlay,
      isAssistantVisible: false,
    });

    renderComponent();

    expect(screen.queryByTestId(VIEW_IN_AI_ASSISTANT_TEST_ID)).not.toBeInTheDocument();
    expect(screen.queryByTestId(NEW_AGENT_BUILDER_ATTACHMENT_TEST_ID)).not.toBeInTheDocument();
  });
});
