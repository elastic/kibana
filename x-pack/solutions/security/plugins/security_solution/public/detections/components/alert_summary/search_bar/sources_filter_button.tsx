/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiFilterButton,
  EuiFilterGroup,
  EuiPopover,
  EuiSelectable,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui/src/components/selectable/selectable_option';
import type { EuiSelectableOnChangeEvent } from '@elastic/eui/src/components/selectable/selectable';
import type { Filter } from '@kbn/es-query';
import { updateFiltersArray } from '../utils/filter';
import { SOURCES_BUTTON } from './translations';
import { useKibana } from '../../../../common/lib/kibana';

export interface SourceFilterButtonProps {
  /**
   *
   */
  sources: EuiSelectableOption[];
}

/**
 *
 */
export const SourceFilterButton = memo(({ sources }: SourceFilterButtonProps) => {
  const { euiTheme } = useEuiTheme();

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const togglePopover = useCallback(() => setIsPopoverOpen((value) => !value), []);

  const {
    data: {
      query: { filterManager },
    },
  } = useKibana().services;

  const filterGroupPopoverId = useGeneratedHtmlId({
    prefix: 'filterGroupPopover',
  });

  const [items, setItems] = useState<EuiSelectableOption[]>(sources);

  const onChange = useCallback(
    (
      options: EuiSelectableOption[],
      _: EuiSelectableOnChangeEvent,
      changedOption: EuiSelectableOption
    ) => {
      setItems(options);
      const existingFilters = filterManager.getFilters();
      const newFilters: Filter[] = updateFiltersArray(
        existingFilters,
        'kibana.alert.rule.name',
        changedOption.label,
        changedOption.checked === 'on'
      );
      filterManager.setFilters(newFilters);
    },
    [filterManager]
  );

  const button = (
    <EuiFilterButton
      badgeColor="accent"
      css={css`
        background-color: ${euiTheme.colors.backgroundBasePrimary};
      `}
      hasActiveFilters={!!items.find((item) => item.checked === 'on')}
      iconType="arrowDown"
      isSelected={isPopoverOpen}
      numActiveFilters={items.filter((item) => item.checked === 'on').length}
      numFilters={items.filter((item) => item.checked !== 'off').length}
      onClick={togglePopover}
    >
      {SOURCES_BUTTON}
    </EuiFilterButton>
  );

  return (
    <EuiFilterGroup>
      <EuiPopover
        button={button}
        closePopover={togglePopover}
        id={filterGroupPopoverId}
        isOpen={isPopoverOpen}
        panelPaddingSize="none"
      >
        <EuiSelectable
          options={items}
          onChange={onChange}
          css={css`
            min-width: 200px;
          `}
        >
          {(list) => list}
        </EuiSelectable>
      </EuiPopover>
    </EuiFilterGroup>
  );
});

SourceFilterButton.displayName = 'SourceFilterButton';
