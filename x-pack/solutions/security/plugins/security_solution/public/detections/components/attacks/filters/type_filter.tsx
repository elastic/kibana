/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSelectable,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useMemo, useState } from 'react';

import * as i18n from './translations';
import { useKibana } from '../../../../common/lib/kibana';
import { AttacksEventTypes } from '../../../../common/lib/telemetry';

const LIST_PROPS = {
  isVirtualized: false,
  rowHeight: 40,
};

export const TYPE_FILTER_SCHEDULED = 'scheduled';
export const TYPE_FILTER_MANUALLY_GENERATED = 'manually_generated';

export interface TypeFilterProps {
  selectedTypes: string[];
  setSelectedTypes: React.Dispatch<React.SetStateAction<string[]>>;
  compressed?: boolean;
}

const TypeFilterComponent: React.FC<TypeFilterProps> = ({
  selectedTypes,
  setSelectedTypes,
  compressed = false,
}) => {
  const {
    services: { telemetry },
  } = useKibana();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const onFilterButtonClick = useCallback(() => {
    setIsPopoverOpen((isOpen) => !isOpen);
  }, []);

  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  const filterGroupPopoverId = useGeneratedHtmlId({
    prefix: 'typeFilterGroupPopover',
  });

  const typeFilterItems: Array<EuiSelectableOption> = useMemo(() => {
    return [
      {
        checked: selectedTypes.includes(TYPE_FILTER_SCHEDULED) ? 'on' : undefined,
        label: i18n.SCHEDULED,
        key: TYPE_FILTER_SCHEDULED,
      },
      {
        checked: selectedTypes.includes(TYPE_FILTER_MANUALLY_GENERATED) ? 'on' : undefined,
        label: i18n.MANUALLY_GENERATED,
        key: TYPE_FILTER_MANUALLY_GENERATED,
      },
    ];
  }, [selectedTypes]);

  const renderOption = useCallback(
    (option: EuiSelectableOption) => (
      <EuiFlexGroup
        css={css`
          height: 33px;
        `}
        data-test-subj={`typeFilterOption-${option.key}`}
        direction="column"
        gutterSize="none"
        justifyContent="center"
      >
        <EuiFlexItem grow={false}>
          <EuiText
            css={css`
              font-weight: bold;
            `}
            data-test-subj="optionLabel"
            size="s"
          >
            {option.label}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    []
  );

  const button = useMemo(
    () => (
      <EuiFilterButton
        badgeColor="subdued"
        data-test-subj="typeFilterButton"
        iconType="chevronSingleDown"
        isSelected={isPopoverOpen}
        onClick={onFilterButtonClick}
        hasActiveFilters={!!typeFilterItems.find((item) => item.checked === 'on')}
        numActiveFilters={typeFilterItems.filter((item) => item.checked === 'on').length}
      >
        {i18n.TYPE}
      </EuiFilterButton>
    ),
    [typeFilterItems, isPopoverOpen, onFilterButtonClick]
  );

  const onSelectableChange = useCallback(
    (newOptions: EuiSelectableOption[]) => {
      const newSelectedTypes = newOptions
        .filter((option) => option.checked === 'on')
        .map((option) => option.key as string);

      setSelectedTypes(newSelectedTypes);
      telemetry.reportEvent(AttacksEventTypes.TypeFilterChanged, {
        types: newSelectedTypes,
      });
    },
    [setSelectedTypes, telemetry]
  );

  return (
    <EuiFilterGroup compressed={compressed}>
      <EuiPopover
        aria-label={i18n.TYPE}
        button={button}
        closePopover={closePopover}
        id={filterGroupPopoverId}
        isOpen={isPopoverOpen}
        panelPaddingSize="s"
      >
        <EuiSelectable
          aria-label={i18n.TYPE}
          listProps={LIST_PROPS}
          options={typeFilterItems}
          onChange={onSelectableChange}
          renderOption={renderOption}
        >
          {(list) => (
            <div
              data-test-subj="typeFilterSelectable"
              css={css`
                width: 200px;
              `}
            >
              {list}
            </div>
          )}
        </EuiSelectable>
      </EuiPopover>
    </EuiFilterGroup>
  );
};

TypeFilterComponent.displayName = 'TypeFilter';

export const TypeFilter = React.memo(TypeFilterComponent);
