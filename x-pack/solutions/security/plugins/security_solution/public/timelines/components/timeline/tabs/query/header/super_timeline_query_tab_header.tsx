/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import type { FilterManager } from '@kbn/data-plugin/public';
import { InPortal } from 'react-reverse-portal';
import type { TimelineTabs } from '../../../../../../../common/types/timeline';
import { StatefulSearchOrFilter } from '../../../search_or_filter';
import { EventsCountBadge, StyledEuiFlyoutHeader, TabHeaderContainer } from '../../shared/layout';
import { useQueryTabHeaderData } from './use_query_tab_header_data';

export interface SuperTimelineQueryTabHeaderProps {
  activeTab: TimelineTabs;
  filterManager: FilterManager;
  showEventsCountBadge: boolean;
  timelineId: string;
  totalCount: number;
}

const SuperTimelineQueryTabHeaderComponent: React.FC<SuperTimelineQueryTabHeaderProps> = ({
  activeTab,
  filterManager,
  showEventsCountBadge,
  timelineId,
  totalCount,
}) => {
  const { timelineEventsCountPortalNode } = useQueryTabHeaderData(timelineId);

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
            </EuiFlexGroup>
          </TabHeaderContainer>
        </EuiFlexItem>
      </EuiFlexGroup>
    </StyledEuiFlyoutHeader>
  );
};

export const SuperTimelineQueryTabHeader = React.memo(SuperTimelineQueryTabHeaderComponent);
