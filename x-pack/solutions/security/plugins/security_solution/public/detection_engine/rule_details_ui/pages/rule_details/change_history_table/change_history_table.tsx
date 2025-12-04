/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import moment from 'moment';
import type { CriteriaWithPagination, EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiBadge,
  EuiSpacer,
  // EuiSuperDatePicker,
  //   EuiSwitch,
  EuiText,
  EuiIconTip,
  EuiToken,
} from '@elastic/eui';

// import type { Filter, Query } from '@kbn/es-query';
// import { FILTERS } from '@kbn/es-query';

import type { Rule } from '../../../../rule_management/logic';
import { HeaderSection } from '../../../../../common/components/header_section';
// import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
// import { useKibana } from '../../../../../common/lib/kibana';
import * as i18n from './translations';
import { TableHeaderTooltipCell } from '../../../../rule_management_ui/components/rules_table/table_header_tooltip_cell';
import type { ChangeHistoryResult } from '../../../../rule_management/api/hooks/use_change_history';
import { useChangeHistory } from '../../../../rule_management/api/hooks/use_change_history';
import { RuleDetailTabs } from '../use_rule_details_tabs';
import { useRuleDetailsContext } from '../rule_details_context';
// import { useDataView } from '../../../../../data_view_manager/hooks/use_data_view';

export const CHANGE_HISTORY_COLUMNS: Array<EuiBasicTableColumn<ChangeHistoryResult>> = [
  {
    name: '',
    field: 'userId',
    render: () => <EuiToken iconType="user" shape="circle" size="m" color="#E3E8F2" />,
    sortable: false,
    truncateText: false,
    width: '5%',
  },
  {
    name: '',
    field: 'userId',
    sortable: false,
    width: '15%',
    render: (value, record) => {
      return <EuiText size="s">{value}</EuiText>;
    },
  },
  {
    field: 'timestamp',
    name: '',
    render: (value: string) => (
      <EuiText size="s">
        {moment(value).fromNow()}{' '}
        <EuiIconTip
          content={moment(value).format('MMM D, YYYY HH:mm')}
          type="info"
          color="subdued"
          anchorProps={{
            css: { marginLeft: 4 },
          }}
        />
      </EuiText>
    ),
    sortable: true,
    truncateText: false,
    width: '20%',
  },
  {
    name: i18n.COLUMN_MESSAGE,
    field: 'message',
    sortable: false,
    width: '60%',
    render: (value, record) => {
      let changes = [] as JSX.Element[];
      if (value.includes('updated') && record.changedFields?.length) {
        const limit = 2;
        changes = record.changedFields
          .map((f) => f.replace(/^(\w|\.)+\./, ''))
          .reduce((res, c, i, arr) => {
            if (i < limit) res.push(<EuiBadge color="hollow">{c}</EuiBadge>);
            else if (i === limit && arr.length > limit + 1)
              res.push(<>{` and ${arr.length - limit} others..`}</>);
            return res;
          }, [] as JSX.Element[]);
      }

      const changeBlurb =
        // eslint-disable-next-line react/jsx-no-literals
        changes.length ? <> ({changes})</> : [];

      return (
        <EuiText size="s">
          {value}
          {changeBlurb}
        </EuiText>
      );
    },
  },
  {
    name: (
      <TableHeaderTooltipCell
        title={i18n.COLUMN_REVISION}
        tooltipContent={i18n.COLUMN_REVISION_TOOLTIP}
      />
    ),
    field: 'revision',
    render: (value: number) => (value > -1 ? <EuiBadge>{value}</EuiBadge> : ''),
    sortable: false,
    truncateText: false,
    width: '10%',
  },
  {
    name: '',
    field: 'revision',
    sortable: false,
    width: '5%',
    render: (value: number) => (value > -1 ? <EuiIcon type="boxesVertical" /> : ''),
  },
];

interface ChangeHistoryTableProps {
  ruleId: string;
  rule: Rule | null;
}

const ChangeHistoryTableComponent: React.FC<ChangeHistoryTableProps> = ({ ruleId, rule }) => {
  //   const {
  //     docLinks,
  //     data: {
  //       query: { filterManager },
  //     },
  //     storage,
  //     timelines,
  //     telemetry,
  //   } = useKibana().services;

  const {
    [RuleDetailTabs.history]: {
      state: {
        pagination: { pageIndex, pageSize },
      },
      actions: { setPageIndex, setPageSize },
    },
  } = useRuleDetailsContext();

  // Index for `add filter` action and toasts for errors
  // const { dataView: experimentalDataView } = useDataView(PageScope.alerts);

  // const { addError, addSuccess, remove } = useAppToasts();

  // QueryString, Filters, and TimeRange state
  const { data, isFetching } = useChangeHistory({
    id: ruleId,
    rule,
    page: pageIndex,
    perPage: pageSize,
  });
  const items = data?.items || [];
  const maxItems = data?.total ?? 0;

  //   // Callbacks
  const onTableChangeCallback = useCallback(
    ({ page }: CriteriaWithPagination<ChangeHistoryResult>) => {
      const { index, size } = page;
      setPageIndex(index + 1);
      setPageSize(size);
    },
    [setPageIndex, setPageSize]
  );

  // Memoized state
  const pagination = useMemo(() => {
    return {
      pageIndex: pageIndex - 1,
      pageSize,
      totalItemCount: maxItems > 50 ? 50 : maxItems,
      pageSizeOptions: [10, 20, 50],
    };
  }, [maxItems, pageIndex, pageSize]);

  const columns = [...CHANGE_HISTORY_COLUMNS];

  return (
    <EuiPanel data-test-subj="executionLogContainer" hasBorder>
      {/* Filter bar */}
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={true}>
          <HeaderSection title={i18n.TABLE_TITLE} subtitle={i18n.TABLE_SUBTITLE} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFieldSearch
            data-test-subj="historySearch"
            aria-label={i18n.SEARCH_PLACEHOLDER}
            placeholder={i18n.SEARCH_PLACEHOLDER}
            onSearch={() => {}}
            isClearable={true}
            fullWidth={true}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      {/* Table with items */}
      <EuiBasicTable
        columns={columns}
        items={items}
        loading={isFetching}
        tableCaption="History table"
        pagination={pagination}
        onChange={onTableChangeCallback}
        // itemId={getItemId}
        // itemIdToExpandedRowMap={rows.itemIdToExpandedRowMap}
        data-test-subj="executionsTable"
      />
    </EuiPanel>
  );
};

export const ChangeHistoryTable = React.memo(ChangeHistoryTableComponent);
ChangeHistoryTable.displayName = 'HistoryTable';
