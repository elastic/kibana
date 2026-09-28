/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED,
  OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_INTERVAL_HOURS,
  OBSERVABILITY_STREAMS_ENABLE_QUERY_STREAMS,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_INDEX_PATTERNS,
} from '@kbn/management-settings-ids';
import { internalKIEligibleStreamsRoutes } from './eligible_streams_route';

jest.mock('../../../utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn().mockResolvedValue(undefined),
}));

const route = internalKIEligibleStreamsRoutes['GET /internal/streams/_extraction/_eligible'];

it('classifies streams without resolving or returning a model', async () => {
  const stream = {
    name: 'logs.test',
    type: 'classic',
    description: '',
    updated_at: '2026-01-01T00:00:00.000Z',
    ingest: {
      processing: { steps: [], updated_at: '' },
      lifecycle: { inherit: {} },
      settings: {},
      failure_store: { disabled: {} },
      classic: {},
    },
  };
  const globalUiSettingsClient = {
    get: jest.fn(async (settingId: string) => {
      if (settingId === OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED) {
        return true;
      }
      if (settingId === OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_INTERVAL_HOURS) {
        return 24;
      }
    }),
  };
  const uiSettingsClient = {
    get: jest.fn(async (settingId: string) => {
      if (settingId === OBSERVABILITY_STREAMS_ENABLE_QUERY_STREAMS) {
        return false;
      }
      if (settingId === OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_INDEX_PATTERNS) {
        return 'logs-*';
      }
    }),
  };

  const result = await route.handler({
    params: {},
    request: {},
    getScopedClients: jest.fn().mockResolvedValue({
      streamsClient: { listStreams: jest.fn().mockResolvedValue([stream]) },
      globalUiSettingsClient,
      uiSettingsClient,
      licensing: {},
    }),
    server: {},
    workflowClients: {
      streamsKIsOnboardingClient: {
        getRecentExecutions: jest.fn().mockResolvedValue([]),
      },
    },
  } as never);

  expect(result).not.toHaveProperty('connectorId');
  expect(result.candidates).toEqual(expect.any(Array));
});
