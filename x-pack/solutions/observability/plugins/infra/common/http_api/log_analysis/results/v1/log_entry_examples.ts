/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { persistedLogViewReferenceRT } from '@kbn/logs-shared-plugin/common';
import { idFormatRT } from '../../id_formats/v1/id_formats';
import { logEntryExampleRT } from '../../../../log_analysis';
import {
  badRequestErrorRT,
  forbiddenErrorRT,
  timeRangeRT,
  routeTimingMetadataRT,
} from '../../../shared';

export const LOG_ANALYSIS_GET_LOG_ENTRY_RATE_EXAMPLES_PATH =
  '/api/infra/log_analysis/results/log_entry_examples';

/**
 * request
 */

export const getLogEntryExamplesRequestPayloadRT = rt.type({
  data: rt.intersection([
    rt.type({
      // the dataset to fetch the log rate examples from
      dataset: rt.string,
      // the number of examples to fetch
      exampleCount: rt.number,
      // logView
      logView: persistedLogViewReferenceRT,
      idFormat: idFormatRT,
      // the time range to fetch the log rate examples from
      timeRange: timeRangeRT,
    }),
    rt.partial({
      categoryId: rt.string,
    }),
  ]),
});

export type GetLogEntryExamplesRequestPayload = rt.TypeOf<
  typeof getLogEntryExamplesRequestPayloadRT
>;

/**
 * response
 */

export const getLogEntryExamplesSuccessResponsePayloadRT = rt.intersection([
  rt.type({
    data: rt.type({
      examples: rt.array(logEntryExampleRT),
    }),
  }),
  rt.partial({
    timing: routeTimingMetadataRT,
  }),
]);

export type GetLogEntryExamplesSuccessReponsePayload = rt.TypeOf<
  typeof getLogEntryExamplesSuccessResponsePayloadRT
>;

export const getLogEntryExamplesResponsePayloadRT = rt.union([
  getLogEntryExamplesSuccessResponsePayloadRT,
  badRequestErrorRT,
  forbiddenErrorRT,
]);

export type GetLogEntryExamplesResponsePayload = rt.TypeOf<
  typeof getLogEntryExamplesResponsePayloadRT
>;
