/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { logEntryRateJobTypeRT, logEntryCategoriesJobTypeRT } from '../../../../log_analysis';

export const idFormatRT = rt.union([rt.literal('legacy'), rt.literal('hashed')]);
export type IdFormat = rt.TypeOf<typeof idFormatRT>;

const jobTypeRT = rt.union([logEntryRateJobTypeRT, logEntryCategoriesJobTypeRT]);
export type JobType = rt.TypeOf<typeof jobTypeRT>;

export const idFormatByJobTypeRT = rt.record(jobTypeRT, idFormatRT);
export type IdFormatByJobType = rt.TypeOf<typeof idFormatByJobTypeRT>;

export const LOG_ANALYSIS_GET_ID_FORMATS = '/api/infra/log_analysis/id_formats';

export const getLogAnalysisIdFormatsRequestPayloadRT = rt.type({
  data: rt.type({
    logViewId: rt.string,
    spaceId: rt.string,
  }),
});

export type GetLogAnalysisIdFormatsRequestPayload = rt.TypeOf<
  typeof getLogAnalysisIdFormatsRequestPayloadRT
>;

export const getLogAnalysisIdFormatsSuccessResponsePayloadRT = rt.type({
  data: rt.record(rt.union([logEntryRateJobTypeRT, logEntryCategoriesJobTypeRT]), idFormatRT),
});

export type GetLogAnalysisIdFormatsSuccessResponsePayload = rt.TypeOf<
  typeof getLogAnalysisIdFormatsSuccessResponsePayloadRT
>;
