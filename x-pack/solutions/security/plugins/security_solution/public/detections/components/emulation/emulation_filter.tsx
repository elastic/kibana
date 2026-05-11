/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
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
import type { Filter } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../common/lib/kibana';
import { ALERT_EMULATION_ID } from './emulation_badge';

// I13: avoid `@elastic/eui/src/...` deep imports — that path is private and
// breaks across EUI versions. We recover the `onChange` prop's signature and
// pull the second argument's type out, so the event type tracks whatever EUI
// publishes without us re-declaring it.
type EuiSelectableOnChangeProp = NonNullable<
  React.ComponentProps<typeof EuiSelectable>['onChange']
>;
type EuiSelectableOnChangeEvent = Parameters<EuiSelectableOnChangeProp>[1];

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

  // I9: derive the toggle state from the *current* filterManager state, not from
  // an internal `useState` initialised once at mount. Otherwise, anything that
  // mutates filters elsewhere (Saved-Query loaded, KQL bar edited, another
  // component clearing filters) would put this UI out of sync with reality.
  const isHideFilterActiveFor = useCallback(
    (filters: Filter[]) =>
      filters.some(
        (filter) =>
          filter.meta.key === ALERT_EMULATION_ID &&
          filter.meta.type === 'exists' &&
          filter.meta.negate === true &&
          filter.meta.disabled !== true
      ),
    []
  );

  const [hideActive, setHideActive] = useState<boolean>(() =>
    isHideFilterActiveFor(filterManager.getFilters())
  );

  // I9: subscribe to external filter-manager updates so our UI stays in sync
  // when callers other than this component change filters.
  useEffect(() => {
    const subscription = filterManager.getUpdates$().subscribe(() => {
      setHideActive(isHideFilterActiveFor(filterManager.getFilters()));
    });
    return () => subscription.unsubscribe();
  }, [filterManager, isHideFilterActiveFor]);

  const items: EuiSelectableOption[] = useMemo(
    () => [
      {
        label: SHOW_EMULATION_ALERTS,
        key: 'show',
        checked: hideActive ? undefined : 'on',
      },
      {
        label: HIDE_EMULATION_ALERTS,
        key: 'hide',
        checked: hideActive ? 'on' : undefined,
      },
    ],
    [hideActive]
  );

  const onChange = useCallback(
    (
      _options: EuiSelectableOption[],
      _event: EuiSelectableOnChangeEvent,
      changedOption: EuiSelectableOption
    ) => {
      const existingFilters = filterManager.getFilters();
      const filtersWithoutEmulation = existingFilters.filter(
        (filter) => filter.meta.key !== ALERT_EMULATION_ID
      );

      let newFilters: Filter[];
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
      // The subscription above will pick the change up, but flip it eagerly so
      // the menu reflects the click before the observable round-trips.
      setHideActive(changedOption.key === 'hide');
    },
    [filterManager]
  );

  const hasActiveFilter = hideActive;

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
