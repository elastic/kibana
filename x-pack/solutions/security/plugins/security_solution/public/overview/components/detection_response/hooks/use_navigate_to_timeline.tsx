/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { v4 as uuidv4 } from 'uuid';
import { SourcererScopeName } from '../../../../sourcerer/store/model';
import { sourcererActions } from '../../../../sourcerer/store';
import {
  getDataProvider,
  getDataProviderAnd,
} from '../../../../common/components/event_details/use_action_cell_data_provider';
import type { DataProvider, QueryOperator } from '../../../../../common/types/timeline';
import { TimelineId } from '../../../../../common/types/timeline';
import { TimelineTypeEnum } from '../../../../../common/api/timeline';
import { useCreateTimeline } from '../../../../timelines/hooks/use_create_timeline';
import { updateProviders } from '../../../../timelines/store/actions';
import { sourcererSelectors } from '../../../../common/store';
import type { TimeRange } from '../../../../common/store/inputs/model';

export interface Filter {
  field: string;
  value: string | string[];
  operator?: QueryOperator;
}

export const useNavigateToTimeline = () => {
  const dispatch = useDispatch();

  const signalIndexName = useSelector(sourcererSelectors.signalIndexName);
  const defaultDataView = useSelector(sourcererSelectors.defaultDataView);

  const clearTimeline = useCreateTimeline({
    timelineId: TimelineId.active,
    timelineType: TimelineTypeEnum.default,
  });

  const navigateToTimeline = useCallback(
    async (dataProviders: DataProvider[], timeRange?: TimeRange) => {
      // Reset the current timeline
      await clearTimeline({ timeRange });
      // Update the timeline's providers to match the current prevalence field query
      dispatch(
        updateProviders({
          id: TimelineId.active,
          providers: dataProviders,
        })
      );

      dispatch(
        sourcererActions.setSelectedDataView({
          id: SourcererScopeName.timeline,
          selectedDataViewId: defaultDataView.id,
          selectedPatterns: [signalIndexName || ''],
        })
      );
    },
    [clearTimeline, defaultDataView.id, dispatch, signalIndexName]
  );

  /** *
   * Open a timeline with the given filters prepopulated.
   * It accepts an array of Filter[]s where each item represents a set of AND queries, and each top level comma represents an OR.
   *
   * [[filter1 & filter2] OR [filter3 & filter4]]
   *
   * @param timeRange Defines the timeline time range field and removes the time range lock
   */
  const openTimelineWithFilters = useCallback(
    async (filters: Array<[...Filter[]]>, timeRange?: TimeRange) => {
      const dataProviders = [];

      for (const orFilterGroup of filters) {
        const mainFilter = orFilterGroup[0];

        if (mainFilter) {
          const dataProvider = getDataProvider(
            mainFilter.field,
            uuidv4(),
            mainFilter.value,
            mainFilter.operator
          );

          for (const filter of orFilterGroup.slice(1)) {
            dataProvider.and.push(
              getDataProviderAnd(filter.field, uuidv4(), filter.value, filter.operator)
            );
          }
          dataProviders.push(dataProvider);
        }
      }

      await navigateToTimeline(dataProviders, timeRange);
    },
    [navigateToTimeline]
  );

  return {
    openTimelineWithFilters,
  };
};
