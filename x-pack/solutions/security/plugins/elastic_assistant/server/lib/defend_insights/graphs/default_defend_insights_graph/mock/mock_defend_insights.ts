/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DefendInsight } from '@kbn/elastic-assistant-common';

export const mockDefendInsights: DefendInsight[] = [
  {
    group: 'Windows Defender',
    events: [
      {
        id: '123',
        endpointId: 'endpoint-1',
        value: 'some/file/path.exe',
      },
    ],
  },
  {
    group: 'AVG Antivirus',
    events: [
      {
        id: '456',
        endpointId: 'endpoint-2',
        value: 'another/file/path.exe',
      },
    ],
  },
];
