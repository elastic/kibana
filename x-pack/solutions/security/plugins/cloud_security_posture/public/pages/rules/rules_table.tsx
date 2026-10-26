/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useState } from 'react';
import type {
  Criteria,
  EuiTableFieldDataColumnType,
  EuiBasicTableProps,
  EuiTableSelectionType,
  EuiTableSortingType,
} from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiBasicTable,
  useEuiTheme,
  EuiSwitch,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { METRIC_TYPE } from '@kbn/analytics';
import {
  CHANGE_RULE_STATE,
  uiMetricService,
} from '@kbn/cloud-security-posture-common/utils/ui_metrics';
import { ColumnNameWithTooltip } from '../../components/column_name_with_tooltip';
import type { CspBenchmarkRulesWithStates, RulesState } from './rules_container';
import * as TEST_SUBJECTS from './test_subjects';
import { RULES_TABLE } from './test_subjects';

import { useChangeCspRuleState } from './use_change_csp_rule_state';

type RulesTableProps = Pick<
  RulesState,
  'loading' | 'error' | 'rules_page' | 'total' | 'perPage' | 'page'
> & {
  setPagination(pagination: Pick<RulesState, 'perPage' | 'page'>): void;
  onRuleClick: (ruleID: string) => void;
  selectedRuleId?: string;
  selectedRules: CspBenchmarkRulesWithStates[];
  setSelectedRules: (rules: CspBenchmarkRulesWithStates[]) => void;
  onSortChange: (value: 'asc' | 'desc') => void;
};

type GetColumnProps = Pick<RulesTableProps, 'onRuleClick'>;

export const RulesTable = ({
  setPagination,
  perPage: pageSize,
  rules_page: items,
  page,
  total,
  loading,
  error,
  selectedRuleId,
  selectedRules,
  setSelectedRules,
  onRuleClick,
  onSortChange,
}: RulesTableProps) => {
  const { euiTheme } = useEuiTheme();
  const euiPagination: EuiBasicTableProps<CspBenchmarkRulesWithStates>['pagination'] = {
    pageIndex: page,
    pageSize,
    totalItemCount: total,
    pageSizeOptions: [10, 25, 100],
  };
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const sorting: EuiTableSortingType<CspBenchmarkRulesWithStates> = {
    sort: {
      field: 'metadata.benchmark.rule_number' as keyof CspBenchmarkRulesWithStates,
      direction: sortDirection,
    },
  };
  const onTableChange = ({
    page: pagination,
    sort: sortOrder,
  }: Criteria<CspBenchmarkRulesWithStates>) => {
    if (!pagination) return;
    if (pagination) setPagination({ page: pagination.index, perPage: pagination.size });
    if (sortOrder) {
      setSortDirection(sortOrder.direction);
      onSortChange(sortOrder.direction);
    }
  };

  const rowProps = (row: CspBenchmarkRulesWithStates) => ({
    ['data-test-subj']: TEST_SUBJECTS.getCspBenchmarkRuleTableRowItemTestId(row.metadata?.id),
    style: {
      background: row.metadata?.id === selectedRuleId ? euiTheme.colors.highlight : undefined,
    },
  });

  // EuiBasicTable's native selection only tracks rows that are on the current page: any selected
  // item that is missing from `items` is dropped (and reported via `onSelectionChange`).
  // The rules page keeps a selection that spans pages (e.g. "Select all N rules"), so the table is
  // only given the part of that selection that is visible on this page, and changes reported by the
  // table are merged back into the full selection.
  const selectedRuleIds = useMemo(
    () => new Set(selectedRules.map((rule) => rule.metadata.id)),
    [selectedRules]
  );

  const currentPageSelection = useMemo(
    () => items.filter((rule) => selectedRuleIds.has(rule.metadata.id)),
    [items, selectedRuleIds]
  );

  const onSelectionChange = useCallback(
    (newCurrentPageSelection: CspBenchmarkRulesWithStates[]) => {
      const currentPageRuleIds = new Set(items.map((rule) => rule.metadata.id));
      const selectionFromOtherPages = selectedRules.filter(
        (rule) => !currentPageRuleIds.has(rule.metadata.id)
      );
      setSelectedRules([...selectionFromOtherPages, ...newCurrentPageSelection]);
    },
    [items, selectedRules, setSelectedRules]
  );

  const selection: EuiTableSelectionType<CspBenchmarkRulesWithStates> = {
    selected: currentPageSelection,
    onSelectionChange,
    // EuiBasicTable uses this message as the row checkbox's accessible name (and tooltip)
    selectableMessage: (_isSelectable, rule) =>
      i18n.translate('xpack.csp.rules.rulesTable.selectRuleAriaLabel', {
        defaultMessage: 'Select rule: {ruleName}',
        values: { ruleName: rule.metadata?.name || rule.metadata?.id },
      }),
  };

  const columns = getColumns({ onRuleClick });

  return (
    <>
      <EuiBasicTable
        data-test-subj={TEST_SUBJECTS.CSP_RULES_TABLE}
        loading={loading}
        error={error}
        items={items}
        columns={columns}
        pagination={euiPagination}
        onChange={onTableChange}
        itemId={(v) => v.metadata.id}
        rowProps={rowProps}
        selection={selection}
        sorting={sorting}
        tableCaption={i18n.translate('xpack.csp.rules.rulesTable.tableCaption', {
          defaultMessage: 'CSP benchmark rules list',
        })}
      />
    </>
  );
};

