/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { popularizeField } from '@kbn/unified-data-table/src/utils/popularize_field';
import { generateFilters } from '@kbn/data-plugin/public';
import { useDispatch } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { useDataView } from '../../../../../../data_view_manager/hooks/use_data_view';
import { useKibana } from '../../../../../../common/lib/kibana';
import { DEFAULT_ALERTS_INDEX } from '../../../../../../../common/constants';
import { useSpaceId } from '../../../../../../common/hooks/use_space_id';
import { PageScope } from '../../../../../../data_view_manager/constants';
import { timelineActions } from '../../../../../store';

const ALERTS_ONLY_FILTER_ALIAS = i18n.translate(
  'xpack.securitySolution.timeline.filters.alertsOnlyFilterAlias',
  {
    defaultMessage: 'Alerts only',
  }
);

/**
 * Hook to add an "alerts only" filter to a timeline's filter manager.
 */
export interface UseAddAlertsOnlyFilterParams {
  /**
   * The ID of the timeline where the filter will be added
   */
  timelineId: string;
}

export const useAddAlertsOnlyFilter = ({
  timelineId,
}: UseAddAlertsOnlyFilterParams): (() => void) => {
  const dispatch = useDispatch();
  const {
    timelineDataService: {
      query: { filterManager },
    },
    dataViews,
    application: { capabilities },
  } = useKibana().services;

  const { dataView } = useDataView(PageScope.timeline);
  const spaceId = useSpaceId();

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
      newFilters[0].meta.alias = ALERTS_ONLY_FILTER_ALIAS;

      // With the new filter, we should reset the saved timeline indices to be the full data view indices
      // This reset logic typically happened here: x-pack/solutions/security/plugins/security_solution/public/timelines/components/timeline/index.tsx
      if (dataView?.id) {
        dispatch(
          timelineActions.updateDataView({
            dataViewId: dataView.id,
            id: timelineId,
            indexNames: dataView?.getIndexPattern().split(',') || [],
          })
        );
      }

      // Add the new alerts only filter
      filterManager.addFilters(newFilters);

      // Popularize the _index field since the user is explicitly filtering on it in the unified field list in timeline
      popularizeField(dataView, field, dataViews, capabilities);
    }
  }, [capabilities, dataView, dataViews, dispatch, filterManager, spaceId, timelineId]);
};
