/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  EuiAvatar,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiTablePagination,
  EuiText,
  EuiTimeline,
  EuiTimelineItem,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { RuleHistoryItem } from '../../../../../common/api/detection_engine/rule_management';
import { useChangeHistory } from '../../../rule_management/api/hooks/use_change_history';
import { ChangeHistoryFlyout } from '../change_history_flyout';
import { ChangeHistoryTimelineItem } from './change_history_timeline_item';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from './constants';
import * as i18n from './translations';

interface ChangeHistoryTableProps {
  ruleId: string;
}

export function ChangeHistoryTable({ ruleId }: ChangeHistoryTableProps): JSX.Element {
  const { euiTheme } = useEuiTheme();
  const [activePage, setActivePage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState<number>(DEFAULT_PAGE_SIZE);
  const [selectedItem, setSelectedItem] = useState<RuleHistoryItem | undefined>();

  const { data, isLoading, isFetching } = useChangeHistory({
    ruleId,
    page: activePage + 1,
    perPage: itemsPerPage,
  });

  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / itemsPerPage));
  const isLastPage = activePage + 1 >= pageCount;

  const handleChangePageSize = useCallback((nextPageSize: number) => {
    setItemsPerPage(nextPageSize);
    setActivePage(0);
  }, []);

  const openFlyout = useCallback((item: RuleHistoryItem) => setSelectedItem(item), []);
  const closeFlyout = useCallback(() => setSelectedItem(undefined), []);

  const timelineItems = useMemo(
    () =>
      items.map((item) => (
        <ChangeHistoryTimelineItem key={item.id} item={item} onOpenDetails={openFlyout} />
      )),
    [items, openFlyout]
  );

  if (isLoading && items.length === 0) {
    return (
      <EuiPanel hasBorder data-test-subj="ruleChangeHistoryTableLoading">
        <EuiFlexGroup justifyContent="center" alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="m" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">{i18n.LOADING_LABEL}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }

  if (!isFetching && items.length === 0) {
    return (
      <EuiPanel hasBorder data-test-subj="ruleChangeHistoryTableEmpty">
        <EuiEmptyPrompt
          iconType="clock"
          title={<h2>{i18n.EMPTY_PROMPT_TITLE}</h2>}
          body={<p>{i18n.EMPTY_PROMPT_BODY}</p>}
        />
      </EuiPanel>
    );
  }

  return (
    <EuiPanel hasBorder data-test-subj="ruleChangeHistoryTable">
      {selectedItem && <ChangeHistoryFlyout item={selectedItem} onClose={closeFlyout} />}
      <EuiText size="xs">
        <i18n.SHOWN_EVENTS_VS_TOTAL
          page={data?.page ?? 0}
          perPage={data?.perPage ?? 0}
          total={total}
        />
      </EuiText>
      <EuiSpacer size="m" />
      <EuiTimeline aria-label={i18n.TIMELINE_ARIA_LABEL}>
        {timelineItems}
        {isLastPage && <ChangeTrackingStartedTimelineItem />}
      </EuiTimeline>
      <EuiSpacer size="l" />
      <EuiTablePagination
        aria-label={i18n.PAGINATION_ARIA_LABEL}
        pageCount={pageCount}
        activePage={activePage}
        onChangePage={setActivePage}
        onChangeItemsPerPage={handleChangePageSize}
        itemsPerPage={itemsPerPage}
        itemsPerPageOptions={PAGE_SIZE_OPTIONS}
      />
    </EuiPanel>
  );
}

const ChangeTrackingStartedTimelineItem = memo(
  function ChangeTrackingStartedTimelineItem(): JSX.Element {
    const { euiTheme } = useEuiTheme();

    return (
      <EuiTimelineItem
        verticalAlign="top"
        icon={
          <EuiAvatar
            name="Elastic"
            iconType="logoElastic"
            color={euiTheme.colors.backgroundBasePrimary}
          />
        }
      >
        <EuiText
          size="s"
          css={css`
            padding: ${euiTheme.size.s};
            border-radius: ${euiTheme.border.radius.medium};
            background-color: ${euiTheme.colors.backgroundBasePrimary};
          `}
        >
          {i18n.TRACKING_STARTED_LABEL}
        </EuiText>
      </EuiTimelineItem>
    );
  }
);
