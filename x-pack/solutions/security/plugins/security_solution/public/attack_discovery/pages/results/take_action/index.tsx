/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type AttackDiscovery,
  type AttackDiscoveryAlert,
  getAttackDiscoveryMarkdown,
  getOriginalAlertIds,
  type Replacements,
} from '@kbn/elastic-assistant-common';
import { i18n as i18nTranslate } from '@kbn/i18n';
import { EuiButtonEmpty, EuiIcon, EuiPopover, useGeneratedHtmlId } from '@elastic/eui';
import { ADD_TO_CASE } from '@kbn/response-ops-alerts-table';
import React, { useCallback, useMemo, useState } from 'react';

import { useReportAddToChat } from '../../../../agent_builder/hooks/use_report_add_to_chat';
import * as agentBuilderI18n from '../../../../agent_builder/components/translations';
import { useAssistantAvailability } from '../../../../assistant/use_assistant_availability';
import { useAddToCase } from './use_add_to_case';
import { useViewInAiAssistant } from '../attack_discovery_panel/view_in_ai_assistant/use_view_in_ai_assistant';
import { APP_ID } from '../../../../../common';
import { useKibana } from '../../../../common/lib/kibana';
import * as i18n from './translations';
import { UpdateAlertsModal } from './update_alerts_modal';
import { AttackDiscoveryActionMenu } from './attack_discovery_action_menu';

import { useAttackDiscoveryBulk } from '../../use_attack_discovery_bulk';
import { useUpdateAlertsStatus } from './use_update_alerts_status';
import { isAttackDiscoveryAlert } from '../../utils/is_attack_discovery_alert';
import { useAgentBuilderAvailability } from '../../../../agent_builder/hooks/use_agent_builder_availability';
import { useAttackDiscoveryAttachment } from '../use_attack_discovery_attachment';
import { useAlertsPrivileges } from '../../../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import { useAttackRunWorkflowContextMenuItems } from '../../../../detections/hooks/attacks/bulk_actions/context_menu_items/use_attack_run_workflow_context_menu_items';

const ATTACK_DISCOVERY_ACTION_IDS = {
  addToCase: 'addToCase',
  addToChat: 'viewInAgentBuilder',
  addToDataset: 'addToDataset',
  markAsAcknowledged: 'markAsAcknowledged',
  markAsClosed: 'markAsClosed',
  markAsOpen: 'markAsOpen',
  viewInAiAssistant: 'viewInAiAssistant',
} as const;

