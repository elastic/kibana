/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useSelectDataView } from '../../../../../../data_view_manager/hooks/use_select_data_view';
import { DEFAULT_ALERT_DATA_VIEW_ID } from '../../../../../../../common/constants';
import { useSpaceId } from '../../../../../../common/hooks/use_space_id';
import { DataViewManagerScopeName } from '../../../../../../data_view_manager/constants';

/**
 * Returns a callback to select the alerts-only data view for the timeline
 */
export const useTimelineSelectAlertsOnlyDataView = (): (() => void) => {
  const selectDataView = useSelectDataView();
  const spaceId = useSpaceId();

  return useCallback(
    () =>
      selectDataView({
        id: `${DEFAULT_ALERT_DATA_VIEW_ID}-${spaceId}`,
        scope: DataViewManagerScopeName.timeline,
      }),
    [selectDataView, spaceId]
  );
};
