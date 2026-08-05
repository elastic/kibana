/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiContextMenuPanelItemDescriptor } from '@elastic/eui';
import { EuiButton, EuiContextMenu, EuiPopover } from '@elastic/eui';
import type { EncryptedSyntheticsSavedMonitor } from '../../../../../../../common/runtime_types';
import { ConfigKey } from '../../../../../../../common/runtime_types';
import {
  useCanEditSynthetics,
  useCanUsePublicLocationsPermission,
} from '../../../../../../hooks/use_capabilities';
import { useEnablement } from '../../../../hooks';
import { CANNOT_PERFORM_ACTION_SYNTHETICS } from '../../../common/components/permissions';
import { SERVICE_NOT_ALLOWED } from '../disabled_callout';
import { useMonitorIntegrationHealth } from '../../../common/hooks/use_monitor_integration_health';
import { isMonitorBulkEditable } from './bulk_edit_eligibility';

export const BulkOperations = ({
  selectedItems,
  setMonitorPendingDeletion,
  setMonitorPendingReset,
  setMonitorPendingStatusUpdate,
}: {
  selectedItems: EncryptedSyntheticsSavedMonitor[];
  setMonitorPendingDeletion: (val: string[]) => void;
  setMonitorPendingReset: (val: {
    resetIds: string[];
    skippedMonitors: Array<{ id: string; name: string }>;
  }) => void;
  setMonitorPendingStatusUpdate: (val: { ids: string[]; enabled: boolean } | null) => void;
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { isUnhealthy, isFixableByReset } = useMonitorIntegrationHealth();
  const canEditSynthetics = useCanEditSynthetics();
  const canUsePublicLocations = useCanUsePublicLocationsPermission();
  const { isServiceAllowed } = useEnablement();

  const closePopover = () => setIsPopoverOpen(false);

  const selectedConfigIds = selectedItems.map((item) => item[ConfigKey.CONFIG_ID]);
  const unhealthyConfigIds = selectedConfigIds.filter((id) => isUnhealthy(id));
  const resetIds = unhealthyConfigIds.filter((id) => isFixableByReset(id));
  const skippedMonitors = selectedItems
    .filter((item) => {
      const id = item[ConfigKey.CONFIG_ID];
      return isUnhealthy(id) && !isFixableByReset(id);
    })
    .map((item) => ({ id: item[ConfigKey.CONFIG_ID], name: item[ConfigKey.NAME] }));

  // Enable/Disable are per-current-state: only the monitors that would actually
  // change are counted and patched, so we avoid re-syncing Fleet policies for
  // monitors already in the target state. The full by-state set is still handed
  // to the modal so it can surface the ineligible (project/terraform, or
  // permission-restricted) monitors as skipped.
  const enableCandidates = selectedItems.filter((item) => !item[ConfigKey.ENABLED]);
  const disableCandidates = selectedItems.filter((item) => item[ConfigKey.ENABLED]);
  const enableIds = enableCandidates.map((item) => item[ConfigKey.CONFIG_ID]);
  const disableIds = disableCandidates.map((item) => item[ConfigKey.CONFIG_ID]);

  // Counts/disabled state reflect only monitors that can actually be updated, so
  // the menu never offers an action that would open a modal with nothing to do.
  const eligibleEnableCount = enableCandidates.filter((item) =>
    isMonitorBulkEditable(item, canUsePublicLocations)
  ).length;
  const eligibleDisableCount = disableCandidates.filter((item) =>
    isMonitorBulkEditable(item, canUsePublicLocations)
  ).length;

  if (selectedItems.length === 0) {
    return null;
  }

  const isActionDisabled = !canEditSynthetics || !isServiceAllowed;
  const disabledTooltip = !canEditSynthetics
    ? CANNOT_PERFORM_ACTION_SYNTHETICS
    : !isServiceAllowed
    ? SERVICE_NOT_ALLOWED
    : undefined;

  const items: EuiContextMenuPanelItemDescriptor[] = [
    {
      name:
        eligibleEnableCount > 0
          ? i18n.translate('xpack.synthetics.bulkOperations.enableMonitors', {
              defaultMessage:
                'Enable {count, number} {count, plural, one {monitor} other {monitors}}',
              values: { count: eligibleEnableCount },
            })
          : i18n.translate('xpack.synthetics.bulkOperations.enableMonitorsEmpty', {
              defaultMessage: 'Enable monitors',
            }),
      icon: 'play',
      disabled: isActionDisabled || eligibleEnableCount === 0,
      toolTipContent:
        disabledTooltip ??
        (eligibleEnableCount === 0
          ? enableCandidates.length === 0
            ? ALL_ALREADY_ENABLED
            : NO_ELIGIBLE_TO_ENABLE
          : undefined),
      'data-test-subj': 'syntheticsBulkEnableMonitorsItem',
      onClick: () => {
        closePopover();
        setMonitorPendingStatusUpdate({ ids: enableIds, enabled: true });
      },
    },
    {
      name:
        eligibleDisableCount > 0
          ? i18n.translate('xpack.synthetics.bulkOperations.disableMonitors', {
              defaultMessage:
                'Disable {count, number} {count, plural, one {monitor} other {monitors}}',
              values: { count: eligibleDisableCount },
            })
          : i18n.translate('xpack.synthetics.bulkOperations.disableMonitorsEmpty', {
              defaultMessage: 'Disable monitors',
            }),
      icon: 'pause',
      disabled: isActionDisabled || eligibleDisableCount === 0,
      toolTipContent:
        disabledTooltip ??
        (eligibleDisableCount === 0
          ? disableCandidates.length === 0
            ? ALL_ALREADY_DISABLED
            : NO_ELIGIBLE_TO_DISABLE
          : undefined),
      'data-test-subj': 'syntheticsBulkDisableMonitorsItem',
      onClick: () => {
        closePopover();
        setMonitorPendingStatusUpdate({ ids: disableIds, enabled: false });
      },
    },
    ...(resetIds.length > 0
      ? [
          {
            name: i18n.translate('xpack.synthetics.bulkOperations.resetIntegration', {
              defaultMessage:
                'Reset {count, number} {count, plural, one {monitor} other {monitors}}',
              values: { count: resetIds.length },
            }),
            icon: 'refresh',
            'data-test-subj': 'syntheticsBulkResetIntegrationButton',
            onClick: () => {
              closePopover();
              setMonitorPendingReset({ resetIds, skippedMonitors });
            },
          } as EuiContextMenuPanelItemDescriptor,
        ]
      : []),
    {
      name: i18n.translate('xpack.synthetics.bulkOperationPopover.clickMeToLoadButtonLabel', {
        defaultMessage:
          'Delete {monitorCount, number} selected {monitorCount, plural, one {monitor} other {monitors}}',
        values: { monitorCount: selectedItems.length },
      }),
      icon: 'trash',
      'data-test-subj': 'syntheticsBulkDeleteMonitorsItem',
      onClick: () => {
        closePopover();
        setMonitorPendingDeletion(selectedConfigIds);
      },
    },
  ];

  return (
    <EuiPopover
      button={
        <EuiButton
          data-test-subj="syntheticsBulkActionsButton"
          size="s"
          iconType="arrowDown"
          iconSide="right"
          onClick={() => setIsPopoverOpen((isOpen) => !isOpen)}
        >
          {i18n.translate('xpack.synthetics.bulkOperations.bulkActionsButtonLabel', {
            defaultMessage: 'Bulk actions ({count, number})',
            values: { count: selectedItems.length },
          })}
        </EuiButton>
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenu initialPanelId={0} panels={[{ id: 0, items }]} />
    </EuiPopover>
  );
};

const ALL_ALREADY_ENABLED = i18n.translate('xpack.synthetics.bulkOperations.allAlreadyEnabled', {
  defaultMessage: 'All selected monitors are already enabled.',
});

const ALL_ALREADY_DISABLED = i18n.translate('xpack.synthetics.bulkOperations.allAlreadyDisabled', {
  defaultMessage: 'All selected monitors are already disabled.',
});

const NO_ELIGIBLE_TO_ENABLE = i18n.translate('xpack.synthetics.bulkOperations.noEligibleToEnable', {
  defaultMessage:
    'None of the selected monitors can be enabled here. Project and Terraform-managed monitors, and monitors using locations you cannot access, are excluded.',
});

const NO_ELIGIBLE_TO_DISABLE = i18n.translate(
  'xpack.synthetics.bulkOperations.noEligibleToDisable',
  {
    defaultMessage:
      'None of the selected monitors can be disabled here. Project and Terraform-managed monitors, and monitors using locations you cannot access, are excluded.',
  }
);
