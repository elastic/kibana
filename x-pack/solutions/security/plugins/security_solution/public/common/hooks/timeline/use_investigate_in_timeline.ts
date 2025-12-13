/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { Filter, Query } from '@kbn/es-query';
import { PageScope } from '../../../data_view_manager/constants';
import { useSelectDataView } from '../../../data_view_manager/hooks/use_select_data_view';
import { useCreateTimeline } from '../../../timelines/hooks/use_create_timeline';
import { applyKqlFilterQuery, setFilters, updateProviders } from '../../../timelines/store/actions';
import type { DataProvider } from '../../../../common/types';
import { sourcererSelectors } from '../../store';
import { inputsActions } from '../../store/inputs';
import { InputsModelId } from '../../store/inputs/constants';
import type { TimeRange } from '../../store/inputs/model';
import { TimelineId } from '../../../../common/types/timeline';
import { TimelineTypeEnum } from '../../../../common/api/timeline';

interface InvestigateInTimelineArgs {
  /**
   * The query to apply to the timeline.
   */
  query?: Query;

  /**
   * The data providers to apply to the timeline.
   */
  dataProviders?: DataProvider[] | null;

  /**
   * The filters to apply to the timeline.
   */
  filters?: Filter[] | null;

  /**
   * The time range to apply to the timeline, defaults to global time range.
   */
  timeRange?: TimeRange;

  /**
   * Whether to keep the current data view or reset it to the default.
   */
  keepDataView?: boolean;
}

/**
 * This hook returns a callback that, when called, opens the timeline modal.
 * It clears the current timeline or timeline template.
 * Parameters can be passed to configure the timeline as it opens
 */
export const useInvestigateInTimeline = () => {
  const dispatch = useDispatch();

  const signalIndexName = useSelector(sourcererSelectors.signalIndexName);
  const defaultDataView = useSelector(sourcererSelectors.defaultDataView);

  const clearTimelineTemplate = useCreateTimeline({
    timelineId: TimelineId.active,
    timelineType: TimelineTypeEnum.template,
  });

  const clearTimelineDefault = useCreateTimeline({
    timelineId: TimelineId.active,
    timelineType: TimelineTypeEnum.default,
  });

  const setSelectedDataView = useSelectDataView();

  const investigateInTimeline = useCallback(
    async ({
      query,
      dataProviders,
      filters,
      timeRange,
      keepDataView,
    }: InvestigateInTimelineArgs) => {
      const hasTemplateProviders =
        dataProviders && dataProviders.find((provider) => provider.type === 'template');
      const clearTimeline = hasTemplateProviders ? clearTimelineTemplate : clearTimelineDefault;

      if (dataProviders || filters || query) {
        // Reset the current timeline
        if (timeRange) {
          await clearTimeline({
            timeRange,
          });
        } else {
          await clearTimeline();
        }
        if (dataProviders) {
          // Update the timeline's providers to match the current prevalence field query
          dispatch(
            updateProviders({
              id: TimelineId.active,
              providers: dataProviders,
            })
          );
        }
        // Use filters if more than a certain amount of ids for dom performance.
        if (filters) {
          dispatch(
            setFilters({
              id: TimelineId.active,
              filters,
            })
          );
        }
        if (query) {
          dispatch(
            applyKqlFilterQuery({
              id: TimelineId.active,
              filterQuery: {
                kuery: {
                  kind: 'kuery',
                  expression: query.query as string,
                },
                serializedQuery: query.query as string,
              },
            })
          );
        }
        // Only show detection alerts
        // (This is required so the timeline event count matches the prevalence count)
        if (!keepDataView) {
          setSelectedDataView({
            scope: PageScope.timeline,
            id: defaultDataView.id,
            fallbackPatterns: [signalIndexName || ''],
          });
        }
        // Unlock the time range from the global time range
        dispatch(inputsActions.removeLinkTo([InputsModelId.timeline, InputsModelId.global]));
      }
    },
    [
      clearTimelineTemplate,
      clearTimelineDefault,
      dispatch,
      setSelectedDataView,
      defaultDataView.id,
      signalIndexName,
    ]
  );

  return { investigateInTimeline };
};
