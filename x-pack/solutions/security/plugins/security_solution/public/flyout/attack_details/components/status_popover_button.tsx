/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenu, EuiPopover, EuiPopoverTitle } from '@elastic/eui';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';

import { i18n } from '@kbn/i18n';
import { FILTER_OPEN } from '@kbn/securitysolution-data-table';
import { FILTER_CLOSED } from '@kbn/securitysolution-data-table/common/types';
import { getOriginalAlertIds } from '@kbn/elastic-assistant-common';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { UpdateAlertsModal } from '../../../attack_discovery/pages/results/take_action/update_alerts_modal';
import { useUpdateAlertsStatus } from '../../../attack_discovery/pages/results/take_action/use_update_alerts_status';
import { useAttackDiscoveryBulk } from '../../../attack_discovery/pages/use_attack_discovery_bulk';
import { FILTER_ACKNOWLEDGED } from '../../../../common/types';
import type { Status } from '../../../../common/api/detection_engine';
import { CLICK_TO_CHANGE_ALERT_STATUS } from '../../../detections/components/alerts_table/translations';
import { FormattedFieldValue } from '../../../timelines/components/timeline/body/renderers/formatted_field';
import { getFieldFormat } from '../../document_details/right/utils/get_field_format';
import type { EnrichedFieldInfoWithValues } from '../../document_details/right/utils/enriched_field_info';
import {
  MARK_AS_ACKNOWLEDGED,
  MARK_AS_CLOSED,
  MARK_AS_OPEN,
} from '../../../attack_discovery/pages/results/take_action/translations';
import { useAttackDetailsContext } from '../context';
import { STATUS_POPOVER_BUTTON_TEST_ID, STATUS_POPOVER_TEST_ID } from '../constants/test_ids';
import { useHeaderData } from '../hooks/use_header_data';

interface StatusPopoverButtonProps {
  /**
   * Information used to
   */
  enrichedFieldInfo: EnrichedFieldInfoWithValues;
}

/**
 * Renders a button and its popover + modal to display the status of an attack and allows the user to change it.
 * It is used in the header of the attack details flyout.
 */
export const StatusPopoverButton = memo(({ enrichedFieldInfo }: StatusPopoverButtonProps) => {
  const { attackId } = useAttackDetailsContext();
  const { replacements, alertIds } = useHeaderData();
  const currentSpaceId = useSpaceId();
  const [pendingAction, setPendingAction] = useState<'open' | 'acknowledged' | 'closed' | null>(
    null
  );
  const { closeFlyout } = useExpandableFlyoutApi();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const togglePopover = useCallback(() => setIsPopoverOpen(!isPopoverOpen), [isPopoverOpen]);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const currentStatus = useMemo(
    () => enrichedFieldInfo.values[0] as Status,
    [enrichedFieldInfo.values]
  );

  const { mutateAsync: attackDiscoveryBulk } = useAttackDiscoveryBulk();
  const { mutateAsync: updateAlertStatus } = useUpdateAlertsStatus();

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
        ids: [attackId],
        kibanaAlertWorkflowStatus: workflowStatus,
      });

      if (updateAlerts && alertIds.length > 0) {
        const originalAlertIds = getOriginalAlertIds({ alertIds, replacements });

        await updateAlertStatus({
          ids: originalAlertIds,
          kibanaAlertWorkflowStatus: workflowStatus,
        });
      }
      closeFlyout();
    },
    [alertIds, attackDiscoveryBulk, attackId, closeFlyout, replacements, updateAlertStatus]
  );

  const onUpdateWorkflowStatus = useCallback(
    async (workflowStatus: 'open' | 'acknowledged' | 'closed') => {
      setPendingAction(workflowStatus);
      closePopover();
    },
    [closePopover]
  );

  const button = useMemo(
    () => (
      <FormattedFieldValue
        contextId={`${currentSpaceId}-attack-details-flyout-status-popover-button`}
        eventId={attackId}
        value={enrichedFieldInfo.values[0]}
        fieldName={enrichedFieldInfo.data.field}
        linkValue={enrichedFieldInfo.linkValue}
        fieldType={enrichedFieldInfo.data.type}
        fieldFormat={getFieldFormat(enrichedFieldInfo.data)}
        truncate={false}
        isButton={true}
        onClick={true ? togglePopover : undefined}
        onClickAriaLabel={CLICK_TO_CHANGE_ALERT_STATUS}
      />
    ),
    [
      currentSpaceId,
      attackId,
      enrichedFieldInfo.values,
      enrichedFieldInfo.data,
      enrichedFieldInfo.linkValue,
      togglePopover,
    ]
  );

  const panels = useMemo(() => {
    const actionItems = [];

    if (currentStatus !== FILTER_OPEN) {
      actionItems.push({
        key: 'open',
        'data-test-subj': 'open-attack-status',
        onClick: () => onUpdateWorkflowStatus('open'),
        name: MARK_AS_OPEN,
      });
    }
    if (currentStatus !== FILTER_ACKNOWLEDGED) {
      actionItems.push({
        key: 'acknowledge',
        'data-test-subj': 'acknowledged-attack-status',
        onClick: () => onUpdateWorkflowStatus('acknowledged'),
        name: MARK_AS_ACKNOWLEDGED,
      });
    }
    if (currentStatus !== FILTER_CLOSED) {
      actionItems.push({
        key: 'close',
        'data-test-subj': 'closed-attack-status',
        onClick: () => onUpdateWorkflowStatus('closed'),
        name: MARK_AS_CLOSED,
      });
    }

    return [{ id: 0, items: actionItems }];
  }, [currentStatus, onUpdateWorkflowStatus]);

  const onCloseOrCancel = useCallback(() => {
    setPendingAction(null);
  }, []);

  return (
    <>
      <EuiPopover
        button={button}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        data-test-subj={STATUS_POPOVER_TEST_ID}
      >
        <EuiPopoverTitle paddingSize="m">
          {i18n.translate(
            'xpack.securitySolution.attackDetailsFlyout.header.popover.changeAttackStatus',
            {
              defaultMessage: 'Change attack status',
            }
          )}
        </EuiPopoverTitle>
        <EuiContextMenu
          panels={panels}
          initialPanelId={0}
          data-test-subj={STATUS_POPOVER_BUTTON_TEST_ID}
        />
      </EuiPopover>
      {pendingAction != null && (
        <UpdateAlertsModal
          alertsCount={alertIds.length}
          attackDiscoveriesCount={1}
          onCancel={onCloseOrCancel}
          onClose={onCloseOrCancel}
          onConfirm={onConfirm}
          workflowStatus={pendingAction}
        />
      )}
    </>
  );
});

StatusPopoverButton.displayName = 'StatusPopoverButton';
