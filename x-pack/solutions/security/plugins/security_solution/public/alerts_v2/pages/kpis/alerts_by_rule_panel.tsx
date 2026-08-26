/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AggregateQuery, TimeRange } from '@kbn/es-query';
import { EsqlInspectButton } from './esql_inspect_button';
import { useAlertsByRuleData, type AlertsByRuleDatum } from './use_alerts_by_rule_data';

const TITLE = i18n.translate('xpack.securitySolution.alertsV2.alertsByRule.title', {
  defaultMessage: 'Alerts by rule',
});

const PAGINATION = { initialPageSize: 10, pageSizeOptions: [5, 10, 25] };

export interface AlertsByRulePanelProps {
  /** The page's ES|QL query — the chart aggregates on top of it. */
  query: AggregateQuery;
  timeRange: TimeRange;
}

/**
 * "Alerts by rule" KPI for the Alerts v2 Summary tab — a table of episode counts
 * per rule, from an ES|QL aggregation. Note: v2 alerts carry only `rule.id`
 * (a UUID), so the rule column shows the id until we resolve names.
 */
export const AlertsByRulePanel = ({ query, timeRange }: AlertsByRulePanelProps) => {
  const { data, isLoading, error, inspect } = useAlertsByRuleData(query, timeRange);

  const columns = useMemo<Array<EuiBasicTableColumn<AlertsByRuleDatum>>>(
    () => [
      {
        field: 'rule',
        name: i18n.translate('xpack.securitySolution.alertsV2.alertsByRule.ruleColumn', {
          defaultMessage: 'Rule',
        }),
        truncateText: true,
        render: (rule: string) => (
          <EuiText size="xs" className="eui-textTruncate">
            {rule}
          </EuiText>
        ),
      },
      {
        field: 'value',
        name: i18n.translate('xpack.securitySolution.alertsV2.alertsByRule.countColumn', {
          defaultMessage: 'Count',
        }),
        dataType: 'number',
        width: '22%',
        sortable: true,
        render: (value: number) => (
          <EuiText grow={false} size="xs">
            {value}
          </EuiText>
        ),
      },
    ],
    []
  );

  return (
    <EuiPanel hasBorder hasShadow={false} data-test-subj="alertsV2AlertsByRulePanel">
      <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>{TITLE}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EsqlInspectButton inspect={inspect} title={TITLE} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {error ? (
        <EuiCallOut
          announceOnMount
          color="danger"
          iconType="error"
          size="s"
          title={i18n.translate('xpack.securitySolution.alertsV2.alertsByRule.error', {
            defaultMessage: 'Unable to load alerts by rule',
          })}
        >
          {error.message}
        </EuiCallOut>
      ) : (
        <EuiInMemoryTable
          data-test-subj="alertsV2AlertsByRuleTable"
          columns={columns}
          items={data}
          loading={isLoading}
          pagination={PAGINATION}
          sorting
        />
      )}
    </EuiPanel>
  );
};
