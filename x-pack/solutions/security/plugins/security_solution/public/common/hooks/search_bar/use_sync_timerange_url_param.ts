/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useKibana } from '../../lib/kibana';
import { useIsExperimentalFeatureEnabled } from '../use_experimental_features';
import type { UrlInputsModel } from '../../store/inputs/model';
import { inputsSelectors } from '../../store/inputs';
import { useUpdateUrlParam } from '../../utils/global_query_string';
import { URL_PARAM_KEY } from '../use_url_state';

export const useSyncTimerangeUrlParam = () => {
  const updateTimerangeUrlParam = useUpdateUrlParam<UrlInputsModel>(URL_PARAM_KEY.timerange);
  const getInputSelector = useMemo(() => inputsSelectors.inputsSelector(), []);
  const inputState = useSelector(getInputSelector);
  const isSocTrendsEnabled = useIsExperimentalFeatureEnabled('socTrendsEnabled');
  const { serverless } = useKibana().services;
  // only on serverless
  const isValueReportEnabled = !!serverless;

  const { linkTo: globalLinkTo, timerange: globalTimerange } = inputState.global;
  const { linkTo: timelineLinkTo, timerange: timelineTimerange } = inputState.timeline;

  const socTrendsUrlParams = useMemo(() => {
    if (isSocTrendsEnabled && inputState.socTrends) {
      const { linkTo: socTrendsLinkTo, timerange: socTrendsTimerange } = inputState.socTrends;
      return {
        socTrends: {
          [URL_PARAM_KEY.timerange]: socTrendsTimerange,
          linkTo: socTrendsLinkTo,
        },
      };
    }
    return {};
  }, [inputState.socTrends, isSocTrendsEnabled]);

  const valueReportUrlParams = useMemo(() => {
    if (isValueReportEnabled && inputState.valueReport) {
      const { linkTo: valueReportLinkTo, timerange: valueReportTimerange } = inputState.valueReport;
      return {
        valueReport: {
          [URL_PARAM_KEY.timerange]: valueReportTimerange,
          linkTo: valueReportLinkTo,
        },
      };
    }
    return {};
  }, [inputState.valueReport, isValueReportEnabled]);

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
      ...socTrendsUrlParams,
    });
  }, [
    updateTimerangeUrlParam,
    globalLinkTo,
    globalTimerange,
    timelineLinkTo,
    timelineTimerange,
    socTrendsUrlParams,
    valueReportUrlParams,
  ]);
};
