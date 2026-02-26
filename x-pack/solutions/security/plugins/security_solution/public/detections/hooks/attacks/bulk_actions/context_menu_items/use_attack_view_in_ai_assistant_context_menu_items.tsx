/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useAssistantContext } from '@kbn/elastic-assistant';
import {
  getAttackDiscoveryMarkdown,
  type AttackDiscoveryAlert,
} from '@kbn/elastic-assistant-common';
import type { EuiContextMenuPanelItemDescriptorEntry } from '@elastic/eui/src/components/context_menu/context_menu';
import { useReportAddToChat } from '../../../../../agent_builder/hooks/use_report_add_to_chat';
import { useAgentBuilderAvailability } from '../../../../../agent_builder/hooks/use_agent_builder_availability';
import { useAssistantAvailability } from '../../../../../assistant/use_assistant_availability';
import { useAttackDiscoveryAttachment } from '../../../../../attack_discovery/pages/results/use_attack_discovery_attachment';
import * as i18n from '../../../../../attack_discovery/pages/results/take_action/translations';

export interface UseAttackViewInAiAssistantContextMenuItemsProps {
  /**
   * The attack discovery object
   */
  attack: AttackDiscoveryAlert;
  /**
   * Optional callback to close the containing popover menu
   */
  closePopover?: () => void;
}

export const useAttackViewInAiAssistantContextMenuItems = ({
  attack,
  closePopover,
}: UseAttackViewInAiAssistantContextMenuItemsProps): {
  items: EuiContextMenuPanelItemDescriptorEntry[];
} => {
  const { hasAssistantPrivilege } = useAssistantAvailability();
  const { registerPromptContext, showAssistantOverlay, unRegisterPromptContext } =
    useAssistantContext();

  const promptContextId = attack.id ?? null;
  const viewInAiAssistantDisabled = !hasAssistantPrivilege || promptContextId == null;

  const onViewInAiAssistant = useCallback(() => {
    if (promptContextId == null) {
      return;
    }

    const lastFive = attack.id ? ` - ${attack.id.slice(-5)}` : '';
    const conversationTitle = `${attack.title ?? ''}${lastFive}`;

    unRegisterPromptContext(promptContextId);
    registerPromptContext({
      category: 'insight',
      description: attack.title ?? '',
      getPromptContext: async () =>
        getAttackDiscoveryMarkdown({
          attackDiscovery: attack,
          // note: we do NOT want to replace the replacements here
        }),
      id: promptContextId,
      replacements: attack.replacements,
      tooltip: null,
    });

    showAssistantOverlay({
      showOverlay: true,
      promptContextId,
      selectedConversation: { title: conversationTitle },
    });
  }, [
    attack,
    promptContextId,
    registerPromptContext,
    showAssistantOverlay,
    unRegisterPromptContext,
  ]);

  const { hasAgentBuilderPrivilege, isAgentChatExperienceEnabled, hasValidAgentBuilderLicense } =
    useAgentBuilderAvailability();
  const openAgentBuilderFlyout = useAttackDiscoveryAttachment(attack, attack.replacements);
  const reportAddToChatClick = useReportAddToChat();

  const onViewInAgentBuilder = useCallback(() => {
    reportAddToChatClick({
      pathway: 'attack_discovery_take_action',
      attachments: ['alert'],
    });
    openAgentBuilderFlyout();
  }, [openAgentBuilderFlyout, reportAddToChatClick]);

  const isAddToChatDisabled = !hasValidAgentBuilderLicense;

  const items = useMemo<EuiContextMenuPanelItemDescriptorEntry[]>(() => {
    if (isAgentChatExperienceEnabled) {
      if (!hasAgentBuilderPrivilege) {
        return [];
      }

      return [
        {
          name: i18n.ADD_TO_CHAT,
          key: 'viewInAgentBuilder',
          'data-test-subj': 'viewInAgentBuilder',
          disabled: isAddToChatDisabled,
          onClick: () => {
            onViewInAgentBuilder();
            closePopover?.();
          },
        },
      ];
    }

    return [
      {
        name: i18n.VIEW_IN_AI_ASSISTANT,
        key: 'viewInAiAssistant',
        'data-test-subj': 'viewInAiAssistant',
        disabled: viewInAiAssistantDisabled,
        onClick: () => {
          onViewInAiAssistant();
          closePopover?.();
        },
      },
    ];
  }, [
    closePopover,
    hasAgentBuilderPrivilege,
    isAddToChatDisabled,
    isAgentChatExperienceEnabled,
    onViewInAgentBuilder,
    onViewInAiAssistant,
    viewInAiAssistantDisabled,
  ]);

  return { items };
};
