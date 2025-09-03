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

export const INTEGRATION_BUTTON_TEST_ID = 'alert-summary-integration-button';
export const INTEGRATIONS_LIST_TEST_ID = 'alert-summary-integrations-list';

const INTEGRATIONS_BUTTON = i18n.translate(
  'xpack.securitySolution.alertSummary.integrations.buttonLabel',
  {
    defaultMessage: 'Integrations',
  }
);

export const FILTER_KEY = 'signal.rule.rule_id';

export interface IntegrationFilterButtonProps {
  /**
   * List of integrations the user can select or deselect
   */
  integrations: EuiSelectableOption[];
}

/**
 * Filter button displayed next to the KQL bar at the top of the alert summary page.
 * For the AI for SOC effort, each integration has one rule associated with.
 * This means that deselecting an integration is equivalent to filtering out by the rule for that integration.
 * The EuiFilterButton works as follow:
 * - if an integration is selected, this means that no filters live in filterManager
 * - if an integration is deselected, this means that we have a negated filter for that rule in filterManager
 */
export const IntegrationFilterButton = memo(({ integrations }: IntegrationFilterButtonProps) => {
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

  const [items, setItems] = useState<EuiSelectableOption[]>(integrations);

  const onChange = useCallback(
    (
      options: EuiSelectableOption[],
      _: EuiSelectableOnChangeEvent,
      changedOption: EuiSelectableOption
    ) => {
      setItems(options);

      const ruleId = changedOption.key;
      if (ruleId) {
        const existingFilters = filterManager.getFilters();
        const newFilters: Filter[] = updateFiltersArray(
          existingFilters,
          FILTER_KEY,
          ruleId,
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
      data-test-subj={INTEGRATION_BUTTON_TEST_ID}
      hasActiveFilters={!!items.find((item) => item.checked === 'on')}
      iconType="arrowDown"
      isSelected={isPopoverOpen}
      numActiveFilters={items.filter((item) => item.checked === 'on').length}
      numFilters={items.filter((item) => item.checked !== 'off').length}
      onClick={togglePopover}
    >
      {INTEGRATIONS_BUTTON}
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
          data-test-subj={INTEGRATIONS_LIST_TEST_ID}
          options={items}
          onChange={onChange}
        >
          {(list) => list}
        </EuiSelectable>
      </EuiPopover>
    </EuiFilterGroup>
  );
});

IntegrationFilterButton.displayName = 'IntegrationFilterButton';