const getColumns = ({
  onRuleClick,
}: GetColumnProps): Array<EuiTableFieldDataColumnType<CspBenchmarkRulesWithStates>> => [
  {
    field: 'metadata.benchmark.rule_number',
    name: i18n.translate('xpack.csp.rules.rulesTable.ruleNumberColumnLabel', {
      defaultMessage: 'Rule Number',
    }),
    width: '120px',
    sortable: true,
  },
  {
    field: 'metadata.name',
    name: i18n.translate('xpack.csp.rules.rulesTable.nameColumnLabel', {
      defaultMessage: 'Name',
    }),
    width: '60%',
    truncateText: true,
    render: (name, rule: CspBenchmarkRulesWithStates) => (
      <EuiButtonEmpty
        className="eui-textTruncate"
        title={name}
        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
          e.stopPropagation();
          onRuleClick(rule.metadata.id);
        }}
        data-test-subj={TEST_SUBJECTS.CSP_RULES_TABLE_ROW_ITEM_NAME}
      >
        {name}
      </EuiButtonEmpty>
    ),
  },
  {
    field: 'metadata.section',
    name: i18n.translate('xpack.csp.rules.rulesTable.cisSectionColumnLabel', {
      defaultMessage: 'CIS Section',
    }),
    width: '24%',
  },
  {
    field: 'metadata.name',
    name: (
      <ColumnNameWithTooltip
        columnName={i18n.translate('xpack.csp.rules.rulesTable.enabledColumnLabel', {
          defaultMessage: 'Enabled',
        })}
        tooltipContent={i18n.translate('xpack.csp.rules.rulesTable.enabledColumnTooltip', {
          defaultMessage: `Disabling a rule will also disable its associated detection rules and alerts. Enabling it again does not automatically re-enable them`,
        })}
      />
    ),
    align: 'right',
    width: '100px',
    truncateText: true,
    render: (_name, rule: CspBenchmarkRulesWithStates) => <RuleStateSwitch rule={rule} />,
  },
];

const RuleStateSwitch = ({ rule }: { rule: CspBenchmarkRulesWithStates }) => {
  const isRuleMuted = rule?.state === 'muted';
  const nextRuleState = isRuleMuted ? 'unmute' : 'mute';

  const { mutate: mutateRulesStates } = useChangeCspRuleState();

  const rulesObjectRequest = {
    benchmark_id: rule?.metadata.benchmark.id,
    benchmark_version: rule?.metadata.benchmark.version,
    /* Rule number always exists from 8.7 */
    rule_number: rule?.metadata.benchmark.rule_number!,
    rule_id: rule?.metadata.id,
  };
  const changeCspRuleStateFn = async () => {
    if (rule?.metadata.benchmark.rule_number) {
      uiMetricService.trackUiMetric(METRIC_TYPE.COUNT, CHANGE_RULE_STATE);
      mutateRulesStates({
        newState: nextRuleState,
        ruleIds: [rulesObjectRequest],
      });
    }
  };
  return (
    <EuiFlexGroup justifyContent="flexEnd">
      <EuiFlexItem grow={false}>
        <EuiSwitch
          aria-label={i18n.translate('xpack.csp.rules.rulesTable.enabledColumnLabel', {
            defaultMessage: 'Rule Enabled',
          })}
          className="eui-textTruncate"
          checked={!isRuleMuted}
          onChange={changeCspRuleStateFn}
          data-test-subj={RULES_TABLE.RULES_ROWS_ENABLE_SWITCH_BUTTON}
          label=""
          compressed={true}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
