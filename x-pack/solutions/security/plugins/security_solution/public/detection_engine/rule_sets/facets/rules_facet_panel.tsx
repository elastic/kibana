/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { RuleSetConditions } from '../../../../common/api/detection_engine/rule_sets';
import { hasRuleSetConditions } from '../../../../common/detection_engine/rule_sets/rule_set_conditions';
import { convertRulesFilterToKQL } from '../../../../common/detection_engine/rule_management/rule_filtering';
import { useRulesTableContext } from '../../rule_management_ui/components/rules_table/rules_table/rules_table_context';
import { useRuleSetsQuery } from '../api';
import { isRuleSetChanged, ruleQueryParams, ruleSetFilterState } from '../table_query';
import { FacetPanel } from './facet_panel';
import { HideFacetPanelButton } from './facet_panel_visibility';
import { useFacetCounts } from './use_facet_counts';
import * as i18n from './translations';

/** The facet panel of the rules table: counts inside the selected rule set. */
export const RulesFacetPanel = () => {
  const {
    state: { filterOptions },
    actions: { setFilterOptions },
  } = useRulesTableContext();
  const { ruleSetId } = filterOptions;
  const conditions = filterOptions.conditions ?? {};
  const { data: sets } = useRuleSetsQuery();
  const set = sets?.find(({ id }) => id === ruleSetId);

  // The panel shows the click in the next frame; the table (a much bigger render) updates after
  // that frame is painted. Quick clicks in a row become one table update.
  const [pending, setPending] = useState<RuleSetConditions | null>(null);
  const scheduled = useRef<number>();
  useEffect(() => setPending(null), [filterOptions.conditions]);
  useEffect(() => () => window.clearTimeout(scheduled.current), []);
  const shown = pending ?? conditions;
  const onChange = (next: RuleSetConditions) => {
    setPending(next);
    window.clearTimeout(scheduled.current);
    requestAnimationFrame(() => {
      window.clearTimeout(scheduled.current);
      scheduled.current = window.setTimeout(
        () => setFilterOptions({ conditions: next, members: undefined }),
        0
      );
    });
  };

  const { data, isLoading, isFetching } = useFacetCounts({
    conditions,
    params: ruleQueryParams(filterOptions),
    filter: convertRulesFilterToKQL({ ...filterOptions, filter: '' }) || undefined,
  });

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="ruleFacetPanelFrame">
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h3>{i18n.FILTERS}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            {/* Inside a set the facets are its conditions: clearing them would empty the set. */}
            {!set && hasRuleSetConditions(shown) && (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="xs"
                  onClick={() => onChange({})}
                  data-test-subj="ruleFacetClearAll"
                >
                  {i18n.CLEAR_ALL}
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
            {set && isRuleSetChanged(filterOptions, set) && (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="xs"
                  iconType="refresh"
                  onClick={() => setFilterOptions(ruleSetFilterState(set))}
                  data-test-subj="ruleFacetReset"
                >
                  {i18n.RESET}
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <HideFacetPanelButton />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiText size="xs" color="subdued">
        {set ? i18n.FILTERS_OF_SET(set.name) : i18n.COUNTS_IN_ALL}
      </EuiText>
      <EuiSpacer size="s" />
      <FacetPanel
        conditions={shown}
        onChange={onChange}
        counts={data}
        isLoading={isLoading}
        isFetching={isFetching || pending != null}
        scopeKey={ruleSetId ?? 'all'}
      />
    </EuiPanel>
  );
};
