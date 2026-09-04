/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, memo } from 'react';
import { EuiFlexItem, EuiButton } from '@elastic/eui';
import * as i18n from './translations';
import type { BulkActionsItem } from './types';

interface InstallTranslatedButtonProps {
  disableInstallTranslatedItemsButton: boolean;
  installTranslatedItems: () => void;
  installSelectedItem: () => void;
  isLoading: boolean;
  numberOfTranslatedItems: number;
  selectedItems: BulkActionsItem[];
  /**
   * Predicate that determines whether a selected item can be installed. This differs per
   * migration type (e.g. rules can only install fully translated items, whereas dashboards
   * can also install partially translated ones), so the caller owns the definition.
   */
  isInstallable: (item: BulkActionsItem) => boolean;
}

export const InstallTranslatedButton = memo(
  ({
    disableInstallTranslatedItemsButton,
    installTranslatedItems,
    installSelectedItem,
    isLoading,
    numberOfTranslatedItems,
    selectedItems,
    isInstallable,
  }: InstallTranslatedButtonProps) => {
    const numberOfSelectedItems = selectedItems.length;
    const installableSelectedCount = useMemo(
      () => selectedItems.filter(isInstallable).length,
      [selectedItems, isInstallable]
    );
    const hasInstallableSelection = installableSelectedCount > 0;
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
        hasInstallableSelection ? installableSelectedCount : numberOfSelectedItems
      );
    } else if (numberOfTranslatedItems > 0) {
      buttonText = i18n.INSTALL_TRANSLATED_ITEMS(numberOfTranslatedItems);
    }

    const ariaLabel =
      numberOfSelectedItems === 0
        ? i18n.INSTALL_TRANSLATED_ARIA_LABEL
        : i18n.INSTALL_SELECTED_ARIA_LABEL;

    const dataTestSubj =
      numberOfSelectedItems === 0 ? 'installTranslatedItemsButton' : 'installSelectedItemsButton';

    // When the user has a selection but none of the selected items can be installed, the action
    // would be a no-op on the server, so we disable the button.
    const hasSelectionButNoneInstallable = numberOfSelectedItems > 0 && !hasInstallableSelection;
    const isDisabled = disableInstallTranslatedItemsButton || hasSelectionButNoneInstallable;

    return (
      <EuiFlexItem grow={false}>
        <EuiButton
          iconType="plusCircle"
          onClick={onClick}
          disabled={isDisabled}
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
