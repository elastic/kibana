/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

import { persistedLogViewReferenceRT } from '@kbn/logs-shared-plugin/common';
import { idFormatRT } from '../../id_formats/v1/id_formats';
import {
  badRequestErrorRT,
  forbiddenErrorRT,
  timeRangeRT,
  routeTimingMetadataRT,
} from '../../../shared';

import { logEntryCategoryRT, categoriesSortRT } from '../../../../log_analysis';

export const LOG_ANALYSIS_GET_LOG_ENTRY_CATEGORIES_PATH =
  '/api/infra/log_analysis/results/log_entry_categories';

/**
 * request
 */

const logEntryCategoriesHistogramParametersRT = rt.type({
  id: rt.string,
  timeRange: timeRangeRT,
  bucketCount: rt.number,
});

export type LogEntryCategoriesHistogramParameters = rt.TypeOf<
  typeof logEntryCategoriesHistogramParametersRT
>;

export const getLogEntryCategoriesRequestPayloadRT = rt.type({
  data: rt.intersection([
    rt.type({
      // the number of categories to fetch
      categoryCount: rt.number,
      // log view
      logView: persistedLogViewReferenceRT,
      idFormat: idFormatRT,
      // the time range to fetch the categories from
      timeRange: timeRangeRT,
      // a list of histograms to create
      histograms: rt.array(logEntryCategoriesHistogramParametersRT),
      // the criteria to the categories by
      sort: categoriesSortRT,
    }),
    rt.partial({
      // the datasets to filter for (optional, unfiltered if not present)
      datasets: rt.array(rt.string),
    }),
  ]),
});

export type GetLogEntryCategoriesRequestPayload = rt.TypeOf<
  typeof getLogEntryCategoriesRequestPayloadRT
>;

/**
 * response
 */

export const getLogEntryCategoriesSuccessReponsePayloadRT = rt.intersection([
  rt.type({
    data: rt.type({
      categories: rt.array(logEntryCategoryRT),
    }),
  }),
  rt.partial({
    timing: routeTimingMetadataRT,
  }),
]);

export type GetLogEntryCategoriesSuccessResponsePayload = rt.TypeOf<
  typeof getLogEntryCategoriesSuccessReponsePayloadRT
>;

export const getLogEntryCategoriesResponsePayloadRT = rt.union([
  getLogEntryCategoriesSuccessReponsePayloadRT,
  badRequestErrorRT,
  forbiddenErrorRT,
]);

export type GetLogEntryCategoriesReponsePayload = rt.TypeOf<
  typeof getLogEntryCategoriesResponsePayloadRT
>;
