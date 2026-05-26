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
import { useKibana } from '../../../../../common/lib/kibana';
import { AttacksEventTypes } from '../../../../../common/lib/telemetry';
import type { AttacksActionTelemetrySource } from '../../../../../common/lib/telemetry';

export interface UseAttackViewInAiAssistantContextMenuItemsProps {
  /** The attack discovery object */
  attack: AttackDiscoveryAlert;
  /** Optional callback to close the containing popover menu */
  closePopover?: () => void;
  /** Source of the action for telemetry */
  telemetrySource?: AttacksActionTelemetrySource;
}

export const useAttackViewInAiAssistantContextMenuItems = ({
  attack,
  closePopover,
  telemetrySource,
}: UseAttackViewInAiAssistantContextMenuItemsProps): {
  items: EuiContextMenuPanelItemDescriptorEntry[];
} => {
  const { hasAssistantPrivilege, isAssistantVisible } = useAssistantAvailability();
  const { registerPromptContext, showAssistantOverlay, unRegisterPromptContext } =
    useAssistantContext();
  const {
    services: { telemetry },
  } = useKibana();

  const promptContextId = attack.id ?? null;
  const viewInAiAssistantDisabled = !hasAssistantPrivilege || promptContextId == null;

  const onViewInAiAssistant = useCallback(() => {
    if (promptContextId == null) {
      return;
    }

    const lastFive = attack.id ? ` - ${attack.id.slice(-5)}` : '';
    const conversationTitle = `${attack.title ?? ''}${lastFive}`;

    if (telemetrySource) {
      telemetry.reportEvent(AttacksEventTypes.AIAssistantOpened, { source: telemetrySource });
    }

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
    telemetrySource,
    telemetry,
  ]);

  const { hasAgentBuilderPrivilege, isAgentChatExperienceEnabled, hasValidAgentBuilderLicense } =
    useAgentBuilderAvailability();
  const openAgentBuilderFlyout = useAttackDiscoveryAttachment(attack, attack.replacements);
  const reportAddToChatClick = useReportAddToChat();

  const onViewInAgentBuilder = useCallback(() => {
    reportAddToChatClick({
      pathway: 'attacks_page_group_take_action',
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

    if (!isAssistantVisible) {
      return [];
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
    isAssistantVisible,
    onViewInAgentBuilder,
    onViewInAiAssistant,
    viewInAiAssistantDisabled,
  ]);

  return { items };
};
