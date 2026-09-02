/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { HtmlPortalNode } from 'react-reverse-portal';
import { useTimelineEventsCountPortal } from '../../../../../../common/hooks/use_timeline_events_count';
import { TimelineTypeEnum } from '../../../../../../../common/api/timeline';
import { timelineSelectors } from '../../../../../store';
import { useDeepEqualSelector } from '../../../../../../common/hooks/use_selector';
import { timelineDefaults } from '../../../../../store/defaults';

export interface QueryTabHeaderData {
  /** Portal node shared between both sub-components for rendering the events-count badge. */
  timelineEventsCountPortalNode: HtmlPortalNode;
  /** True when the data-provider query builder should be expanded. Only used by RegularQueryTabHeader. */
  shouldShowQueryBuilder: boolean;
}

/**
 * Centralises hook calls shared by SuperTimelineQueryTabHeader and RegularQueryTabHeader.
 * Each sub-component destructures only the fields it needs.
 */
export const useQueryTabHeaderData = (timelineId: string): QueryTabHeaderData => {
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

  return {
    timelineEventsCountPortalNode,
    shouldShowQueryBuilder,
  };
};
