/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiFilterButton,
  EuiFilterGroup,
  EuiPopover,
  EuiSelectable,
  EuiSelectableOption,
  EuiSelectableProps,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { useBoolean } from '@kbn/react-hooks';
import React from 'react';

export const FilterGroup = ({
  filterGroupButtonLabel,
  items,
  onChange,
}: {
  filterGroupButtonLabel: string;
  items: EuiSelectableOption[];
  onChange: Required<EuiSelectableProps>['onChange'];
}) => {
  const [isPopoverOpen, { off: closePopover, toggle }] = useBoolean(false);

  const filterGroupPopoverId = useGeneratedHtmlId({
    prefix: 'filterGroupPopover',
  });

  const button = (
    <EuiFilterButton
      iconType="arrowDown"
      badgeColor="success"
      onClick={toggle}
      isSelected={isPopoverOpen}
      numFilters={items.length}
      hasActiveFilters={!!items.find((item) => item.checked === 'on')}
      numActiveFilters={items.filter((item) => item.checked === 'on').length}
    >
      {filterGroupButtonLabel}
    </EuiFilterButton>
  );

  return (
    <EuiFilterGroup>
      <EuiPopover
        id={filterGroupPopoverId}
        button={button}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
      >
        <EuiSelectable aria-label={filterGroupButtonLabel} options={items} onChange={onChange}>
          {(list) => (
            <div
              css={{
                minWidth: '200px',
              }}
            >
              {list}
            </div>
          )}
        </EuiSelectable>
      </EuiPopover>
    </EuiFilterGroup>
  );
};
