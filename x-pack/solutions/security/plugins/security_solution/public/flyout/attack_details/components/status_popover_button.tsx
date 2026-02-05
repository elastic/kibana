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
import type { inputsModel } from '../../../common/store';
import { inputsSelectors } from '../../../common/store';
import { useInvalidateFindAttackDiscoveries } from '../../../attack_discovery/pages/use_find_attack_discoveries';
import { useAttackWorkflowStatusContextMenuItems } from '../../../detections/hooks/attacks/bulk_actions/context_menu_items/use_attack_workflow_status_context_menu_items';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { CLICK_TO_CHANGE_ALERT_STATUS } from '../../../detections/components/alerts_table/translations';
import { FormattedFieldValue } from '../../../timelines/components/timeline/body/renderers/formatted_field';
import { getFieldFormat } from '../../document_details/right/utils/get_field_format';
import type { EnrichedFieldInfoWithValues } from '../../document_details/right/utils/enriched_field_info';
import { useAttackDetailsContext } from '../context';
import { STATUS_POPOVER_BUTTON_TEST_ID, STATUS_POPOVER_TEST_ID } from '../constants/test_ids';
import { useHeaderData } from '../hooks/use_header_data';
import type { AlertWorkflowStatus } from '../../../common/types';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';

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
  const { alertIds } = useHeaderData();
  const currentSpaceId = useSpaceId();
  const { closeFlyout } = useExpandableFlyoutApi();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const togglePopover = useCallback(() => setIsPopoverOpen(!isPopoverOpen), [isPopoverOpen]);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuery(), []);

  const globalQueries = useDeepEqualSelector(getGlobalQuerySelector);

  // refetch alerts after status change
  const refetchGlobalQuery = useCallback(() => {
    globalQueries.forEach((q) => q.refetch && (q.refetch as inputsModel.Refetch)());
  }, [globalQueries]);

  // force attacks to be refetched automatically after status change
  const invalidateFindAttackDiscoveries = useInvalidateFindAttackDiscoveries();

  const currentWorkflowStatus = useMemo(
    () => enrichedFieldInfo.values[0] as AlertWorkflowStatus,
    [enrichedFieldInfo.values]
  );
  const onWorkflowStatusChange = useCallback(() => {
    invalidateFindAttackDiscoveries();
    refetchGlobalQuery();
    closeFlyout();
  }, [closeFlyout, invalidateFindAttackDiscoveries, refetchGlobalQuery]);

  const { items, panels } = useAttackWorkflowStatusContextMenuItems({
    attacksWithWorkflowStatus: [
      {
        attackId,
        relatedAlertIds: alertIds,
        workflowStatus: currentWorkflowStatus,
      },
    ],
    closePopover: togglePopover,
    onSuccess: onWorkflowStatusChange,
  });

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
          panels={[
            {
              id: 0,
              items,
            },
            ...panels,
          ]}
          initialPanelId={0}
          data-test-subj={STATUS_POPOVER_BUTTON_TEST_ID}
        />
      </EuiPopover>
    </>
  );
});

StatusPopoverButton.displayName = 'StatusPopoverButton';
