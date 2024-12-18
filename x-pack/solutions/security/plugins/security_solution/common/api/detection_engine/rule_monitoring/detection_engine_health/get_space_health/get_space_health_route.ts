/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import type { IsoDateString } from '@kbn/securitysolution-io-ts-types';
import type {
  HealthInterval,
  HealthTimings,
  SpaceHealthParameters,
  SpaceHealthSnapshot,
} from '../model';
import { HealthIntervalParameters } from '../model';

/**
 * Schema for the request body of the endpoint.
 */
export type GetSpaceHealthRequestBody = t.TypeOf<typeof GetSpaceHealthRequestBody>;
export const GetSpaceHealthRequestBody = t.exact(
  t.partial({
    interval: HealthIntervalParameters,
    debug: t.boolean,
  })
);

/**
 * Validated and normalized request parameters of the endpoint.
 */
export interface GetSpaceHealthRequest {
  /**
   * Time period over which health stats are requested.
   */
  interval: HealthInterval;

  /**
   * If true, the endpoint will return various debug information, such as
   * aggregations sent to Elasticsearch and response received from Elasticsearch.
   */
  debug: boolean;

  /**
   * Timestamp at which the route handler started executing.
   */
  requestReceivedAt: IsoDateString;
}

/**
 * Response body of the endpoint.
 */
export interface GetSpaceHealthResponse {
  /**
   * Request processing times and durations.
   */
  timings: HealthTimings;

  /**
   * Parameters of the health stats calculation.
   */
  parameters: SpaceHealthParameters;

  /**
   * Result of the health stats calculation.
   */
  health: SpaceHealthSnapshot;
}
