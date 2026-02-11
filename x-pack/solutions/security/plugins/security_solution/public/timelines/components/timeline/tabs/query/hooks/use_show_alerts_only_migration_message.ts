/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { TimelineModel } from '../../../../../store/model';
import { DEFAULT_ALERTS_INDEX, DEFAULT_DATA_VIEW_ID } from '../../../../../../../common/constants';
import { useSpaceId } from '../../../../../../common/hooks/use_space_id';

export interface UseShowAlertsOnlyMigrationMessageParams {
  /**
   * The currently selected timeline indices
   */
  currentTimelineIndices: TimelineModel['indexNames'];
  /**
   * The id of the dataview
   */
  dataViewId: string | null;
}

/**
 * Determines whether to show the "alerts only" migration callout based on the current timeline indices and dataview
 */
export const useShouldShowAlertsOnlyMigrationMessage = ({
  currentTimelineIndices,
  dataViewId,
}: UseShowAlertsOnlyMigrationMessageParams): boolean => {
  const currentSpace = useSpaceId();

  return useMemo(() => {
    // The only selected pattern is the alerts index pattern
    const isAlertsOnly =
      currentTimelineIndices.length === 1 &&
      currentTimelineIndices[0].includes(DEFAULT_ALERTS_INDEX);

    // The current data view is the default data view for the current space
    const currentDataView = dataViewId === `${DEFAULT_DATA_VIEW_ID}-${currentSpace}`;

    // Since the default data view is not just the alerts index, we can safely assume this user had
    // "show detection alerts only" enabled and is now impacted by the removal of that feature.
    return isAlertsOnly && currentDataView;
  }, [currentSpace, currentTimelineIndices, dataViewId]);
};
