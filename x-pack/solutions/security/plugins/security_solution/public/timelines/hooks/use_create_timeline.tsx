/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { InputsModelId } from '../../common/store/inputs/constants';
import { timelineActions } from '../store';
import { useTimelineFullScreen } from '../../common/containers/use_full_screen';
import { TimelineId } from '../../../common/types/timeline';
import { type TimelineType, TimelineTypeEnum } from '../../../common/api/timeline';
import { useDeepEqualSelector } from '../../common/hooks/use_selector';
import { inputsActions, inputsSelectors } from '../../common/store/inputs';
import { appActions } from '../../common/store/app';
import type { TimeRange } from '../../common/store/inputs/model';
import { useDiscoverInTimelineContext } from '../../common/components/discover_in_timeline/use_discover_in_timeline_context';
import { defaultUdtHeaders } from '../components/timeline/body/column_headers/default_headers';
import { timelineDefaults } from '../store/defaults';
import { useSelectDataView } from '../../data_view_manager/hooks/use_select_data_view';
import { PageScope } from '../../data_view_manager/constants';
import { sourcererActions } from '../../sourcerer/store';
import { useSecurityDefaultPatterns } from '../../data_view_manager/hooks/use_security_default_patterns';

export interface UseCreateTimelineParams {
  /**
   * Id of the timeline
   */
  timelineId: string;
  /**
   * Type of the timeline (default, template)
   */
  timelineType: TimelineType;
  /**
   * Callback to be called when the timeline is created
   */
  onClick?: () => void;
}

/**
 * Creates a new empty timeline for the given id and type.
 * Can be used to create new timelines or to reset timeline state.
 * It allows a callback to be passed in to be called when the timeline is created.
 */
export const useCreateTimeline = ({
  timelineId,
  timelineType,
  onClick,
}: UseCreateTimelineParams): ((options?: { timeRange?: TimeRange }) => Promise<void>) => {
  const dispatch = useDispatch();

  const { id: defaultDataViewId, indexPatterns: selectedPatterns } = useSecurityDefaultPatterns();
  const dataViewId = useMemo(() => defaultDataViewId ?? '', [defaultDataViewId]);

  const { timelineFullScreen, setTimelineFullScreen } = useTimelineFullScreen();
  const globalTimeRange = useDeepEqualSelector(inputsSelectors.globalTimeRangeSelector);

  const { resetDiscoverAppState } = useDiscoverInTimelineContext();

  const setSelectedDataView = useSelectDataView();

  const createTimeline = useCallback(
    ({
      id,
      show,
      timeRange: timeRangeParam,
    }: {
      id: string;
      show: boolean;
      timeRange?: TimeRange;
    }) => {
      const timerange = timeRangeParam ?? globalTimeRange;

      if (id === TimelineId.active && timelineFullScreen) {
        setTimelineFullScreen(false);
      }

      setSelectedDataView({
        id: dataViewId,
        fallbackPatterns: selectedPatterns,
        scope: PageScope.timeline,
      });

      dispatch(
        sourcererActions.setSelectedDataView({
          id: PageScope.timeline,
          selectedDataViewId: dataViewId,
          selectedPatterns,
        })
      );

      dispatch(
        timelineActions.createTimeline({
          columns: defaultUdtHeaders,
          dataViewId,
          id,
          indexNames: selectedPatterns,
          show,
          timelineType,
          updated: undefined,
          excludedRowRendererIds:
            timelineType !== TimelineTypeEnum.template
              ? timelineDefaults.excludedRowRendererIds
              : [],
        })
      );

      dispatch(inputsActions.addLinkTo([InputsModelId.global, InputsModelId.timeline]));
      dispatch(appActions.addNotes({ notes: [] }));

      if (timeRangeParam) {
        dispatch(inputsActions.removeLinkTo([InputsModelId.timeline, InputsModelId.global]));
      }

      if (timerange?.kind === 'absolute') {
        dispatch(
          inputsActions.setAbsoluteRangeDatePicker({
            ...timerange,
            id: InputsModelId.timeline,
          })
        );
      } else if (timerange?.kind === 'relative') {
        dispatch(
          inputsActions.setRelativeRangeDatePicker({
            ...timerange,
            id: InputsModelId.timeline,
          })
        );
      }
    },
    [
      globalTimeRange,
      timelineFullScreen,
      dispatch,
      dataViewId,
      selectedPatterns,
      setSelectedDataView,
      timelineType,
      setTimelineFullScreen,
    ]
  );

  return useCallback(
    async (options?: { timeRange?: TimeRange }) => {
      await resetDiscoverAppState();
      createTimeline({ id: timelineId, show: true, timeRange: options?.timeRange });
      if (typeof onClick === 'function') {
        onClick();
      }
    },
    [createTimeline, timelineId, onClick, resetDiscoverAppState]
  );
};
