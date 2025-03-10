/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { get, isEmpty } from 'lodash/fp';
import { useDispatch } from 'react-redux';
import type { Dispatch } from 'redux';
import { useIsExperimentalFeatureEnabled } from '../use_experimental_features';
import type { TimeRangeKinds } from '../../store/inputs/constants';
import type {
  AbsoluteTimeRange,
  LinkTo,
  RelativeTimeRange,
  UrlInputsModel,
} from '../../store/inputs/model';
import { normalizeTimeRange } from '../../utils/normalize_time_range';
import { inputsActions } from '../../store/inputs';
import { formatDate } from '../../components/super_date_picker';
import { useInitializeUrlParam } from '../../utils/global_query_string';
import { URL_PARAM_KEY } from '../use_url_state';
import { InputsModelId } from '../../store/inputs/constants';

export const useInitTimerangeFromUrlParam = () => {
  const dispatch = useDispatch();
  const isSocTrendsEnabled = useIsExperimentalFeatureEnabled('socTrendsEnabled');
  const onInitialize = useCallback(
    (initialState: UrlInputsModel | null) =>
      initializeTimerangeFromUrlParam(initialState, dispatch, isSocTrendsEnabled),
    [dispatch, isSocTrendsEnabled]
  );

  useInitializeUrlParam(URL_PARAM_KEY.timerange, onInitialize);
};

const initializeTimerangeFromUrlParam = (
  initialState: UrlInputsModel | null,
  dispatch: Dispatch,
  isSocTrendsEnabled: boolean
) => {
  if (initialState != null) {
    const globalLinkTo: LinkTo = { linkTo: get('global.linkTo', initialState) };
    const globalType: TimeRangeKinds = get('global.timerange.kind', initialState);

    const timelineLinkTo: LinkTo = { linkTo: get('timeline.linkTo', initialState) };
    const timelineType: TimeRangeKinds = get('timeline.timerange.kind', initialState);

    const socTrendsLinkTo: LinkTo = { linkTo: get('socTrends.linkTo', initialState) };
    const socTrendsType: TimeRangeKinds = get('socTrends.timerange.kind', initialState);
    if (isSocTrendsEnabled) {
      if (isEmpty(socTrendsLinkTo.linkTo)) {
        dispatch(inputsActions.removeLinkTo([InputsModelId.global, InputsModelId.socTrends]));
      } else {
        dispatch(inputsActions.addLinkTo([InputsModelId.global, InputsModelId.socTrends]));
      }
    }

    if (isEmpty(globalLinkTo.linkTo)) {
      dispatch(inputsActions.removeLinkTo([InputsModelId.global, InputsModelId.timeline]));
      if (isSocTrendsEnabled) {
        dispatch(inputsActions.removeLinkTo([InputsModelId.global, InputsModelId.socTrends]));
      }
    } else {
      dispatch(inputsActions.addLinkTo([InputsModelId.global, InputsModelId.timeline]));
      if (isSocTrendsEnabled) {
        dispatch(inputsActions.addLinkTo([InputsModelId.global, InputsModelId.socTrends]));
      }
    }

    if (isEmpty(timelineLinkTo.linkTo)) {
      dispatch(inputsActions.removeLinkTo([InputsModelId.global, InputsModelId.timeline]));
    } else {
      dispatch(inputsActions.addLinkTo([InputsModelId.global, InputsModelId.timeline]));
    }

    if (timelineType) {
      if (timelineType === 'absolute') {
        const absoluteRange = normalizeTimeRange<AbsoluteTimeRange>(
          get('timeline.timerange', initialState)
        );

        dispatch(
          inputsActions.setAbsoluteRangeDatePicker({
            ...absoluteRange,
            id: InputsModelId.timeline,
          })
        );
      }

      if (timelineType === 'relative') {
        const relativeRange = normalizeTimeRange<RelativeTimeRange>(
          get('timeline.timerange', initialState)
        );

        // Updates date values when timerange is relative
        relativeRange.from = formatDate(relativeRange.fromStr);
        relativeRange.to = formatDate(relativeRange.toStr, {
          roundUp: true,
        });

        dispatch(
          inputsActions.setRelativeRangeDatePicker({
            ...relativeRange,
            id: InputsModelId.timeline,
          })
        );
      }
    }

    if (globalType) {
      if (globalType === 'absolute') {
        const absoluteRange = normalizeTimeRange<AbsoluteTimeRange>(
          get('global.timerange', initialState)
        );

        dispatch(
          inputsActions.setAbsoluteRangeDatePicker({
            ...absoluteRange,
            id: InputsModelId.global,
          })
        );
      }
      if (globalType === 'relative') {
        const relativeRange = normalizeTimeRange<RelativeTimeRange>(
          get('global.timerange', initialState)
        );

        // Updates date values when timerange is relative
        relativeRange.from = formatDate(relativeRange.fromStr);
        relativeRange.to = formatDate(relativeRange.toStr, {
          roundUp: true,
        });

        dispatch(
          inputsActions.setRelativeRangeDatePicker({
            ...relativeRange,
            id: InputsModelId.global,
          })
        );
      }
    }

    if (isSocTrendsEnabled && socTrendsType) {
      if (socTrendsType === 'absolute') {
        const absoluteRange = normalizeTimeRange<AbsoluteTimeRange>(
          get('socTrends.timerange', initialState)
        );

        dispatch(
          inputsActions.setAbsoluteRangeDatePicker({
            ...absoluteRange,
            id: InputsModelId.socTrends,
          })
        );
      }

      if (socTrendsType === 'relative') {
        const relativeRange = normalizeTimeRange<RelativeTimeRange>(
          get('socTrends.timerange', initialState)
        );

        // Updates date values when timerange is relative
        relativeRange.from = formatDate(relativeRange.fromStr);
        relativeRange.to = formatDate(relativeRange.toStr, {
          roundUp: true,
        });

        dispatch(
          inputsActions.setRelativeRangeDatePicker({
            ...relativeRange,
            id: InputsModelId.socTrends,
          })
        );
      }
    }
  }
};
