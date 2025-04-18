/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { EsAlertSummarySchema } from '../ai_assistant_data_clients/alert_summary/types';
import {
  PerformAlertSummaryBulkActionRequestBody,
  AlertSummaryCreateProps,
  AlertSummaryResponse,
  AlertSummaryUpdateProps,
} from '@kbn/elastic-assistant-common/impl/schemas/alert_summary/bulk_crud_alert_summary_route.gen';
export const mockEsAlertSummarySchema = {
  '@timestamp': '2019-12-13T16:40:33.400Z',
  created_at: '2019-12-13T16:40:33.400Z',
  updated_at: '2019-12-13T16:40:33.400Z',
  namespace: 'default',
  id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
  summary: 'test content',
  recommended_actions: 'do something',
  alert_id: '1234',
  replacements: [],
  created_by: 'elastic',
  updated_by: 'elastic',
  users: [
    {
      id: 'user-id-1',
      name: 'elastic',
    },
  ],
};
export const getAlertSummarySearchEsMock = () => {
  const searchResponse: estypes.SearchResponse<EsAlertSummarySchema> = {
    took: 3,
    timed_out: false,
    _shards: {
      total: 2,
      successful: 2,
      skipped: 0,
      failed: 0,
    },
    hits: {
      total: {
        value: 1,
        relation: 'eq',
      },
      max_score: 0,
      hits: [
        {
          _index: 'foo',
          _id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
          _source: mockEsAlertSummarySchema,
        },
      ],
    },
  };
  return searchResponse;
};

export const getCreateAlertSummarySchemaMock = (): AlertSummaryCreateProps => ({
  alertId: '1234',
  summary: 'test content',
  replacements: {},
});

export const getUpdateAlertSummarySchemaMock = (
  alertSummaryId = 'summary-1'
): AlertSummaryUpdateProps => ({
  summary: 'test content',
  id: alertSummaryId,
});

export const getAlertSummaryMock = (
  params?: AlertSummaryCreateProps | AlertSummaryUpdateProps
): AlertSummaryResponse => ({
  id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
  summary: 'test content',
  alertId: '1234',
  replacements: {},
  ...(params ?? {}),
  createdAt: '2019-12-13T16:40:33.400Z',
  updatedAt: '2019-12-13T16:40:33.400Z',
  namespace: 'default',
  users: [
    {
      id: 'user-id-1',
      name: 'elastic',
    },
  ],
});

export const getQueryAlertSummaryParams = (
  isUpdate?: boolean
): AlertSummaryCreateProps | AlertSummaryUpdateProps => {
  return isUpdate
    ? {
        summary: 'test 2',
        alertId: '123',
        replacements: { 'host.name': '5678' },
        id: '1',
      }
    : {
        summary: 'test 2',
        alertId: '123',
        replacements: { 'host.name': '5678' },
      };
};

export const getPerformBulkActionSchemaMock = (): PerformAlertSummaryBulkActionRequestBody => ({
  create: [getQueryAlertSummaryParams(false) as AlertSummaryCreateProps],
  delete: {
    ids: ['99403909-ca9b-49ba-9d7a-7e5320e68d05'],
  },
  update: [getQueryAlertSummaryParams(true) as AlertSummaryUpdateProps],
});
