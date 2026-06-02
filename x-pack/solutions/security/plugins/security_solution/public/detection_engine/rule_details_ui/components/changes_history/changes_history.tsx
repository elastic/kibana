/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiResizableContainer,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { SecurityPageName } from '../../../../app/types';
import { useKibana } from '../../../../common/lib/kibana';
import { APP_UI_ID } from '../../../../../common/constants';
import { getRuleDetailsTabUrl } from '../../../../common/components/link_to/redirect_to_detection_engine';
import type { RuleHistoryItem } from '../../../../../common/api/detection_engine/rule_management';
import { RuleChangesHistoryTimeline } from '../changes_history_timeline';
import { useInfiniteChangeHistory } from '../../../rule_management/api/hooks/use_infinite_change_history';
import { RuleDetailTabs } from '../../pages/rule_details/use_rule_details_tabs';
import { RuleChangesDiff } from '../changes_diff/changes_diff';
import * as i18n from './translations';

export const RuleChangesHistory = memo(function RuleChangesHistory(): JSX.Element {
  const { euiTheme } = useEuiTheme();
  const { detailName: ruleId } = useParams<{ detailName: string }>();
  const {
    application: { navigateToApp },
  } = useKibana().services;
  const [selectedItem, setSelectedItem] = useState<RuleHistoryItem | undefined>();
  const handleClose = useCallback(() => {
    navigateToApp(APP_UI_ID, {
      deepLinkId: SecurityPageName.rules,
      path: getRuleDetailsTabUrl(ruleId, RuleDetailTabs.overview),
    });
  }, [navigateToApp, ruleId]);

  const { data, isLoading, isFetching, isFetchingNextPage, fetchNextPage, hasNextPage } =
    useInfiniteChangeHistory({ ruleId });
  const handleNextPageLoading = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage) {
      return;
    }

    fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const items = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data?.pages]);
  const changeHistoryStartedAt = data?.pages[0].tracking_started_at
    ? new Date(data?.pages[0].tracking_started_at)
    : undefined;

  const styles = useMemo(
    () => ({
      rightPanelHeaderCss: css`
        padding: ${euiTheme.size.m};
        border-bottom: ${euiTheme.border.thin};
      `,
      leftPanelContentCss: css`
        overflow-y: auto;
        padding: ${euiTheme.size.m};
      `,
      rightPanelContentCss: css`
        overflow: hidden;
        padding: ${euiTheme.size.m};
      `,
    }),
    [euiTheme]
  );

  return (
    <EuiResizableContainer style={{ flex: '1 1 0', minHeight: 0 }}>
      {(EuiResizablePanel, EuiResizableButton) => (
        <>
          <EuiResizablePanel
            id="rule-changes-history-left"
            initialSize={65}
            minSize="200px"
            css={styles.leftPanelContentCss}
          >
            <RuleChangesDiff item={selectedItem} isLoading={isLoading || isFetching} />
          </EuiResizablePanel>
          <EuiResizableButton />
          <EuiResizablePanel
            id="rule-changes-history-right"
            initialSize={35}
            minSize="300px"
            paddingSize="none"
          >
            <EuiFlexGroup direction="column" gutterSize="none" style={{ height: '100%' }}>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup
                  alignItems="center"
                  gutterSize="s"
                  responsive={false}
                  css={styles.rightPanelHeaderCss}
                >
                  <EuiFlexItem>
                    <EuiTitle size="xs">
                      <h2>{i18n.VERSION_HISTORY_TITLE}</h2>
                    </EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiToolTip content={i18n.CLOSE_VERSION_HISTORY} disableScreenReaderOutput>
                      <EuiButtonIcon
                        iconType="cross"
                        aria-label={i18n.CLOSE_VERSION_HISTORY}
                        onClick={handleClose}
                        data-test-subj="ruleChangesHistoryClose"
                      />
                    </EuiToolTip>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem css={styles.rightPanelContentCss}>
                <RuleChangesHistoryTimeline
                  items={items}
                  isLoading={isLoading || isFetching}
                  startedAt={changeHistoryStartedAt}
                  onLoadMore={handleNextPageLoading}
                  onSelectItem={setSelectedItem}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiResizablePanel>
        </>
      )}
    </EuiResizableContainer>
  );
});