interface Props {
  attackDiscoveries: AttackDiscovery[] | AttackDiscoveryAlert[];
  buttonText?: string;
  buttonSize?: 's' | 'xs';
  refetchFindAttackDiscoveries?: () => void;
  replacements?: Replacements;
  setSelectedAttackDiscoveries: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

const TakeActionComponent: React.FC<Props> = ({
  attackDiscoveries,
  buttonSize = 's',
  buttonText,
  refetchFindAttackDiscoveries,
  replacements,
  setSelectedAttackDiscoveries,
}) => {
  const [pendingAction, setPendingAction] = useState<'open' | 'acknowledged' | 'closed' | null>(
    null
  );

  const {
    services: { cases, evals },
  } = useKibana();
  const { hasSearchAILakeConfigurations } = useAssistantAvailability();

  const userCasesPermissions = cases.helpers.canUseCases([APP_ID]);
  const canUserCreateAndReadCases = useCallback(
    () => userCasesPermissions.createComment && userCasesPermissions.read,
    [userCasesPermissions.createComment, userCasesPermissions.read]
  );
  const { disabled: addToCaseDisabled, onAddToCase } = useAddToCase({
    canUserCreateAndReadCases,
    onSuccess: refetchFindAttackDiscoveries,
    title: attackDiscoveries.map((discovery) => discovery.title).join(', '),
  });

  const { hasAlertsUpdate } = useAlertsPrivileges();

  // boilerplate for the take action popover:
  const takeActionContextMenuPopoverId = useGeneratedHtmlId({
    prefix: 'takeActionContextMenuPopover',
  });
  const [isPopoverOpen, setPopover] = useState(false);
  const onButtonClick = useCallback(() => setPopover(!isPopoverOpen), [isPopoverOpen]);
  const closePopover = useCallback(() => setPopover(false), []);

  // markdown for the attack discovery, which will be exported to the case, or to the assistant:
  const markdown = useMemo(
    () =>
      attackDiscoveries
        .map((attackDiscovery) =>
          getAttackDiscoveryMarkdown({
            attackDiscovery,
            replacements,
          })
        )
        .join('\n\n'),
    [attackDiscoveries, replacements]
  );

  const alertIds = useMemo(
    () => [...new Set(attackDiscoveries.flatMap((attackDiscovery) => attackDiscovery.alertIds))],
    [attackDiscoveries]
  );

  const attackDiscoveryIds: string[] = useMemo(
    () =>
      attackDiscoveries.flatMap((attackDiscovery) =>
        attackDiscovery.id != null ? [attackDiscovery.id] : []
      ),
    [attackDiscoveries]
  );

  const { mutateAsync: attackDiscoveryBulk } = useAttackDiscoveryBulk();
  const { mutateAsync: updateAlertStatus } = useUpdateAlertsStatus();

  /**
   * Called by the modal when the user confirms the action,
   * or directly when the user selects an action in EASE.
   */
  const onConfirm = useCallback(
    async ({
      updateAlerts,
      workflowStatus,
    }: {
      updateAlerts: boolean;
      workflowStatus: 'open' | 'acknowledged' | 'closed';
    }) => {
      setPendingAction(null);

      await attackDiscoveryBulk({
        ids: attackDiscoveryIds,
        kibanaAlertWorkflowStatus: workflowStatus,
      });

      if (updateAlerts && alertIds.length > 0) {
        const originalAlertIds = getOriginalAlertIds({ alertIds, replacements });

        await updateAlertStatus({
          ids: originalAlertIds,
          kibanaAlertWorkflowStatus: workflowStatus,
        });
      }

      setSelectedAttackDiscoveries({});
      refetchFindAttackDiscoveries?.();
    },
    [
      alertIds,
      attackDiscoveryBulk,
      attackDiscoveryIds,
      refetchFindAttackDiscoveries,
      replacements,
      setSelectedAttackDiscoveries,
      updateAlertStatus,
    ]
  );

  const onUpdateWorkflowStatus = useCallback(
    async (workflowStatus: 'open' | 'acknowledged' | 'closed') => {
      closePopover();

      setPendingAction(workflowStatus);

      if (hasSearchAILakeConfigurations) {
        // there's no modal for EASE, so we call onConfirm directly
        onConfirm({ updateAlerts: false, workflowStatus });
      }
    },
    [closePopover, hasSearchAILakeConfigurations, onConfirm]
  );

  const onClickAddToCase = useCallback(() => {
    closePopover();

    onAddToCase({
      alertIds,
      markdownComments: [markdown],
      replacements,
    });
  }, [alertIds, closePopover, markdown, onAddToCase, replacements]);

  const {
    showAssistantOverlay,
    disabled: viewInAiAssistantDisabled,
    isAssistantVisible,
  } = useViewInAiAssistant({
    attackDiscovery: attackDiscoveries[0],
    replacements,
  });

  const onViewInAiAssistant = useCallback(() => {
    closePopover();
    showAssistantOverlay?.();
  }, [closePopover, showAssistantOverlay]);

  const { hasAgentBuilderPrivilege, isAgentChatExperienceEnabled, hasValidAgentBuilderLicense } =
    useAgentBuilderAvailability();
  const attackDiscovery = attackDiscoveries.length === 1 ? attackDiscoveries[0] : undefined;
  const openAgentBuilderFlyout = useAttackDiscoveryAttachment(attackDiscovery, replacements);
  const reportAddToChatClick = useReportAddToChat();
  const onViewInAgentBuilder = useCallback(() => {
    closePopover();
    reportAddToChatClick({
      pathway: 'attack_discovery_take_action',
      attachments: ['alert'],
    });
    openAgentBuilderFlyout();
  }, [closePopover, openAgentBuilderFlyout, reportAddToChatClick]);

  const isAddToChatDisabled = !hasValidAgentBuilderLicense;

  const addToDatasetAction = useMemo(() => {
    if (!evals?.getAddToDatasetAction) return null;

    return evals.getAddToDatasetAction({
      label: i18n.ADD_TO_DATASET,
      title: i18n.ADD_TO_DATASET,
      onBeforeOpen: closePopover,
      initialExamples: attackDiscoveries.map((ad, index) => {
        const title =
          ad.title && ad.title.trim().length > 0
            ? ad.title.trim()
            : i18nTranslate.translate(
                'xpack.securitySolution.attackDiscovery.attackDiscoveryPanel.actions.takeAction.addToDatasetFallbackTitle',
                {
                  defaultMessage: 'Attack discovery {index}',
                  values: { index: index + 1 },
                }
              );

        return {
          label: title,
          input: {
            attackDiscovery: {
              id: ad.id,
              title: ad.title,
              alertIds: ad.alertIds,
              detailsMarkdown: ad.detailsMarkdown,
              summaryMarkdown: ad.summaryMarkdown,
              ...(replacements != null ? { replacements } : {}),
            },
          },
          output: {
            title: ad.title,
            summaryMarkdown: ad.summaryMarkdown,
            detailsMarkdown: ad.detailsMarkdown,
          },
          metadata: {
            source: 'security_attack_discovery',
            attack_discovery_id: ad.id ?? null,
            attack_discovery_ids: attackDiscoveryIds,
          },
          selected: true,
        };
      }),
    });
  }, [attackDiscoveries, attackDiscoveryIds, closePopover, evals, replacements]);

  const { items: runWorkflowItems, panels: runWorkflowPanels } =
    useAttackRunWorkflowContextMenuItems({
      attacksForWorkflowRun: attackDiscoveries.map((ad) => {
        return {
          attackId: ad.id ?? '',
          attackIndex: isAttackDiscoveryAlert(ad) ? ad.index : undefined,
        };
      }),
      closePopover,
    });

  // button for the popover:
  const button = useMemo(
    () => (
      <EuiButtonEmpty
        data-test-subj="takeActionPopoverButton"
        iconSide="right"
        iconType="chevronSingleDown"
        onClick={onButtonClick}
        size={buttonSize}
      >
        {buttonText ?? i18n.TAKE_ACTION}
      </EuiButtonEmpty>
    ),
    [buttonSize, buttonText, onButtonClick]
  );

  const actionMenuItems = useMemo(() => {
    const isSingleAttackDiscovery = attackDiscoveries.length === 1;

    const isOpen = attackDiscoveries.every(
      (ad) => isAttackDiscoveryAlert(ad) && ad.alertWorkflowStatus === 'open'
    );

    const isAcknowledged = attackDiscoveries.every(
      (ad) => isAttackDiscoveryAlert(ad) && ad.alertWorkflowStatus === 'acknowledged'
    );

    const isClosed = attackDiscoveries.every(
      (ad) => isAttackDiscoveryAlert(ad) && ad.alertWorkflowStatus === 'closed'
    );

    const markAsOpenItem =
      !isOpen && hasAlertsUpdate
        ? [
            {
              'data-test-subj': 'markAsOpen',
              key: ATTACK_DISCOVERY_ACTION_IDS.markAsOpen,
              icon: <EuiIcon type="dot" color="danger" aria-hidden />,
              name: i18n.MARK_AS_OPEN,
              onClick: () => onUpdateWorkflowStatus('open'),
            },
          ]
        : [];

    const markAsAcknowledgedItem =
      !isAcknowledged && hasAlertsUpdate
        ? [
            {
              'data-test-subj': 'markAsAcknowledged',
              key: ATTACK_DISCOVERY_ACTION_IDS.markAsAcknowledged,
              icon: <EuiIcon type="dot" color="primary" aria-hidden />,
              name: i18n.MARK_AS_ACKNOWLEDGED,
              onClick: () => onUpdateWorkflowStatus('acknowledged'),
            },
          ]
        : [];

    const markAsClosedItem =
      !isClosed && hasAlertsUpdate
        ? [
            {
              'data-test-subj': 'markAsClosed',
              key: ATTACK_DISCOVERY_ACTION_IDS.markAsClosed,
              icon: <EuiIcon type="dot" color="subdued" aria-hidden />,
              name: i18n.MARK_AS_CLOSED,
              onClick: () => onUpdateWorkflowStatus('closed'),
            },
          ]
        : [];

    const caseItems = !addToCaseDisabled
      ? [
          {
            'data-test-subj': 'addToCase',
            key: ATTACK_DISCOVERY_ACTION_IDS.addToCase,
            icon: 'briefcase',
            name: ADD_TO_CASE,
            onClick: onClickAddToCase,
          },
        ]
      : [];

    const aiItems = isSingleAttackDiscovery
      ? isAgentChatExperienceEnabled
        ? hasAgentBuilderPrivilege
          ? [
              {
                'data-test-subj': 'viewInAgentBuilder',
                disabled: isAddToChatDisabled,
                key: ATTACK_DISCOVERY_ACTION_IDS.addToChat,
                icon: 'comment',
                name: i18n.ADD_TO_CHAT,
                onClick: onViewInAgentBuilder,
                toolTipContent: isAddToChatDisabled
                  ? agentBuilderI18n.UPGRADE_TO_ENTERPRISE_TO_USE_AGENT_BUILDER_CHAT
                  : undefined,
              },
            ]
          : []
        : isAssistantVisible
        ? [
            {
              'data-test-subj': 'viewInAiAssistant',
              disabled: viewInAiAssistantDisabled,
              key: ATTACK_DISCOVERY_ACTION_IDS.viewInAiAssistant,
              icon: 'sparkles',
              name: i18n.VIEW_IN_AI_ASSISTANT,
              onClick: onViewInAiAssistant,
            },
          ]
        : []
      : [];

    const datasetItems =
      addToDatasetAction != null
        ? [
            {
              'data-test-subj': 'addToDataset',
              key: ATTACK_DISCOVERY_ACTION_IDS.addToDataset,
              icon: 'database',
              name: addToDatasetAction.label,
              onClick: addToDatasetAction.onClick,
            },
          ]
        : [];

    return {
      aiItems,
      caseItems,
      datasetItems,
      statusItems: [...markAsOpenItem, ...markAsAcknowledgedItem, ...markAsClosedItem],
    };
  }, [
    attackDiscoveries,
    hasAlertsUpdate,
    addToCaseDisabled,
    isAgentChatExperienceEnabled,
    hasAgentBuilderPrivilege,
    isAddToChatDisabled,
    isAssistantVisible,
    onViewInAgentBuilder,
    viewInAiAssistantDisabled,
    onViewInAiAssistant,
    onUpdateWorkflowStatus,
    onClickAddToCase,
    addToDatasetAction,
  ]);

  const onCloseOrCancel = useCallback(() => {
    setPendingAction(null);
  }, []);

  return (
    <>
      <EuiPopover
        aria-label={i18n.TAKE_ACTION}
        anchorPosition="upCenter"
        button={button}
        closePopover={closePopover}
        data-test-subj="takeAction"
        id={takeActionContextMenuPopoverId}
        isOpen={isPopoverOpen}
        panelPaddingSize="none"
      >
        <AttackDiscoveryActionMenu
          aiItems={actionMenuItems.aiItems}
          caseItems={actionMenuItems.caseItems}
          datasetItems={actionMenuItems.datasetItems}
          panels={runWorkflowPanels}
          statusItems={actionMenuItems.statusItems}
          workflowItems={runWorkflowItems}
        />
      </EuiPopover>

      {pendingAction != null && !hasSearchAILakeConfigurations && (
        <UpdateAlertsModal
          alertsCount={alertIds.length}
          attackDiscoveriesCount={attackDiscoveryIds.length}
          onCancel={onCloseOrCancel}
          onClose={onCloseOrCancel}
          onConfirm={onConfirm}
          workflowStatus={pendingAction}
        />
      )}
    </>
  );
};

TakeActionComponent.displayName = 'TakeAction';

export const TakeAction = React.memo(TakeActionComponent);
