/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import { css } from '@emotion/react';
import type { EuiTimelineItemProps } from '@elastic/eui';
import {
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiBadge,
  EuiSpacer,
  EuiTimeline,
  EuiText,
  EuiAvatar,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';

// import type { Filter, Query } from '@kbn/es-query';
// import { FILTERS } from '@kbn/es-query';

import { RuleChangeTrackingAction, SecurityRuleChangeTrackingAction } from '@kbn/alerting-types';
import type { Rule } from '../../../../rule_management/logic';
import { HeaderSection } from '../../../../../common/components/header_section';
// import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
// import { useKibana } from '../../../../../common/lib/kibana';
import * as i18n from './translations';
import type { ChangeHistoryResult } from '../../../../rule_management/api/hooks/use_change_history';
import { useChangeHistory } from '../../../../rule_management/api/hooks/use_change_history';
import { RuleDetailTabs } from '../use_rule_details_tabs';
import { useRuleDetailsContext } from '../rule_details_context';

const IGNORED_FIELDS = [
  'updatedAt',
  'revision',
  'params.meta.kibana_siem_app_url',
  'params.timestampOverrideFallbackDisabled',
  'params.ruleSource.isCustomized',
  'params.ruleSource.customizedFields',
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
  const { euiTheme } = useEuiTheme();
  const { backgroundBaseSubdued, backgroundBasePrimary } = euiTheme.colors;
  const {
    [RuleDetailTabs.history]: {
      state: {
        pagination: { pageIndex, pageSize },
      },
      // actions: { setPageIndex, setPageSize },
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
  // const items = data?.items || [];
  const maxItems = data?.total ?? 0;

  const ACTION_TEMPLATE = {
    [RuleChangeTrackingAction.ruleCreate]: (item) => (
      <>
        {' made revision '}
        <EuiBadge color="hollow">{item.revision}</EuiBadge>
        {' creating the rule.'}
      </>
    ),
    [SecurityRuleChangeTrackingAction.ruleInstall]: (item) => (
      <>
        {' made revision '}
        <EuiBadge color="hollow">{item.revision}</EuiBadge>
        {' installing the rule.'}
      </>
    ),
    [RuleChangeTrackingAction.ruleUpdate]: (item) => {
      const limit = 3;
      const changes = item.changes
        .map((f) => f.replace(/^(\w|\.)+\./, ''))
        .reduce((res, c, i, arr) => {
          if (i < limit)
            res.push(
              <EuiBadge key={i} color="hollow">
                {c}
              </EuiBadge>
            );
          else if (i === limit && arr.length > limit)
            res.push(
              <React.Fragment key={i}>
                {` and `}
                <EuiToolTip position="top" content={arr.slice(limit).join(', ')}>
                  <EuiBadge
                    css={css`
                      cursor: 'pointer';
                    `}
                    tabIndex={0}
                    color="hollow"
                  >{`${arr.length - limit} other`}</EuiBadge>
                </EuiToolTip>
              </React.Fragment>
            );
          return res;
        }, [] as JSX.Element[]);
      return (
        <>
          {' made revision '}
          <EuiBadge color="hollow">{item.revision}</EuiBadge>
          {' updating '}
          {changes}
        </>
      );
    },
    [RuleChangeTrackingAction.ruleEnable]: () => <>{' enabled the rule.'}</>,
    [RuleChangeTrackingAction.ruleDisable]: () => <>{' disabled the rule.'}</>,
  } as Record<string, (item: ChangeHistoryResult) => JSX.Element>;

  const items: EuiTimelineItemProps['items'] = data?.items?.map((item) => {
    const visibleChanges = item.changes.filter((c) => !IGNORED_FIELDS.includes(c));
    return {
      icon: <EuiAvatar name="User" iconType="user" color={backgroundBaseSubdued} />,
      children: (
        <EuiText
          css={css`
            padding: ${euiTheme.size.s} ${euiTheme.size.s};
            border-radius: 6px;
            background-color: ${backgroundBaseSubdued};
          `}
          size="s"
        >
          <p>
            {`On ${moment(item.timestamp).format('MMM D YYYY @ HH.mm')} `}
            <EuiBadge color="hollow">{item.userId}</EuiBadge>
            {ACTION_TEMPLATE[item.action]({ ...item, changes: visibleChanges })}
          </p>
        </EuiText>
      ),
    };
  });

  // TODO: Only at the end (watch out for pagination)
  items?.push({
    icon: <EuiAvatar name="Elastic" iconType="logoElastic" color={backgroundBasePrimary} />,
    children: (
      <EuiText
        key={'end'}
        css={css`
          padding: ${euiTheme.size.s} ${euiTheme.size.s};
          border-radius: 6px;
          background-color: ${backgroundBasePrimary};
        `}
        size="s"
      >
        <p>
          {`On ${moment(data?.startDate).format('MMM D YYYY @ HH.mm')} `}
          {`Rule history tracking started`}
        </p>
      </EuiText>
    ),
  });

  //   // Callbacks
  // const onTableChangeCallback = useCallback(
  //   ({ page }: CriteriaWithPagination<ChangeHistoryResult>) => {
  //     const { index, size } = page;
  //     setPageIndex(index + 1);
  //     setPageSize(size);
  //   },
  //   [setPageIndex, setPageSize]
  // );

  // Memoized state
  // const pagination = useMemo(() => {
  //   return {
  //     pageIndex: pageIndex - 1,
  //     pageSize,
  //     totalItemCount: maxItems > 50 ? 50 : maxItems,
  //     pageSizeOptions: [10, 20, 50],
  //   };
  // }, [maxItems, pageIndex, pageSize]);

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
      {/* <EuiBasicTable
        columns={columns}
        items={items}
        loading={isFetching}
        tableCaption="History table"
        pagination={pagination}
        onChange={onTableChangeCallback}
        // itemId={getItemId}
        // itemIdToExpandedRowMap={rows.itemIdToExpandedRowMap}
        data-test-subj="executionsTable"
      /> */}
      <EuiTimeline items={items} aria-label="Change History table" />
    </EuiPanel>
  );
};

export const ChangeHistoryTable = React.memo(ChangeHistoryTableComponent);
ChangeHistoryTable.displayName = 'HistoryTable';
