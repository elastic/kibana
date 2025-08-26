/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { ResponseActionStatus } from '../../../../../endpoint/service/response_actions/constants';

export const PendingActionsRequestQuerySchema = {
  query: schema.object({
    agentType: schema.maybe(schema.string()),
    endpointId: schema.maybe(schema.string()),
    page: schema.maybe(
      schema.number({
        min: 1,
        defaultValue: 1,
      })
    ),
    pageSize: schema.maybe(
      schema.number({
        min: 1,
        max: 100,
        defaultValue: 10,
      })
    ),
  }),
};

export type PendingActionsRequestQueryParams = TypeOf<
  typeof PendingActionsRequestQuerySchema.query
>;

export interface PendingActionItem {
  id: string;
  command: string;
  isCompleted: boolean;
  wasSuccessful: boolean;
  status: ResponseActionStatus;
  createdBy: string;
  '@timestamp': string;
  agents: Array<{
    agent: { id: string };
    host: { name: string };
  }>;
  comment?: string;
}

export interface PendingActionsResponse {
  data: PendingActionItem[];
  total: number;
  page: number;
  pageSize: number;
}
