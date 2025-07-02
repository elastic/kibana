/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import { EuiFilterButton, EuiPopover, EuiSelectable } from '@elastic/eui';
import type { EuiSelectableOnChangeEvent } from '@elastic/eui/src/components/selectable/selectable';
import { RuleTranslationResult } from '../../../../../../common/siem_migrations/constants';
import { convertTranslationResultIntoText } from '../../../utils/translation_results';
import { StatusFilter } from '../../../types';
import * as i18n from './translations';

const STATUS_FILTER_POPOVER_WIDTH = 250;

export interface StatusFilterButtonProps {
  status?: StatusFilter;
  onStatusChanged: (newStatus?: StatusFilter) => void;
}

export const StatusFilterButton: React.FC<StatusFilterButtonProps> = React.memo(
  ({ status, onStatusChanged }) => {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    const selectableOptions: EuiSelectableOption[] = [
      {
        label: i18n.INSTALL_FILTER_OPTION,
        data: { status: StatusFilter.INSTALLED },
        checked: status === StatusFilter.INSTALLED ? 'on' : undefined,
      },
      {
        label: convertTranslationResultIntoText(RuleTranslationResult.FULL),
        data: { status: StatusFilter.TRANSLATED },
        checked: status === StatusFilter.TRANSLATED ? 'on' : undefined,
      },
      {
        label: convertTranslationResultIntoText(RuleTranslationResult.PARTIAL),
        data: { status: StatusFilter.PARTIALLY_TRANSLATED },
        checked: status === StatusFilter.PARTIALLY_TRANSLATED ? 'on' : undefined,
      },
      {
        label: convertTranslationResultIntoText(RuleTranslationResult.UNTRANSLATABLE),
        data: { status: StatusFilter.UNTRANSLATABLE },
        checked: status === StatusFilter.UNTRANSLATABLE ? 'on' : undefined,
      },
      {
        label: i18n.FAILED_FILTER_OPTION,
        data: { status: StatusFilter.FAILED },
        checked: status === StatusFilter.FAILED ? 'on' : undefined,
      },
    ];

    const handleOptionsChange = useCallback(
      (
        _options: EuiSelectableOption[],
        _event: EuiSelectableOnChangeEvent,
        changedOption: EuiSelectableOption
      ) => {
        setIsPopoverOpen(false);

        if (changedOption.checked && changedOption?.data?.status) {
          onStatusChanged(changedOption.data.status);
        } else if (!changedOption.checked) {
          onStatusChanged();
        }
      },
      [onStatusChanged]
    );

    const triggerButton = (
      <EuiFilterButton
        grow
        iconType="arrowDown"
        onClick={() => {
          setIsPopoverOpen(!isPopoverOpen);
        }}
        isSelected={isPopoverOpen}
        hasActiveFilters={status !== undefined}
        numActiveFilters={status ? 1 : 0}
        data-test-subj="statusFilterButton"
      >
        {i18n.STATUS_BUTTON_TITLE}
      </EuiFilterButton>
    );

    return (
      <EuiPopover
        ownFocus
        button={triggerButton}
        isOpen={isPopoverOpen}
        closePopover={() => {
          setIsPopoverOpen(!isPopoverOpen);
        }}
        panelPaddingSize="none"
        repositionOnScroll
      >
        <EuiSelectable
          aria-label={i18n.STATUS_FILTER_ARIAL_LABEL}
          options={selectableOptions}
          onChange={handleOptionsChange}
          singleSelection
          data-test-subj="statusFilterSelectableList"
        >
          {(list) => <div style={{ width: STATUS_FILTER_POPOVER_WIDTH }}>{list}</div>}
        </EuiSelectable>
      </EuiPopover>
    );
  }
);
StatusFilterButton.displayName = 'StatusFilterButton';
