/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiFilterButton,
  EuiFilterGroup,
  EuiPopover,
  EuiSelectable,
  EuiText,
  type EuiSelectableOption,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { EMPTY_FILTER_MESSAGE, GROUP_BY_NONE, GROUP_BY_MODELS } from '../../../common/translations';
import { GroupByOptions } from '../../types';
import { GroupByFilterButton, GroupBySelectableContainer } from './styles';

interface GroupBySelectProps {
  value: GroupByOptions;
  onChange: (value: GroupByOptions) => void;
}

const GROUP_BY_OPTIONS = [
  {
    key: GroupByOptions.None,
    label: GROUP_BY_NONE,
  },
  {
    key: GroupByOptions.Model,
    label: GROUP_BY_MODELS,
  },
];

function parseGroupByValue(value: string | undefined): GroupByOptions {
  switch (value) {
    case GroupByOptions.Model:
      return GroupByOptions.Model;
    case GroupByOptions.None:
    default:
      return GroupByOptions.None;
  }
}

export const GroupBySelect = ({ value, onChange }: GroupBySelectProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const handleValueChange = useCallback(
    (newOptions: EuiSelectableOption[]) => {
      const selectedOption = newOptions.find((option) => option.checked === 'on');
      onChange(parseGroupByValue(selectedOption?.key));
      setIsPopoverOpen(false);
    },
    [onChange]
  );
  const { options, selectedOptionLabel } = useMemo(() => {
    let selectedOption = GROUP_BY_OPTIONS[0].label;
    const selectableOptions: EuiSelectableOption[] = GROUP_BY_OPTIONS.map((option) => {
      if (option.key === value) {
        selectedOption = option.label;
        return { ...option, checked: 'on' };
      }
      return option;
    });
    return {
      options: selectableOptions,
      selectedOptionLabel: selectedOption,
    };
  }, [value]);

  return (
    <EuiFilterGroup data-test-subj="group-by-select">
      <EuiPopover
        ownFocus
        button={
          <EuiFilterButton
            data-test-subj="group-by-button"
            iconType="arrowDown"
            css={GroupByFilterButton}
            onClick={() => setIsPopoverOpen((prevValue) => !prevValue)}
            isSelected={isPopoverOpen}
          >
            <EuiText size="s" className="eui-textTruncate">
              <FormattedMessage
                id="xpack.searchInferenceEndpoints.groupBy.label"
                defaultMessage="Group: {selectedGroup}"
                values={{ selectedGroup: selectedOptionLabel }}
              />
            </EuiText>
          </EuiFilterButton>
        }
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(false)}
        panelPaddingSize="none"
        repositionOnScroll
      >
        <EuiSelectable
          data-test-subj="group-by-selectable"
          options={options}
          emptyMessage={EMPTY_FILTER_MESSAGE}
          onChange={handleValueChange}
          singleSelection="always"
          renderOption={(option) => (
            <span data-test-subj={`group-by-option-${option.key}`}>{option.label}</span>
          )}
          listProps={{
            onFocusBadge: false,
          }}
        >
          {(list, _search) => <div css={GroupBySelectableContainer}>{list}</div>}
        </EuiSelectable>
      </EuiPopover>
    </EuiFilterGroup>
  );
};
