/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FilterManager } from '@kbn/data-plugin/public';
import { useSelector } from 'react-redux-v7';
import type { TimelineStatus } from '../../../../../../../common/api/timeline';
import type { TimelineTabs } from '../../../../../../../common/types/timeline';
import { selectIsSuperTimeline } from '../../../../../store/selectors';
import type { State } from '../../../../../../common/store';
import { SuperTimelineQueryTabHeader } from './super_timeline_query_tab_header';
import { RegularQueryTabHeader } from './regular_query_tab_header';

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

const QueryTabHeaderComponent: React.FC<Props> = ({
  activeTab,
  currentIndices,
  dataViewId,
  filterManager,
  show,
  showCallOutUnauthorizedMsg,
  showEventsCountBadge,
  status,
  timelineId,
  totalCount,
}) => {
  const isSuperTimeline = useSelector((state: State) => selectIsSuperTimeline(state, timelineId));

  if (isSuperTimeline) {
    return (
      <SuperTimelineQueryTabHeader
        activeTab={activeTab}
        filterManager={filterManager}
        showEventsCountBadge={showEventsCountBadge}
        timelineId={timelineId}
        totalCount={totalCount}
      />
    );
  }

  return (
    <RegularQueryTabHeader
      activeTab={activeTab}
      currentIndices={currentIndices}
      dataViewId={dataViewId}
      filterManager={filterManager}
      show={show}
      showCallOutUnauthorizedMsg={showCallOutUnauthorizedMsg}
      showEventsCountBadge={showEventsCountBadge}
      status={status}
      timelineId={timelineId}
      totalCount={totalCount}
    />
  );
};

export const QueryTabHeader = React.memo(QueryTabHeaderComponent);
