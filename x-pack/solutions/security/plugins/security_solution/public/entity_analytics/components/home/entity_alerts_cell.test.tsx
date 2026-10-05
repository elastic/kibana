/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { createReactQueryWrapper } from '../../../common/mock/create_react_query_wrapper';
import { EntityType } from '../../../../common/entity_analytics/types';
import { fetchQueryAlerts } from '../../../detections/containers/detection_engine/alerts/api';
import { EntityAlertsCell } from './entity_alerts_cell';

jest.mock('../../../detections/containers/detection_engine/alerts/api', () => ({
  fetchQueryAlerts: jest.fn(),
}));
jest.mock('../../../detections/containers/detection_engine/alerts/use_signal_index', () => ({
  useSignalIndex: () => ({ signalIndexName: '.alerts-security.alerts-default' }),
}));
jest.mock('../../../common/containers/use_global_time', () => ({
  useGlobalTime: () => ({ setQuery: jest.fn(), deleteQuery: jest.fn() }),
}));
jest.mock('../../../common/components/page/manage_query', () => ({
  useQueryInspector: jest.fn(),
}));
jest.mock('../../../common/lib/apm/use_track_http_request', () => ({
  useTrackHttpRequest: () => ({ startTracking: () => ({ endTracking: jest.fn() }) }),
}));
jest.mock('@kbn/entity-store/public', () => ({
  useEntityStoreEuidApi: () => undefined,
}));
jest.mock('@kbn/security-solution-navigation', () => ({
  ...jest.requireActual('@kbn/security-solution-navigation'),
  useNavigation: () => ({ navigateTo: jest.fn() }),
}));

const mockFetchQueryAlerts = fetchQueryAlerts as jest.Mock;

describe('EntityAlertsCell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchQueryAlerts.mockResolvedValue({
      aggregations: { alertsByStatus: { buckets: [] } },
    });
  });

  it('tags the alerts-by-status query with the entity-alerts-cell execution context', async () => {
    render(<EntityAlertsCell entityName="web-01" entityType={EntityType.host} />, {
      wrapper: createReactQueryWrapper(),
    });

    await waitFor(() => expect(mockFetchQueryAlerts).toHaveBeenCalledTimes(1));

    expect(mockFetchQueryAlerts).toHaveBeenCalledWith(
      expect.objectContaining({
        context: {
          child: {
            type: 'security_solution',
            name: 'entity_analytics:home_page',
            id: 'entity_alerts_cell',
          },
        },
      })
    );
  });
});
