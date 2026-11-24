/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiHorizontalRule,
  EuiIconTip,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
} from '@elastic/eui';
import type { RuleExecutionStatus } from '../../../../common/api/detection_engine';
import { RuleExecutionStatusEnum } from '../../../../common/api/detection_engine';
import { convertRulesFilterToKQL } from '../../../../common/detection_engine/rule_management/rule_filtering';
import { useRulesTableContext } from '../../rule_management_ui/components/rules_table/rules_table/rules_table_context';
import type { FilterOptions } from '../../rule_management/logic/types';
import { getCapitalizedStatusText } from '../../common/components/rule_execution_status/utils';
import type { FacetField, FacetSelection, FacetValue } from './facet_fields';
import { FacetGroup, FacetPanel } from './facet_panel';
import { useFacetCounts } from './use_facet_counts';
import * as i18n from './translations';

/** Rule state facets render like facets but write the table state, never rule set conditions. */
const stateField = (id: string, label: string): FacetField => ({
  id,
  label,
  canExclude: false,
  single: true,
  ordered: true,
  get: () => ({ include: [], exclude: [] }),
  set: (conditions) => conditions,
  values: () => [],
  valueLabel: (value) => value,
});

const STATUS_FIELD = stateField('state:enabled', i18n.STATUS);
const LAST_RESPONSE_FIELD = stateField('state:lastResponse', i18n.LAST_RESPONSE);

/** Last response filter values and the `lastRunOutcome` facet key that counts them. */
const LAST_RESPONSES: Array<{ status: RuleExecutionStatus; outcome: string }> = [
  { status: RuleExecutionStatusEnum.succeeded, outcome: 'succeeded' },
  { status: RuleExecutionStatusEnum['partial failure'], outcome: 'warning' },
  { status: RuleExecutionStatusEnum.failed, outcome: 'failed' },
];

const enabledCount = (counts: Record<string, number> | undefined, enabled: boolean) =>
  counts?.[String(enabled)] ?? 0;

/** The facet panel of the rules table: counts inside the selected rule set. */
export const RulesFacetPanel = () => {
  const {
    state: { filterOptions },
    actions: { setFilterOptions },
  } = useRulesTableContext();
  const conditions = filterOptions.conditions ?? {};
  const common = {
    conditions,
    scope: filterOptions.ruleSetId ? { rule_set_id: filterOptions.ruleSetId } : undefined,
    search: filterOptions.filter.trim() || undefined,
  };
  const kql = (overrides: Partial<FilterOptions>) =>
    convertRulesFilterToKQL({ ...filterOptions, filter: '', ...overrides }) || undefined;
  const { data, isLoading } = useFacetCounts({ ...common, filter: kql({}) });
  // Rule state filters are not set conditions, so their counts without their own selection come
  // from separate small requests, only while that filter is set.
  const { data: enabledData } = useFacetCounts({
    ...common,
    filter: kql({ enabled: undefined }),
    categories: ['enabled'],
    enabled: filterOptions.enabled != null,
  });
  const { data: outcomeData } = useFacetCounts({
    ...common,
    filter: kql({ ruleExecutionStatus: undefined }),
    categories: ['lastRunOutcome'],
    enabled: filterOptions.ruleExecutionStatus != null,
  });
  const enabledCounts = (filterOptions.enabled != null ? enabledData : data)?.counts.enabled;
  const outcomeCounts = (filterOptions.ruleExecutionStatus != null ? outcomeData : data)?.counts
    .lastRunOutcome;

  const statusValues: FacetValue[] = [
    { value: 'true', label: i18n.ENABLED, count: enabledCount(enabledCounts, true) },
    { value: 'false', label: i18n.DISABLED, count: enabledCount(enabledCounts, false) },
  ];
  const statusSelection: FacetSelection = {
    include: filterOptions.enabled == null ? [] : [String(filterOptions.enabled)],
    exclude: [],
  };

  const responseValues: FacetValue[] = LAST_RESPONSES.map(({ status, outcome }) => ({
    value: status,
    label: getCapitalizedStatusText(status) ?? status,
    count: outcomeCounts?.[outcome] ?? 0,
  }));
  const responseSelection: FacetSelection = {
    include: filterOptions.ruleExecutionStatus ? [filterOptions.ruleExecutionStatus] : [],
    exclude: [],
  };

  return (
    <FacetPanel
      conditions={conditions}
      onChange={(next) => setFilterOptions({ conditions: next })}
      counts={data}
      isLoading={isLoading}
    >
      <EuiHorizontalRule margin="s" />
      <EuiPanel color="subdued" paddingSize="s" hasShadow={false}>
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="xs">
              <strong>{i18n.RULE_STATE}</strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiIconTip content={i18n.RULE_STATE_HELP} type="info" size="s" />
          </EuiFlexItem>
        </EuiFlexGroup>
        <FacetGroup
          field={STATUS_FIELD}
          values={statusValues}
          selection={statusSelection}
          onChange={({ include }) =>
            setFilterOptions({ enabled: include.length ? include[0] === 'true' : undefined })
          }
          initialIsOpen
        />
        <FacetGroup
          field={LAST_RESPONSE_FIELD}
          values={responseValues}
          selection={responseSelection}
          onChange={({ include }) =>
            setFilterOptions({
              ruleExecutionStatus: LAST_RESPONSES.find(({ status }) => status === include[0])
                ?.status,
            })
          }
          initialIsOpen
        />
      </EuiPanel>
    </FacetPanel>
  );
};
