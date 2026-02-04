/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiFilterButton,
  EuiFilterGroup,
  EuiPopover,
  EuiSelectable,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import * as i18n from '../../../../common/translations';
import { SortFieldInferenceEndpoint } from '../types';

const listContainerStyles = css`
  width: 150px;
`;

interface SortOption {
  field: SortFieldInferenceEndpoint;
  label: string;
}

const SORT_OPTIONS: SortOption[] = [
  { field: SortFieldInferenceEndpoint.inference_id, label: i18n.SORT_BY_ENDPOINT },
  { field: SortFieldInferenceEndpoint.service, label: i18n.SORT_BY_SERVICE },
  { field: SortFieldInferenceEndpoint.task_type, label: i18n.SORT_BY_TYPE },
  { field: SortFieldInferenceEndpoint.model, label: i18n.SORT_BY_MODEL },
];

interface SortButtonProps {
  selectedSortField: SortFieldInferenceEndpoint;
  onSortFieldChange: (field: SortFieldInferenceEndpoint) => void;
}

export const SortButton: React.FC<SortButtonProps> = ({ selectedSortField, onSortFieldChange }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const popoverId = useGeneratedHtmlId({ prefix: 'sortPopover' });

  const togglePopover = useCallback(() => {
    setIsPopoverOpen((prev) => !prev);
  }, []);

  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  const selectableOptions = useMemo<EuiSelectableOption[]>(() => {
    return SORT_OPTIONS.map((option) => ({
      key: option.field,
      label: option.label,
      checked: option.field === selectedSortField ? 'on' : undefined,
    }));
  }, [selectedSortField]);

  const handleSortFieldChange = useCallback(
    (options: EuiSelectableOption[]) => {
      const selectedOption = options.find((opt) => opt.checked === 'on');
      if (selectedOption?.key) {
        onSortFieldChange(selectedOption.key as SortFieldInferenceEndpoint);
        closePopover();
      }
    },
    [onSortFieldChange, closePopover]
  );

  return (
    <EuiFilterGroup data-test-subj="sortFieldEndpoints">
      <EuiPopover
        id={popoverId}
        button={
          <EuiFilterButton
            iconType="arrowDown"
            onClick={togglePopover}
            isSelected={isPopoverOpen}
            data-test-subj="sortButton"
          >
            {i18n.SORT}
          </EuiFilterButton>
        }
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        repositionOnScroll
      >
        <EuiSelectable
          options={selectableOptions}
          singleSelection
          onChange={handleSortFieldChange}
          listProps={{
            bordered: false,
            showIcons: true,
            onFocusBadge: false,
          }}
        >
          {(list) => <div css={listContainerStyles}>{list}</div>}
        </EuiSelectable>
      </EuiPopover>
    </EuiFilterGroup>
  );
};
