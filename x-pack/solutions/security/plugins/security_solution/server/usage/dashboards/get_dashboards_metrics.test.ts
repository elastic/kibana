/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';

import { getDashboardMetrics, initialDashboardMetrics } from './get_dashboards_metrics';
import {
  getEmptyTagResponse,
  getMockDashboardSearchResponse,
  getMockTagSearchResponse,
} from './mocks';
import { SECURITY_TAG_NAME } from '../../../common/constants';

describe('Dashboards Metrics', () => {
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;

  describe('getDashboardMetrics()', () => {
    beforeEach(() => {
      savedObjectsClient = savedObjectsClientMock.create();
    });

    it('returns empty object if no tags found', async () => {
      const logger = loggingSystemMock.createLogger();
      savedObjectsClient.find.mockResolvedValueOnce(getEmptyTagResponse());
      savedObjectsClient.find.mockResolvedValueOnce(getMockDashboardSearchResponse());

      const result = await getDashboardMetrics({
        savedObjectsClient,
        logger,
      });
      expect(logger.debug).toHaveBeenCalledWith(
        `No ${SECURITY_TAG_NAME} tag found, therefore not collecting telemetry from it`
      );
      expect(result).toEqual(initialDashboardMetrics);
    });

    it('returns information with tags and dashboards', async () => {
      savedObjectsClient.find.mockResolvedValueOnce(getMockTagSearchResponse());
      savedObjectsClient.find.mockResolvedValueOnce(getMockDashboardSearchResponse());

      const logger = loggingSystemMock.createLogger();
      const result = await getDashboardMetrics({
        savedObjectsClient,
        logger,
      });

      expect(result).toEqual({
        dashboard_tag: {
          created_at: '2023-02-14T09:32:17.734Z',
          linked_dashboards_count: 1,
        },
        dashboards: [
          {
            created_at: '2023-02-14T09:32:37.515Z',
            dashboard_id: '84df7db0-ac4a-11ed-ae40-ff411efc2344',
          },
        ],
      });
    });
  });
});
