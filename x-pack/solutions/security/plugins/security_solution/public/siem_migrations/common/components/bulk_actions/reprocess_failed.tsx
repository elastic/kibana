/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import React, { useMemo, memo } from 'react';
import * as i18n from './translations';
import { SiemMigrationStatus } from '../../../../../common/siem_migrations/constants';
import type { BulkActionsItem } from './types';

export interface ReprocessFailedItemsButtonProps {
  isAuthorized: boolean;
  isDisabled?: boolean;
  isLoading?: boolean;
  numberOfFailedItems: number;
  onClick?: () => void;
  selectedItems: BulkActionsItem[];
}

export const ReprocessFailedItemsButton = memo(
  ({
    isAuthorized,
    isDisabled = false,
    isLoading = false,
    numberOfFailedItems,
    onClick,
    selectedItems,
  }: ReprocessFailedItemsButtonProps) => {
    const numberOfFailedItemsSelected = useMemo(
      () => selectedItems.filter((item) => item.status === SiemMigrationStatus.FAILED).length,
      [selectedItems]
    );
    const isSelected = numberOfFailedItemsSelected > 0;
    return (
      <EuiButton
        iconType="refresh"
        color={'warning'}
        onClick={onClick}
        disabled={isDisabled || !isAuthorized}
        isLoading={isLoading}
        data-test-subj="reprocessFailedItemsButton"
        aria-label={i18n.REPROCESS_FAILED_ARIA_LABEL}
      >
        {isSelected
          ? i18n.REPROCESS_FAILED_SELECTED_ITEMS(numberOfFailedItemsSelected)
          : i18n.REPROCESS_FAILED_ITEMS(numberOfFailedItems)}
      </EuiButton>
    );
  }
);
ReprocessFailedItemsButton.displayName = 'ReprocessFailedItemsButton';
