/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Prototype Filter group menu — matches Alerts’ `FilterGroupContextMenu`
 * (boxesVertical → Reset Controls / Edit Controls | Discard Changes).
 * Wired only for facelift v.7 custom MultiselectFilters; max controls is EA-local.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const FILTER_GROUP_MENU = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.filterGroup.menuTitle',
  { defaultMessage: 'Filter group menu' }
);

const CONTEXT_MENU_RESET = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.filterGroup.reset',
  { defaultMessage: 'Reset Controls' }
);

const CONTEXT_MENU_RESET_TOOLTIP = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.filterGroup.resetTooltip',
  { defaultMessage: 'Reset Controls to factory settings' }
);

const EDIT_CONTROLS = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.filterGroup.editControls',
  { defaultMessage: 'Edit Controls' }
);

const DISCARD_CHANGES = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.filterGroup.discardChanges',
  { defaultMessage: 'Discard Changes' }
);

export interface FilterGroupMenuProps {
  isViewMode: boolean;
  onReset: () => void;
  onEdit: () => void;
  onDiscard: () => void;
}

export const FilterGroupMenu: React.FC<FilterGroupMenuProps> = ({
  isViewMode,
  onReset,
  onEdit,
  onDiscard,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = useCallback(() => {
    setIsOpen((open) => !open);
  }, []);

  const withClose = useCallback(
    (action: () => void) => () => {
      action();
      setIsOpen(false);
    },
    []
  );

  const items = useMemo(
    () => [
      <EuiContextMenuItem
        key="reset"
        icon="eraser"
        aria-label={CONTEXT_MENU_RESET}
        onClick={withClose(onReset)}
        data-test-subj="eaFaceliftFilterGroupMenuReset"
        toolTipContent={CONTEXT_MENU_RESET_TOOLTIP}
      >
        {CONTEXT_MENU_RESET}
      </EuiContextMenuItem>,
      <EuiContextMenuItem
        key="edit"
        icon={isViewMode ? 'pencil' : 'minusCircle'}
        aria-label={isViewMode ? EDIT_CONTROLS : DISCARD_CHANGES}
        onClick={withClose(isViewMode ? onEdit : onDiscard)}
        data-test-subj={
          isViewMode ? 'eaFaceliftFilterGroupMenuEdit' : 'eaFaceliftFilterGroupMenuDiscard'
        }
      >
        {isViewMode ? EDIT_CONTROLS : DISCARD_CHANGES}
      </EuiContextMenuItem>,
    ],
    [isViewMode, onDiscard, onEdit, onReset, withClose]
  );

  return (
    <EuiPopover
      id="eaFaceliftFilterGroupMenu"
      aria-label={FILTER_GROUP_MENU}
      button={
        <EuiToolTip content={FILTER_GROUP_MENU} disableScreenReaderOutput>
          <EuiButtonIcon
            aria-label={FILTER_GROUP_MENU}
            display="empty"
            size="s"
            iconType="boxesVertical"
            onClick={toggle}
            data-test-subj="eaFaceliftFilterGroupMenuButton"
          />
        </EuiToolTip>
      }
      isOpen={isOpen}
      closePopover={toggle}
      panelPaddingSize="none"
      anchorPosition="downLeft"
      panelProps={{
        'data-test-subj': 'eaFaceliftFilterGroupMenuPanel',
      }}
    >
      <EuiContextMenuPanel items={items} />
    </EuiPopover>
  );
};
