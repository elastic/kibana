/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import type { FilterManager } from '@kbn/data-plugin/public';
import { InPortal } from 'react-reverse-portal';
import { IS_DRAGGING_CLASS_NAME } from '@kbn/securitysolution-t-grid';
import { css } from '@emotion/react';
import { useTimelineEventsCountPortal } from '../../../../../../common/hooks/use_timeline_events_count';
import {
  type TimelineStatus,
  TimelineStatusEnum,
  TimelineTypeEnum,
} from '../../../../../../../common/api/timeline';
import type { TimelineTabs } from '../../../../../../../common/types/timeline';
import { timelineSelectors } from '../../../../../store';
import { useDeepEqualSelector } from '../../../../../../common/hooks/use_selector';
import { timelineDefaults } from '../../../../../store/defaults';
import * as i18n from './translations';
import { StatefulSearchOrFilter } from '../../../search_or_filter';
import { DataProviders } from '../../../data_providers';
import { EventsCountBadge, StyledEuiFlyoutHeader, TabHeaderContainer } from '../../shared/layout';
import {
  useAddAlertsOnlyFilter,
  useShouldShowAlertsOnlyMigrationMessage,
  useTimelineSelectAlertsOnlyDataView,
} from './use_show_alerts_only_migration_helpers';

interface Props {
  activeTab: TimelineTabs;
  currentIndices: string[];
  dataViewId: string | null;
  filterManager: FilterManager;
  show: boolean;
  showCallOutUnauthorizedMsg: boolean;
  showEventsCountBadge: boolean;
  status: TimelineStatus | null;
  timelineId: string;
  totalCount: number;
}

const useStyles = (shouldShowQueryBuilder: boolean) => {
  const { euiTheme } = useEuiTheme();

  return css`
    position: relative;
    width: 100%;
    transition: 0.5s ease-in-out;
    overflow: hidden;
    display: block;
    max-height: ${shouldShowQueryBuilder ? '300px' : '0'};
    visibility: ${shouldShowQueryBuilder ? 'visible' : 'hidden'};
    margin-block-start: ${shouldShowQueryBuilder ? '0' : `calc(-1 * ${euiTheme.size.s})`};

    . ${IS_DRAGGING_CLASS_NAME} & {
      display: block;
      max-height: 300px;
      visibility: visible;
      margin-block-start: 0;
    }
  `;
};

const QueryTabHeaderComponent: React.FC<Props> = ({
  activeTab,
  currentIndices,
  dataViewId,
  filterManager,
  show,
  showCallOutUnauthorizedMsg,
  status,
  timelineId,
  showEventsCountBadge,
  totalCount,
}) => {
  const { portalNode: timelineEventsCountPortalNode } = useTimelineEventsCountPortal();
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);

  const getIsDataProviderVisible = useMemo(
    () => timelineSelectors.dataProviderVisibilitySelector(),
    []
  );

  const timelineType = useDeepEqualSelector(
    (state) => (getTimeline(state, timelineId) ?? timelineDefaults).timelineType
  );
  const isDataProviderVisible = useDeepEqualSelector(
    (state) => getIsDataProviderVisible(state, timelineId) ?? timelineDefaults.isDataProviderVisible
  );
  const shouldShowQueryBuilder = useMemo(
    () => isDataProviderVisible || timelineType === TimelineTypeEnum.template,
    [isDataProviderVisible, timelineType]
  );
  const dataProviderStyles = useStyles(shouldShowQueryBuilder);

  const showAlertsOnlyMigrationMessage = useShouldShowAlertsOnlyMigrationMessage({
    currentTimelineIndices: currentIndices,
    dataViewId,
  });

  const selectAlertsDataView = useTimelineSelectAlertsOnlyDataView();
  const addAlertsFilter = useAddAlertsOnlyFilter(timelineId);

  return (
    <StyledEuiFlyoutHeader data-test-subj={`${activeTab}-tab-flyout-header`} hasBorder={false}>
      <InPortal node={timelineEventsCountPortalNode}>
        {showEventsCountBadge ? (
          <EventsCountBadge data-test-subj="query-events-count">{totalCount}</EventsCountBadge>
        ) : null}
      </InPortal>
      <EuiFlexGroup gutterSize="s" direction="column">
        <EuiFlexItem data-test-subj="timeline-date-picker-container">
          <TabHeaderContainer data-test-subj="timelineHeader">
            <EuiFlexGroup gutterSize="s" direction="column">
              <EuiFlexItem>
                <StatefulSearchOrFilter filterManager={filterManager} timelineId={timelineId} />
              </EuiFlexItem>
              {showAlertsOnlyMigrationMessage && (
                <EuiFlexItem>
                  <EuiCallOut
                    announceOnMount
                    data-test-subj="timelineCallOutAlertsOnlyMigrationMessage"
                    title={i18n.CALL_OUT_ALERTS_ONLY_MIGRATION_TITLE}
                    color="warning"
                    iconType="warning"
                    size="m"
                  >
                    <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
                      <EuiFlexItem>
                        <EuiText size="s">{i18n.CALL_OUT_ALERTS_ONLY_MIGRATION_CONTENT}</EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                          <EuiFlexItem grow={false}>
                            <EuiButtonEmpty
                              aria-label={i18n.CALL_OUT_ALERTS_ONLY_MIGRATION_SWITCH_BUTTON}
                              color="text"
                              onClick={selectAlertsDataView}
                              size="s"
                            >
                              {i18n.CALL_OUT_ALERTS_ONLY_MIGRATION_SWITCH_BUTTON}
                            </EuiButtonEmpty>
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>
                            <EuiButton
                              aria-label={i18n.CALL_OUT_FILTER_FOR_ALERTS_BUTTON}
                              color="warning"
                              onClick={addAlertsFilter}
                              fill
                              size="s"
                            >
                              {i18n.CALL_OUT_FILTER_FOR_ALERTS_BUTTON}
                            </EuiButton>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiCallOut>
                </EuiFlexItem>
              )}
              {showCallOutUnauthorizedMsg && (
                <EuiFlexItem>
                  <EuiCallOut
                    announceOnMount={false}
                    data-test-subj="timelineCallOutUnauthorized"
                    title={i18n.CALL_OUT_UNAUTHORIZED_MSG}
                    color="warning"
                    iconType="warning"
                    size="s"
                  />
                </EuiFlexItem>
              )}
              {status === TimelineStatusEnum.immutable && (
                <EuiFlexItem>
                  <EuiCallOut
                    announceOnMount={false}
                    data-test-subj="timelineImmutableCallOut"
                    title={i18n.CALL_OUT_IMMUTABLE}
                    color="primary"
                    iconType="warning"
                    size="s"
                  />
                </EuiFlexItem>
              )}
              {show ? (
                <div css={dataProviderStyles} className="data-providers-container">
                  <DataProviders timelineId={timelineId} />
                </div>
              ) : null}
            </EuiFlexGroup>
          </TabHeaderContainer>
        </EuiFlexItem>
      </EuiFlexGroup>
    </StyledEuiFlyoutHeader>
  );
};

export const QueryTabHeader = React.memo(QueryTabHeaderComponent);
