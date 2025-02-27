/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty } from '@elastic/eui';
import {
  ConfigKey,
  EncryptedSyntheticsSavedMonitor,
} from '../../../../../../../common/runtime_types';

export const BulkOperations = ({
  selectedItems,
  setMonitorPendingDeletion,
}: {
  selectedItems: EncryptedSyntheticsSavedMonitor[];
  setMonitorPendingDeletion: (val: string[]) => void;
}) => {
  const onDeleted = () => {
    setMonitorPendingDeletion(selectedItems.map((item) => item[ConfigKey.CONFIG_ID]));
  };

  if (selectedItems.length === 0) {
    return null;
  }

  return (
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
  );
};
