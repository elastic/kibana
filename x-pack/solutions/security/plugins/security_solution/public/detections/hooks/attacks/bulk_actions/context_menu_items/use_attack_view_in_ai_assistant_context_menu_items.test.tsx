/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useAssistantContext } from '@kbn/elastic-assistant';
import { getAttackDiscoveryMarkdown } from '@kbn/elastic-assistant-common';
import { getMockAttackDiscoveryAlerts } from '../../../../../attack_discovery/pages/mock/mock_attack_discovery_alerts';
import { useAttackDiscoveryAttachment } from '../../../../../attack_discovery/pages/results/use_attack_discovery_attachment';
import { useAgentBuilderAvailability } from '../../../../../agent_builder/hooks/use_agent_builder_availability';
import { useReportAddToChat } from '../../../../../agent_builder/hooks/use_report_add_to_chat';
import { useAssistantAvailability } from '../../../../../assistant/use_assistant_availability';
import { useAttackViewInAiAssistantContextMenuItems } from './use_attack_view_in_ai_assistant_context_menu_items';

jest.mock('@kbn/elastic-assistant');
jest.mock('@kbn/elastic-assistant-common', () => {
  const actual = jest.requireActual('@kbn/elastic-assistant-common');

  return {
    ...actual,
    getAttackDiscoveryMarkdown: jest.fn(),
  };
});
jest.mock('../../../../../attack_discovery/pages/results/use_attack_discovery_attachment');
jest.mock('../../../../../agent_builder/hooks/use_agent_builder_availability');
jest.mock('../../../../../agent_builder/hooks/use_report_add_to_chat');
jest.mock('../../../../../assistant/use_assistant_availability');

const mockUseAttackDiscoveryAttachment = useAttackDiscoveryAttachment as jest.MockedFunction<
  typeof useAttackDiscoveryAttachment
>;
const mockUseAgentBuilderAvailability = useAgentBuilderAvailability as jest.MockedFunction<
  typeof useAgentBuilderAvailability
>;
const mockUseReportAddToChat = useReportAddToChat as jest.MockedFunction<typeof useReportAddToChat>;
const mockUseAssistantAvailability = useAssistantAvailability as jest.MockedFunction<
  typeof useAssistantAvailability
>;
const mockUseAssistantContext = useAssistantContext as jest.MockedFunction<
  typeof useAssistantContext
>;
const mockGetAttackDiscoveryMarkdown = getAttackDiscoveryMarkdown as jest.MockedFunction<
  typeof getAttackDiscoveryMarkdown
>;

const mockAttack = getMockAttackDiscoveryAlerts()[0];
const mockRegisterPromptContext = jest.fn();
const mockUnRegisterPromptContext = jest.fn();
const mockShowAssistantOverlay = jest.fn();

