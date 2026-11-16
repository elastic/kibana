/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpRequests } from '../../../common/types/applications';
import { ratio } from './aggregations';

/** The HTTP requests from the count of requests with a known outcome and of the failed ones. */
export const toHttpRequests = (count: number, failedCount: number): HttpRequests => ({
  count,
  failedCount,
  failedRatio: ratio(failedCount, count),
});
