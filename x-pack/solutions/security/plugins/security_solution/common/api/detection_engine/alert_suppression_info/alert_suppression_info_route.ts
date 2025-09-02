/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

/**
 * Schema for the request body of the endpoint.
 */
export type AlertSuppressionInfoRequestBody = t.TypeOf<typeof AlertSuppressionInfoRequestBody>;
export const AlertSuppressionInfoRequestBody = t.union([
  t.type({
    alert_ids: t.array(t.string),
  }),
  t.type({
    query: t.string,
  }),
]);

/**
 * Response body of the endpoint.
 */
export interface AlertSuppressionInfoResponse {
  alerts: {
    [alert_id: string]: {
      is_within_suppression_window: boolean;
    };
  }[];
}
