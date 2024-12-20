/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const summaryResponse = {
  activeAlertCount: 3,
  recoveredAlertCount: 3,
  activeAlerts: [
    {
      key_as_string: '1689172920000',
      key: 1689172920000,
      doc_count: 3,
    },
    {
      key_as_string: '1689172980000',
      key: 1689172980000,
      doc_count: 3,
    },
  ],
  recoveredAlerts: [
    {
      key_as_string: '2023-07-12T14:42:00.000Z',
      key: 1689172920000,
      doc_count: 3,
    },
    {
      key_as_string: '2023-07-12T14:43:00.000Z',
      key: 1689172980000,
      doc_count: 3,
    },
  ],
};

export const alertsSummaryHttpResponse = {
  default: () => Promise.resolve({ ...summaryResponse }),
};

export type AlertsSummaryHttpMocks = keyof typeof alertsSummaryHttpResponse;
