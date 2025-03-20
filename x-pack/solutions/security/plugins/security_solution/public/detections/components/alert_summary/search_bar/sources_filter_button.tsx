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
import { i18n } from '@kbn/i18n';
import { updateFiltersArray } from '../../../utils/filter';
import { useKibana } from '../../../../common/lib/kibana';

export const SOURCE_BUTTON_TEST_ID = 'alert-summary-source-button';
export const SOURCES_LIST_TEST_ID = 'alert-summary-sources-list';

const SOURCES_BUTTON = i18n.translate('xpack.securitySolution.alertSummary.sources.buttonLabel', {
  defaultMessage: 'Sources',
});

export const FILTER_KEY = 'kibana.alert.rule.name';

export interface SourceFilterButtonProps {
  /**
   * List of sources the user can select or deselect
   */
  sources: EuiSelectableOption[];
}

/**
 * Filter button displayed next to the KQL bar at the top of the alert summary page.
 * A source is friendly UI representation of an integration. For the AI for SOC effort, each integration has one rule associated with.
 * This means that deselecting a source is equivalent to filtering out by the rule for that integration.
 * The EuiFilterButton works as follow:
 * - if a source is selected, this means that no filters live in filterManager
 * - if a source is deselected, this means that we have a negated filter for that rule in filterManager
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

      const ruleName = changedOption.key;
      if (ruleName) {
        const existingFilters = filterManager.getFilters();
        const newFilters: Filter[] = updateFiltersArray(
          existingFilters,
          FILTER_KEY,
          ruleName,
          changedOption.checked === 'on'
        );
        filterManager.setFilters(newFilters);
      }
    },
    [filterManager]
  );

  const button = (
    <EuiFilterButton
      badgeColor="accent"
      css={css`
        background-color: ${euiTheme.colors.backgroundBasePrimary};
      `}
      data-test-subj={SOURCE_BUTTON_TEST_ID}
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
          css={css`
            min-width: 200px;
          `}
          data-test-subj={SOURCES_LIST_TEST_ID}
          options={items}
          onChange={onChange}
        >
          {(list) => list}
        </EuiSelectable>
      </EuiPopover>
    </EuiFilterGroup>
  );
});

SourceFilterButton.displayName = 'SourceFilterButton';
