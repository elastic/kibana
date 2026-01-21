/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, memo } from 'react';
import { EuiFlexItem, EuiButton } from '@elastic/eui';
import * as i18n from './translations';
import { MigrationTranslationResult } from '../../../../../common/siem_migrations/constants';
import type { BulkActionsItem } from './types';

interface InstallTranslatedButtonProps {
  disableInstallTranslatedItemsButton: boolean;
  installTranslatedItems: () => void;
  installSelectedItem: () => void;
  isLoading: boolean;
  numberOfTranslatedItems: number;
  selectedItems: BulkActionsItem[];
}

export const InstallTranslatedButton = memo(
  ({
    disableInstallTranslatedItemsButton,
    installTranslatedItems,
    installSelectedItem,
    isLoading,
    numberOfTranslatedItems,
    selectedItems,
  }: InstallTranslatedButtonProps) => {
    const numberOfSelectedItems = selectedItems.length;
    const installTranslatedItemsSelected = useMemo(
      () =>
        selectedItems.filter(
          (item) =>
            item.translation_result === MigrationTranslationResult.FULL ||
            item.translation_result === MigrationTranslationResult.PARTIAL
        ).length,
      [selectedItems]
    );
    const isSelected = installTranslatedItemsSelected > 0;
    const onClick = useCallback(() => {
      if (numberOfSelectedItems === 0) {
        installTranslatedItems?.();
      } else {
        installSelectedItem?.();
      }
    }, [numberOfSelectedItems, installTranslatedItems, installSelectedItem]);

    let buttonText = i18n.INSTALL_TRANSLATED_ITEMS_EMPTY_STATE;
    if (numberOfSelectedItems > 0) {
      buttonText = i18n.INSTALL_SELECTED_ITEMS(
        isSelected ? installTranslatedItemsSelected : numberOfSelectedItems
      );
    } else if (numberOfTranslatedItems > 0) {
      buttonText = i18n.INSTALL_TRANSLATED_ITEMS(
        isSelected ? installTranslatedItemsSelected : numberOfTranslatedItems
      );
    }

    const ariaLabel =
      numberOfSelectedItems === 0
        ? i18n.INSTALL_TRANSLATED_ARIA_LABEL
        : i18n.INSTALL_SELECTED_ARIA_LABEL;

    const dataTestSubj =
      numberOfSelectedItems === 0 ? 'installTranslatedItemsButton' : 'installSelectedItemsButton';

    return (
      <EuiFlexItem grow={false}>
        <EuiButton
          iconType="plusInCircle"
          onClick={onClick}
          disabled={disableInstallTranslatedItemsButton}
          isLoading={isLoading}
          data-test-subj={dataTestSubj}
          aria-label={ariaLabel}
        >
          {buttonText}
        </EuiButton>
      </EuiFlexItem>
    );
  }
);
InstallTranslatedButton.displayName = 'InstallTranslatedButton';
