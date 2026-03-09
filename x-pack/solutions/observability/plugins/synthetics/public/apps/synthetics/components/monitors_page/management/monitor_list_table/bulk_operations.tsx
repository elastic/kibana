/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { EncryptedSyntheticsSavedMonitor } from '../../../../../../../common/runtime_types';
import { ConfigKey } from '../../../../../../../common/runtime_types';
import { useMonitorIntegrationStatus } from '../../../common/hooks/use_monitor_integration_status';

export const BulkOperations = ({
  selectedItems,
  setMonitorPendingDeletion,
}: {
  selectedItems: EncryptedSyntheticsSavedMonitor[];
  setMonitorPendingDeletion: (val: string[]) => void;
}) => {
  const { hasMissingIntegrations, resetMonitors, isResetting } =
    useMonitorIntegrationStatus();

  const onDeleted = () => {
    setMonitorPendingDeletion(selectedItems.map((item) => item[ConfigKey.CONFIG_ID]));
  };

  const selectedConfigIds = selectedItems.map((item) => item[ConfigKey.CONFIG_ID]);
  const missingIds = selectedConfigIds.filter((id) => hasMissingIntegrations(id));

  const onReset = useCallback(async () => {
    await resetMonitors(missingIds);
  }, [resetMonitors, missingIds]);

  if (selectedItems.length === 0) {
    return null;
  }

  return (
    <EuiFlexGroup gutterSize="s" responsive={false}>
      {missingIds.length > 0 && (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-test-subj="syntheticsBulkResetIntegrationButton"
            iconType="refresh"
            iconSide="left"
            onClick={onReset}
            isLoading={isResetting}
            color="warning"
          >
            {i18n.translate('xpack.synthetics.bulkOperations.resetIntegration', {
              defaultMessage:
                'Reset {count, number} {count, plural, one {monitor} other {monitors}}',
              values: { count: missingIds.length },
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          data-test-subj="syntheticsBulkOperationPopoverClickMeToLoadAContextMenuButton"
          iconType="trash"
          iconSide="left"
          onClick={onDeleted}
          color="danger"
        >
          {i18n.translate('xpack.synthetics.bulkOperationPopover.clickMeToLoadButtonLabel', {
            defaultMessage:
              'Delete {monitorCount, number} selected {monitorCount, plural, one {monitor} other {monitors}}',
            values: { monitorCount: selectedItems.length },
          })}
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
