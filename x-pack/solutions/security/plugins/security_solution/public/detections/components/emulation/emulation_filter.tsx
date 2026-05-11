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
import type { EuiSelectableOption } from '@elastic/eui';
import type { EuiSelectableOnChangeEvent } from '@elastic/eui/src/components/selectable/selectable';
import type { Filter } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../common/lib/kibana';
import { ALERT_EMULATION_ID } from './emulation_badge';

export const EMULATION_FILTER_BUTTON_TEST_ID = 'emulation-filter-button';
export const EMULATION_FILTER_LIST_TEST_ID = 'emulation-filter-list';

const EMULATION_FILTER_BUTTON_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.emulation.filterButtonLabel',
  {
    defaultMessage: 'Emulation',
  }
);

const SHOW_EMULATION_ALERTS = i18n.translate(
  'xpack.securitySolution.detectionEngine.emulation.showEmulationAlerts',
  {
    defaultMessage: 'Show emulation alerts',
  }
);

const HIDE_EMULATION_ALERTS = i18n.translate(
  'xpack.securitySolution.detectionEngine.emulation.hideEmulationAlerts',
  {
    defaultMessage: 'Hide emulation alerts',
  }
);

export const EmulationFilter = memo(() => {
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const togglePopover = useCallback(() => setIsPopoverOpen((value) => !value), []);

  const {
    data: {
      query: { filterManager },
    },
  } = useKibana().services;

  const filterGroupPopoverId = useGeneratedHtmlId({
    prefix: 'emulationFilterGroupPopover',
  });

  const filterOptions: EuiSelectableOption[] = [
    {
      label: SHOW_EMULATION_ALERTS,
      key: 'show',
      checked: 'on',
    },
    {
      label: HIDE_EMULATION_ALERTS,
      key: 'hide',
      checked: undefined,
    },
  ];

  const [items, setItems] = useState<EuiSelectableOption[]>(filterOptions);

  const onChange = useCallback(
    (
      options: EuiSelectableOption[],
      _: EuiSelectableOnChangeEvent,
      changedOption: EuiSelectableOption
    ) => {
      const updatedOptions = options.map((option) => ({
        ...option,
        checked: option.key === changedOption.key ? 'on' : undefined,
      }));
      setItems(updatedOptions as EuiSelectableOption[]);

      const existingFilters = filterManager.getFilters();
      let newFilters: Filter[];

      const filtersWithoutEmulation = existingFilters.filter(
        (filter) => filter.meta.key !== ALERT_EMULATION_ID
      );

      if (changedOption.key === 'hide') {
        const emulationFilter: Filter = {
          meta: {
            alias: null,
            negate: true,
            disabled: false,
            type: 'exists',
            key: ALERT_EMULATION_ID,
            value: 'exists',
          },
          query: {
            exists: {
              field: ALERT_EMULATION_ID,
            },
          },
        };
        newFilters = [...filtersWithoutEmulation, emulationFilter];
      } else {
        newFilters = filtersWithoutEmulation;
      }

      filterManager.setFilters(newFilters);
    },
    [filterManager]
  );

  const hasActiveFilter = items.find((item) => item.key === 'hide' && item.checked === 'on');

  const button = (
    <EuiFilterButton
      aria-pressed={hasActiveFilter ? true : undefined}
      badgeColor="accent"
      css={css`
        background-color: ${euiTheme.colors.backgroundBasePrimary};
      `}
      data-test-subj={EMULATION_FILTER_BUTTON_TEST_ID}
      hasActiveFilters={!!hasActiveFilter}
      iconType="chevronSingleDown"
      isSelected={isPopoverOpen || !!hasActiveFilter}
      numActiveFilters={hasActiveFilter ? 1 : 0}
      onClick={togglePopover}
    >
      {EMULATION_FILTER_BUTTON_LABEL}
    </EuiFilterButton>
  );

  return (
    <EuiFilterGroup compressed={true}>
      <EuiPopover
        button={button}
        closePopover={togglePopover}
        id={filterGroupPopoverId}
        isOpen={isPopoverOpen}
        panelPaddingSize="none"
      >
        <EuiSelectable
          css={css`
            min-width: 200px;
          `}
          data-test-subj={EMULATION_FILTER_LIST_TEST_ID}
          options={items}
          onChange={onChange}
          singleSelection={true}
        >
          {(list) => list}
        </EuiSelectable>
      </EuiPopover>
    </EuiFilterGroup>
  );
});

EmulationFilter.displayName = 'EmulationFilter';
