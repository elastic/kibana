/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';
import {
  EuiFilterButton,
  EuiFilterGroup,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
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
      iconType="arrowDown"
      badgeColor="success"
      onClick={togglePopover}
      isSelected={isPopoverOpen}
      numFilters={items.filter((item) => item.checked !== 'off').length}
      hasActiveFilters={!!items.find((item) => item.checked === 'on')}
      numActiveFilters={items.filter((item) => item.checked === 'on').length}
    >
      {SOURCES_BUTTON}
    </EuiFilterButton>
  );

  return (
    <EuiFilterGroup>
      <EuiPopover
        id={filterGroupPopoverId}
        button={button}
        isOpen={isPopoverOpen}
        closePopover={togglePopover}
        panelPaddingSize="none"
      >
        <EuiSelectable
          searchable
          searchProps={{
            placeholder: 'Filter list',
            compressed: true,
          }}
          aria-label="Composers"
          options={items}
          onChange={onChange}
          loadingMessage="Loading filters"
          emptyMessage="No filters available"
          noMatchesMessage="No filters found"
        >
          {(list, search) => (
            <div style={{ width: 300 }}>
              <EuiPopoverTitle paddingSize="s">{search}</EuiPopoverTitle>
              {list}
            </div>
          )}
        </EuiSelectable>
      </EuiPopover>
    </EuiFilterGroup>
  );
});

SourceFilterButton.displayName = 'SourceFilterButton';
