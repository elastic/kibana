/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getAttackDiscoveryMarkdown,
  type AttackDiscovery,
  type AttackDiscoveryAlert,
  type Replacements,
} from '@kbn/elastic-assistant-common';
import {
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  useGeneratedHtmlId,
  EuiPopover,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';

import { useAddToNewCase } from './use_add_to_case';
import { useAddToExistingCase } from './use_add_to_existing_case';
import { useViewInAiAssistant } from '../attack_discovery_panel/view_in_ai_assistant/use_view_in_ai_assistant';
import { APP_ID } from '../../../../../common';
import { useKibana } from '../../../../common/lib/kibana';
import * as i18n from './translations';
import { UpdateAlertsModal } from './update_alerts_modal';
import { useAttackDiscoveryBulk } from '../../use_attack_discovery_bulk';
import { useKibanaFeatureFlags } from '../../use_kibana_feature_flags';
import { useUpdateAlertsStatus } from './use_update_alerts_status';
import { isAttackDiscoveryAlert } from '../../utils/is_attack_discovery_alert';

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
    services: { cases },
  } = useKibana();
  const { attackDiscoveryAlertsEnabled } = useKibanaFeatureFlags();

  const userCasesPermissions = cases.helpers.canUseCases([APP_ID]);
  const canUserCreateAndReadCases = useCallback(
    () => userCasesPermissions.createComment && userCasesPermissions.read,
    [userCasesPermissions.createComment, userCasesPermissions.read]
  );
  const { disabled: addToCaseDisabled, onAddToNewCase } = useAddToNewCase({
    canUserCreateAndReadCases,
    title: attackDiscoveries.map((discovery) => discovery.title).join(', '),
  });
  const { onAddToExistingCase } = useAddToExistingCase({
    canUserCreateAndReadCases,
  });

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

  // click handlers for the popover actions:
  const onClickMarkAsAcknowledged = useCallback(async () => {
    closePopover();

    setPendingAction('acknowledged');
  }, [closePopover]);

  const onClickMarkAsClosed = useCallback(async () => {
    closePopover();

    setPendingAction('closed');
  }, [closePopover]);

  const onClickMarkAsOpen = useCallback(async () => {
    closePopover();

    setPendingAction('open');
  }, [closePopover]);

  const onClickAddToNewCase = useCallback(async () => {
    closePopover();

    onAddToNewCase({
      alertIds,
      markdownComments: [markdown],
      replacements,
    });

    await refetchFindAttackDiscoveries?.();
  }, [
    closePopover,
    onAddToNewCase,
    alertIds,
    markdown,
    replacements,
    refetchFindAttackDiscoveries,
  ]);

  const onClickAddToExistingCase = useCallback(() => {
    closePopover();

    onAddToExistingCase({
      alertIds,
      markdownComments: [markdown],
      replacements,
    });
  }, [closePopover, onAddToExistingCase, alertIds, markdown, replacements]);

  const { showAssistantOverlay, disabled: viewInAiAssistantDisabled } = useViewInAiAssistant({
    attackDiscovery: attackDiscoveries[0],
    replacements,
  });

  const onViewInAiAssistant = useCallback(() => {
    closePopover();
    showAssistantOverlay?.();
  }, [closePopover, showAssistantOverlay]);

  // button for the popover:
  const button = useMemo(
    () => (
      <EuiButtonEmpty
        data-test-subj="takeActionPopoverButton"
        iconSide="right"
        iconType="arrowDown"
        onClick={onButtonClick}
        size={buttonSize}
      >
        {buttonText ?? i18n.TAKE_ACTION}
      </EuiButtonEmpty>
    ),
    [buttonSize, buttonText, onButtonClick]
  );

  // items for the popover:
  const items: React.JSX.Element[] = useMemo(
    () =>
      [
        <EuiContextMenuItem
          data-test-subj="addToCase"
          disabled={addToCaseDisabled}
          key="addToCase"
          onClick={onClickAddToNewCase}
        >
          {i18n.ADD_TO_NEW_CASE}
        </EuiContextMenuItem>,

        <EuiContextMenuItem
          data-test-subj="addToExistingCase"
          disabled={addToCaseDisabled}
          key="addToExistingCase"
          onClick={onClickAddToExistingCase}
        >
          {i18n.ADD_TO_EXISTING_CASE}
        </EuiContextMenuItem>,

        attackDiscoveries.length === 1 ? (
          <EuiContextMenuItem
            data-test-subj="viewInAiAssistant"
            disabled={viewInAiAssistantDisabled}
            key="viewInAiAssistant"
            onClick={onViewInAiAssistant}
          >
            {i18n.VIEW_IN_AI_ASSISTANT}
          </EuiContextMenuItem>
        ) : (
          []
        ),
      ].flat(),
    [
      addToCaseDisabled,
      attackDiscoveries.length,
      onClickAddToExistingCase,
      onClickAddToNewCase,
      onViewInAiAssistant,
      viewInAiAssistantDisabled,
    ]
  );

  const allItems = useMemo(() => {
    if (!attackDiscoveryAlertsEnabled) {
      return items;
    }

    const isSingleAttackDiscovery = attackDiscoveries.length === 1;
    const firstAttackDiscovery = isSingleAttackDiscovery ? attackDiscoveries[0] : null;
    const isAlert = firstAttackDiscovery && isAttackDiscoveryAlert(firstAttackDiscovery);

    const isOpen = isAlert && firstAttackDiscovery.alertWorkflowStatus === 'open';
    const isAcknowledged = isAlert && firstAttackDiscovery.alertWorkflowStatus === 'acknowledged';
    const isClosed = isAlert && firstAttackDiscovery.alertWorkflowStatus === 'closed';

    const markAsOpenItem = !isOpen
      ? [
          <EuiContextMenuItem
            data-test-subj="markAsOpen"
            key="markAsOpen"
            onClick={onClickMarkAsOpen}
          >
            {i18n.MARK_AS_OPEN}
          </EuiContextMenuItem>,
        ]
      : [];

    const markAsAcknowledgedItem = !isAcknowledged
      ? [
          <EuiContextMenuItem
            data-test-subj="markAsAcknowledged"
            key="markAsAcknowledged"
            onClick={onClickMarkAsAcknowledged}
          >
            {i18n.MARK_AS_ACKNOWLEDGED}
          </EuiContextMenuItem>,
        ]
      : [];

    const markAsClosedItem = !isClosed
      ? [
          <EuiContextMenuItem
            data-test-subj="markAsClosed"
            key="markAsClosed"
            onClick={onClickMarkAsClosed}
          >
            {i18n.MARK_AS_CLOSED}
          </EuiContextMenuItem>,
        ]
      : [];

    return [...markAsOpenItem, ...markAsAcknowledgedItem, ...markAsClosedItem, ...items].flat();
  }, [
    attackDiscoveries,
    attackDiscoveryAlertsEnabled,
    items,
    onClickMarkAsAcknowledged,
    onClickMarkAsClosed,
    onClickMarkAsOpen,
  ]);

  const onConfirm = useCallback(
    async (updateAlerts: boolean) => {
      if (pendingAction !== null) {
        setPendingAction(null);

        await attackDiscoveryBulk({
          attackDiscoveryAlertsEnabled,
          ids: attackDiscoveryIds,
          kibanaAlertWorkflowStatus: pendingAction,
        });

        if (updateAlerts && alertIds.length > 0) {
          await updateAlertStatus({
            ids: alertIds,
            kibanaAlertWorkflowStatus: pendingAction,
          });
        }

        setSelectedAttackDiscoveries({});
        refetchFindAttackDiscoveries?.();
      }
    },
    [
      alertIds,
      attackDiscoveryAlertsEnabled,
      attackDiscoveryBulk,
      attackDiscoveryIds,
      pendingAction,
      refetchFindAttackDiscoveries,
      setSelectedAttackDiscoveries,
      updateAlertStatus,
    ]
  );

  const onCloseOrCancel = useCallback(() => {
    setPendingAction(null);
  }, []);

  return (
    <>
      <EuiPopover
        anchorPosition="downCenter"
        button={button}
        closePopover={closePopover}
        data-test-subj="takeAction"
        id={takeActionContextMenuPopoverId}
        isOpen={isPopoverOpen}
        panelPaddingSize="none"
      >
        <EuiContextMenuPanel size="s" items={allItems} />
      </EuiPopover>

      {pendingAction != null && (
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
