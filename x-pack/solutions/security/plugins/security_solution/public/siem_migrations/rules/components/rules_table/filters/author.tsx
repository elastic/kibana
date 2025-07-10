/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import { EuiFilterButton, EuiPopover, EuiSelectable } from '@elastic/eui';
import type { EuiSelectableOnChangeEvent } from '@elastic/eui/src/components/selectable/selectable';
import { AuthorFilter } from '../../../types';
import * as i18n from './translations';

const AUTHOR_FILTER_POPOVER_WIDTH = 150;

export interface AuthorFilterButtonProps {
  author?: AuthorFilter;
  onAuthorChanged: (newAuthor?: AuthorFilter) => void;
}

export const AuthorFilterButton: React.FC<AuthorFilterButtonProps> = React.memo(
  ({ author, onAuthorChanged }) => {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    const selectableOptions: EuiSelectableOption[] = useMemo(
      () => [
        {
          label: i18n.ELASTIC_AUTHOR_FILTER_OPTION,
          data: { author: AuthorFilter.ELASTIC },
          checked: author === AuthorFilter.ELASTIC ? 'on' : undefined,
        },
        {
          label: i18n.CUSTOM_AUTHOR_FILTER_OPTION,
          data: { author: AuthorFilter.CUSTOM },
          checked: author === AuthorFilter.CUSTOM ? 'on' : undefined,
        },
      ],
      [author]
    );

    const handleOptionsChange = useCallback(
      (
        _options: EuiSelectableOption[],
        _event: EuiSelectableOnChangeEvent,
        changedOption: EuiSelectableOption
      ) => {
        setIsPopoverOpen(false);

        if (changedOption.checked && changedOption?.data?.author) {
          onAuthorChanged(changedOption.data.author);
        } else if (!changedOption.checked) {
          onAuthorChanged();
        }
      },
      [onAuthorChanged]
    );

    const triggerButton = (
      <EuiFilterButton
        grow
        iconType="arrowDown"
        onClick={() => {
          setIsPopoverOpen(!isPopoverOpen);
        }}
        isSelected={isPopoverOpen}
        hasActiveFilters={author !== undefined}
        numActiveFilters={author ? 1 : 0}
        data-test-subj="authorFilterButton"
      >
        {i18n.AUTHOR_BUTTON_TITLE}
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
          aria-label={i18n.AUTHOR_FILTER_ARIAL_LABEL}
          options={selectableOptions}
          onChange={handleOptionsChange}
          singleSelection
          data-test-subj="authorFilterSelectableList"
        >
          {(list) => <div style={{ width: AUTHOR_FILTER_POPOVER_WIDTH }}>{list}</div>}
        </EuiSelectable>
      </EuiPopover>
    );
  }
);
AuthorFilterButton.displayName = 'AuthorFilterButton';