describe('useAttackViewInAiAssistantContextMenuItems', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAttackDiscoveryAttachment.mockReturnValue(jest.fn());
    mockUseAgentBuilderAvailability.mockReturnValue({
      hasAgentBuilderPrivilege: false,
      isAgentChatExperienceEnabled: false,
      hasValidAgentBuilderLicense: true,
      isAgentBuilderEnabled: false,
    });
    mockUseReportAddToChat.mockReturnValue(jest.fn());
    mockUseAssistantAvailability.mockReturnValue({
      hasAssistantPrivilege: true,
      hasConnectorsAllPrivilege: true,
      hasConnectorsReadPrivilege: true,
      hasManageGlobalKnowledgeBase: true,
      hasSearchAILakeConfigurations: true,
      hasUpdateAIAssistantAnonymization: true,
      isAssistantEnabled: true,
      isAssistantVisible: true,
    });
    mockUseAssistantContext.mockReturnValue({
      registerPromptContext: mockRegisterPromptContext,
      unRegisterPromptContext: mockUnRegisterPromptContext,
      showAssistantOverlay: mockShowAssistantOverlay,
    } as unknown as ReturnType<typeof useAssistantContext>);
    mockGetAttackDiscoveryMarkdown.mockReturnValue('test-markdown');
  });

  it('should return "View in AI Assistant" when Agent Builder chat experience is disabled', () => {
    const { result } = renderHook(() =>
      useAttackViewInAiAssistantContextMenuItems({
        attack: mockAttack,
      })
    );

    expect(result.current.items[0]?.name).toBe('View in AI Assistant');
    expect(result.current.items[0]?.key).toBe('viewInAiAssistant');
    expect(result.current.items[0]?.['data-test-subj']).toBe('viewInAiAssistant');
  });

  it('should call closePopover and showAssistantOverlay on "View in AI Assistant" click', () => {
    const closePopover = jest.fn();

    const { result } = renderHook(() =>
      useAttackViewInAiAssistantContextMenuItems({
        attack: mockAttack,
        closePopover,
      })
    );

    result.current.items[0]?.onClick?.({} as React.MouseEvent);

    expect(closePopover).toHaveBeenCalledTimes(1);
    expect(mockUnRegisterPromptContext).toHaveBeenCalledWith(mockAttack.id);
    expect(mockRegisterPromptContext).toHaveBeenCalledTimes(1);
    expect(mockShowAssistantOverlay).toHaveBeenCalledWith({
      showOverlay: true,
      promptContextId: mockAttack.id,
      selectedConversation: { title: `${mockAttack.title} - ${mockAttack.id.slice(-5)}` },
    });
    expect(mockShowAssistantOverlay.mock.invocationCallOrder[0]).toBeLessThan(
      closePopover.mock.invocationCallOrder[0]
    );
    expect(mockUnRegisterPromptContext.mock.invocationCallOrder[0]).toBeLessThan(
      mockRegisterPromptContext.mock.invocationCallOrder[0]
    );
    expect(mockRegisterPromptContext.mock.invocationCallOrder[0]).toBeLessThan(
      mockShowAssistantOverlay.mock.invocationCallOrder[0]
    );
  });

  it('should return "Add to chat" when Agent Builder chat experience is enabled and user has privilege', () => {
    mockUseAgentBuilderAvailability.mockReturnValue({
      hasAgentBuilderPrivilege: true,
      isAgentChatExperienceEnabled: true,
      hasValidAgentBuilderLicense: true,
      isAgentBuilderEnabled: true,
    });

    const { result } = renderHook(() =>
      useAttackViewInAiAssistantContextMenuItems({
        attack: mockAttack,
      })
    );

    expect(result.current.items).toMatchInlineSnapshot(`
      Array [
        Object {
          "data-test-subj": "viewInAgentBuilder",
          "disabled": false,
          "key": "viewInAgentBuilder",
          "name": "Add to chat",
          "onClick": [Function],
        },
      ]
    `);
  });

  it('should disable "Add to chat" when license is invalid', () => {
    mockUseAgentBuilderAvailability.mockReturnValue({
      hasAgentBuilderPrivilege: true,
      isAgentChatExperienceEnabled: true,
      hasValidAgentBuilderLicense: false,
      isAgentBuilderEnabled: true,
    });

    const { result } = renderHook(() =>
      useAttackViewInAiAssistantContextMenuItems({
        attack: mockAttack,
      })
    );

    expect(result.current.items[0]?.disabled).toBe(true);
  });

  it('should return empty items when Agent Builder chat experience is enabled and user has no privilege', () => {
    mockUseAgentBuilderAvailability.mockReturnValue({
      hasAgentBuilderPrivilege: false,
      isAgentChatExperienceEnabled: true,
      hasValidAgentBuilderLicense: true,
      isAgentBuilderEnabled: false,
    });

    const { result } = renderHook(() =>
      useAttackViewInAiAssistantContextMenuItems({
        attack: mockAttack,
      })
    );

    expect(result.current.items).toEqual([]);
  });

  it('should call closePopover, reportAddToChat and openAgentBuilderFlyout on "Add to chat" click', () => {
    const closePopover = jest.fn();
    const openAgentBuilderFlyout = jest.fn();
    const reportAddToChatClick = jest.fn();

    mockUseAttackDiscoveryAttachment.mockReturnValue(openAgentBuilderFlyout);
    mockUseReportAddToChat.mockReturnValue(reportAddToChatClick);
    mockUseAgentBuilderAvailability.mockReturnValue({
      hasAgentBuilderPrivilege: true,
      isAgentChatExperienceEnabled: true,
      hasValidAgentBuilderLicense: true,
      isAgentBuilderEnabled: true,
    });

    const { result } = renderHook(() =>
      useAttackViewInAiAssistantContextMenuItems({
        attack: mockAttack,
        closePopover,
      })
    );

    result.current.items[0]?.onClick?.({} as React.MouseEvent);

    expect(closePopover).toHaveBeenCalledTimes(1);
    expect(reportAddToChatClick).toHaveBeenCalledWith({
      pathway: 'attack_discovery_take_action',
      attachments: ['alert'],
    });
    expect(openAgentBuilderFlyout).toHaveBeenCalledTimes(1);
    expect(reportAddToChatClick.mock.invocationCallOrder[0]).toBeLessThan(
      closePopover.mock.invocationCallOrder[0]
    );
  });

  it('should disable "View in AI Assistant" when user has no assistant privilege', () => {
    mockUseAssistantAvailability.mockReturnValue({
      hasAssistantPrivilege: false,
      hasConnectorsAllPrivilege: true,
      hasConnectorsReadPrivilege: true,
      hasManageGlobalKnowledgeBase: true,
      hasSearchAILakeConfigurations: true,
      hasUpdateAIAssistantAnonymization: true,
      isAssistantEnabled: true,
      isAssistantVisible: true,
    });

    const { result } = renderHook(() =>
      useAttackViewInAiAssistantContextMenuItems({
        attack: mockAttack,
      })
    );

    expect(result.current.items[0]?.disabled).toBe(true);
  });

  it('registers prompt context with markdown getter and replacements', async () => {
    const { result } = renderHook(() =>
      useAttackViewInAiAssistantContextMenuItems({
        attack: mockAttack,
      })
    );

    result.current.items[0]?.onClick?.({} as React.MouseEvent);

    const registeredContext = mockRegisterPromptContext.mock.calls[0][0];
    const promptContext = await registeredContext.getPromptContext();

    expect(registeredContext).toMatchObject({
      id: mockAttack.id,
      category: 'insight',
      description: mockAttack.title,
      replacements: mockAttack.replacements,
      tooltip: null,
    });
    expect(promptContext).toBe('test-markdown');
    expect(mockGetAttackDiscoveryMarkdown).toHaveBeenCalledWith({
      attackDiscovery: mockAttack,
    });
  });
});
