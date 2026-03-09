/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAvatar,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiTablePagination,
  EuiText,
  EuiTimeline,
  EuiTimelineItem,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import moment from 'moment';
import React, { useMemo, useState } from 'react';
import { RuleChangeTrackingAction } from '@kbn/alerting-types';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  UtilityBar,
  UtilityBarGroup,
  UtilityBarSection,
  UtilityBarText,
} from '../../../../common/components/utility_bar';
import type { Rule } from '../../../rule_management/logic';
import type { ChangeHistoryResult } from '../../../rule_management/api/hooks/use_change_history';
import { useChangeHistory } from '../../../rule_management/api/hooks/use_change_history';
import { DATE_DISPLAY_FORMAT, IGNORED_FIELDS } from './constants';
import { useRuleDetailsContext } from '../../pages/rule_details/rule_details_context';
import { RuleDetailTabs } from '../../pages/rule_details/use_rule_details_tabs';
import { CHANGE_HISTORY_ACTION_TEMPLATE } from './templates';
import { ChangeHistoryFlyout } from './flyout';

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
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const [changeItem, setChangeItem] = useState<ChangeHistoryResult>();
  const { backgroundBaseSubdued, backgroundBasePrimary } = euiTheme.colors;
  const {
    [RuleDetailTabs.history]: {
      state: {
        pagination: { activePage, itemsPerPage },
      },
      actions: { setActivePage, setItemsPerPage },
    },
  } = useRuleDetailsContext();

  // Index for `add filter` action and toasts for errors
  // const { dataView: experimentalDataView } = useDataView(PageScope.alerts);

  // QueryString, Filters, and TimeRange state
  const { data, isFetching } = useChangeHistory({
    id: ruleId,
    rule,
    page: activePage + 1,
    perPage: itemsPerPage,
  });

  const items = data?.items?.map((item) => {
    const visibleChanges = item.changes.filter((c) => !IGNORED_FIELDS.includes(c));
    const template =
      CHANGE_HISTORY_ACTION_TEMPLATE[item.action] ||
      CHANGE_HISTORY_ACTION_TEMPLATE[RuleChangeTrackingAction.ruleUpdate];
    return (
      <EuiTimelineItem
        icon={<EuiAvatar name="User" iconType="user" color={backgroundBaseSubdued} />}
      >
        <EuiText
          css={css`
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            padding: ${euiTheme.size.s} ${euiTheme.size.s};
            border-radius: 6px;
            background-color: ${backgroundBaseSubdued};
          `}
          size="s"
        >
          <div>
            {`On ${moment(item.timestamp).format(DATE_DISPLAY_FORMAT)} `}
            <EuiBadge color="hollow">{item.username}</EuiBadge>
            {template({ ...item, changes: visibleChanges }, euiTheme)}
          </div>
          <EuiLink
            onClick={() => {
              setIsFlyoutOpen(true);
              setChangeItem(item);
            }}
          >
            {`View `}
            <EuiIcon type="expand" aria-hidden={true} />
          </EuiLink>
        </EuiText>
      </EuiTimelineItem>
    );
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

  // Last item is the date change histories started.
  // So we always have 1 item minimum.
  const maxItems = (data?.total ?? 0) + 1;

  // Memoized state
  const pagination = useMemo(() => {
    const pageCount = Math.ceil(maxItems / itemsPerPage);
    return {
      activePage,
      itemsPerPage,
      totalItemCount: maxItems > 50 ? 50 : maxItems,
      itemsPerPageOptions: [10, 20, 50],
      pageCount,
      lastPage: activePage + 1 === pageCount,
    };
  }, [maxItems, activePage, itemsPerPage]);

  // Add date change tracking started
  if (pagination.lastPage)
    items?.push(
      <EuiTimelineItem
        icon={<EuiAvatar name="Elastic" iconType="logoElastic" color={backgroundBasePrimary} />}
      >
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
            {`On ${moment(data?.startDate).format(DATE_DISPLAY_FORMAT)} `}
            {`Rule history tracking started`}
          </p>
        </EuiText>
      </EuiTimelineItem>
    );

  return (
    <EuiPanel data-test-subj="executionLogContainer" hasBorder>
      {/* Utility bar */}
      <UtilityBar>
        <UtilityBarSection>
          <UtilityBarGroup>
            <UtilityBarText
              css={css`
                padding: 0.3em 0 0.5em;
              `}
              dataTestSubj="historyPagination"
            >
              <FormattedMessage
                id="xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.paginationDetails"
                defaultMessage="Showing {partOne} of {partTwo} events"
                values={{
                  partOne: (
                    <span
                      css={css`
                        font-weight: bold;
                      `}
                    >{`${1}-${maxItems}`}</span>
                  ),
                  partTwo: (
                    <span
                      css={css`
                        font-weight: bold;
                      `}
                    >{`${maxItems}`}</span>
                  ),
                }}
              />
            </UtilityBarText>
          </UtilityBarGroup>
        </UtilityBarSection>
      </UtilityBar>
      <EuiSpacer size="s" />
      <EuiTimeline aria-label="Change History timeline">{items}</EuiTimeline>
      <EuiSpacer size="l" />
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiTablePagination
            aria-label="Change History pagination"
            pageCount={pagination.pageCount}
            activePage={pagination.activePage}
            onChangePage={(p) => setActivePage(p)}
            onChangeItemsPerPage={(n) => {
              setActivePage(0);
              setItemsPerPage(n);
            }}
            itemsPerPage={pagination.itemsPerPage}
            itemsPerPageOptions={pagination.itemsPerPageOptions}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <ChangeHistoryFlyout
        isOpen={isFlyoutOpen}
        onClose={() => setIsFlyoutOpen(false)}
        change={changeItem}
      />
    </EuiPanel>
  );
};

export const ChangeHistoryTable = React.memo(ChangeHistoryTableComponent);
ChangeHistoryTable.displayName = 'HistoryTable';
