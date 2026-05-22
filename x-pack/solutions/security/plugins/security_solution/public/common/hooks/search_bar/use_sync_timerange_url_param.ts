/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { UrlInputsModel } from '../../store/inputs/model';
import { inputsSelectors } from '../../store/inputs';
import { useUpdateUrlParam } from '../../utils/global_query_string';
import { URL_PARAM_KEY } from '../use_url_state';

export const useSyncTimerangeUrlParam = () => {
  const updateTimerangeUrlParam = useUpdateUrlParam<UrlInputsModel>(URL_PARAM_KEY.timerange);
  const getInputSelector = useMemo(() => inputsSelectors.inputsSelector(), []);
  const inputState = useSelector(getInputSelector);

  const { linkTo: globalLinkTo, timerange: globalTimerange } = inputState.global;
  const { linkTo: timelineLinkTo, timerange: timelineTimerange } = inputState.timeline;

  const valueReportUrlParams = useMemo(() => {
    const { linkTo: valueReportLinkTo, timerange: valueReportTimerange } = inputState.valueReport;
    return {
      valueReport: {
        [URL_PARAM_KEY.timerange]: valueReportTimerange,
        linkTo: valueReportLinkTo,
      },
    };
  }, [inputState.valueReport]);

  useEffect(() => {
    updateTimerangeUrlParam({
      global: {
        [URL_PARAM_KEY.timerange]: globalTimerange,
        linkTo: globalLinkTo,
      },
      timeline: {
        [URL_PARAM_KEY.timerange]: timelineTimerange,
        linkTo: timelineLinkTo,
      },
      ...valueReportUrlParams,
    });
  }, [
    updateTimerangeUrlParam,
    globalLinkTo,
    globalTimerange,
    timelineLinkTo,
    timelineTimerange,
    valueReportUrlParams,
  ]);
};
