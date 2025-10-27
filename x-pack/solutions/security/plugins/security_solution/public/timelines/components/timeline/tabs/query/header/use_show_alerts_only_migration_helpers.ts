/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { popularizeField } from '@kbn/unified-data-table/src/utils/popularize_field';
import { generateFilters } from '@kbn/data-plugin/public';
import { useDispatch } from 'react-redux';
import type { TimelineModel } from '../../../../../store/model';
import { useDataView } from '../../../../../../data_view_manager/hooks/use_data_view';
import { useSelectDataView } from '../../../../../../data_view_manager/hooks/use_select_data_view';
import { useKibana } from '../../../../../../common/lib/kibana';
import {
  DEFAULT_ALERTS_INDEX,
  DEFAULT_DATA_VIEW_ID,
  DEFAULT_ALERT_DATA_VIEW_ID,
} from '../../../../../../../common/constants';
import { useSpaceId } from '../../../../../../common/hooks/use_space_id';
import { DataViewManagerScopeName } from '../../../../../../data_view_manager/constants';
import { timelineActions } from '../../../../../store';
import * as i18n from './translations';

export const useShouldShowAlertsOnlyMigrationMessage = ({
  currentTimelineIndices,
  dataViewId,
}: {
  currentTimelineIndices: TimelineModel['indexNames'];
  dataViewId: string | null;
}): boolean => {
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

export const useTimelineSelectAlertsOnlyDataView = () => {
  const selectDataView = useSelectDataView();
  const spaceId = useSpaceId();

  return useCallback(() => {
    selectDataView({
      id: `${DEFAULT_ALERT_DATA_VIEW_ID}-${spaceId}`,
      scope: DataViewManagerScopeName.timeline,
    });
  }, [selectDataView, spaceId]);
};

export const useAddAlertsOnlyFilter = (timelineId: string) => {
  const {
    timelineDataService,
    dataViews,
    application: { capabilities },
  } = useKibana().services;
  const dispatch = useDispatch();
  const {
    query: { filterManager },
  } = timelineDataService;

  const { dataView } = useDataView(DataViewManagerScopeName.timeline);
  const spaceId = useSpaceId();

  // With the new filter, we should reset the saved timeline indices to be the full data view indices
  // This reset logic typically happened here: x-pack/solutions/security/plugins/security_solution/public/timelines/components/timeline/index.tsx
  const resetDefaultIndices = useCallback(() => {
    if (dataView?.id) {
      dispatch(
        timelineActions.updateDataView({
          dataViewId: dataView.id,
          id: timelineId,
          indexNames: dataView?.getIndexPattern().split(',') || [],
        })
      );
    }
  }, [dispatch, dataView, timelineId]);

  return useCallback(() => {
    if (dataView && filterManager && spaceId) {
      const field = '_index';
      const operation = '+';
      const alertsIndexValue = `${DEFAULT_ALERTS_INDEX}-${spaceId}`;
      // Generate filter for the alerts index
      const newFilters = generateFilters(
        filterManager,
        field,
        alertsIndexValue,
        operation,
        dataView
      );
      // Alias the filter to 'Alerts only' for better UX
      newFilters[0].meta.alias = i18n.ALERTS_ONLY_FILTER_ALIAS;
      // Reset the indices stored on the timeline to be the full data view indices
      resetDefaultIndices();
      // Add the new alerts only filter
      filterManager.addFilters(newFilters);
      // Popularize the _index field since the user is explicitly filtering on it in the unified field list in timeline
      popularizeField(dataView, field, dataViews, capabilities);
    }
  }, [capabilities, dataView, dataViews, filterManager, resetDefaultIndices, spaceId]);
};
