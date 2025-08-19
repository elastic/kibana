/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { LinkedDashboardsClient } from './linked_dashboards_client';
import type { Logger } from '@kbn/core/server';
import type { IContentClient } from '@kbn/content-management-plugin/server/types';
import type { GetResponse } from '@kbn/content-management-plugin/server/core/crud';

describe('LinkedDashboardsClient', () => {
  let logger: jest.Mocked<Logger>;
  let dashboardClient: jest.Mocked<IContentClient<any>>;
  let client: LinkedDashboardsClient;

  beforeEach(() => {
    logger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
      trace: jest.fn(),
      log: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

    dashboardClient = {
      search: jest.fn(),
      get: jest.fn(),
    } as unknown as jest.Mocked<IContentClient<any>>;

    client = new LinkedDashboardsClient(logger, dashboardClient);

    jest.clearAllMocks();
  });

  describe('getLinkedDashboardsByIds', () => {
    it('should fetch linked dashboards by their IDs', async () => {
      // Mock dashboard client responses
      dashboardClient.get.mockImplementation((id: string) => {
        return Promise.resolve({
          contentTypeId: 'dashboard',
          result: {
            item: {
              id,
              attributes: {
                title: `Dashboard ${id}`,
                description: `Description for ${id}`,
                tags: ['tag1', 'tag2'],
              },
            },
          },
        } as unknown as GetResponse<any>);
      });

      const result = await client.getLinkedDashboardsByIds(['dashboard1', 'dashboard2']);

      expect(result).toEqual([
        {
          id: 'dashboard1',
          title: 'Dashboard dashboard1',
          description: 'Description for dashboard1',
          matchedBy: { linked: true },
          tags: ['tag1', 'tag2'],
        },
        {
          id: 'dashboard2',
          title: 'Dashboard dashboard2',
          description: 'Description for dashboard2',
          matchedBy: { linked: true },
          tags: ['tag1', 'tag2'],
        },
      ]);

      expect(dashboardClient.get).toHaveBeenCalledWith('dashboard1');
      expect(dashboardClient.get).toHaveBeenCalledWith('dashboard2');
    });

    it('should return empty array if no dashboard IDs are provided', async () => {
      const result = await client.getLinkedDashboardsByIds([]);
      expect(result).toEqual([]);
      expect(dashboardClient.get).not.toHaveBeenCalled();
    });

    it('should skip dashboards that cannot be found', async () => {
      // Mock dashboard client to resolve for dashboard1 but throw 404 for missing-dashboard
      dashboardClient.get.mockImplementation((id: string) => {
        if (id === 'dashboard1') {
          return Promise.resolve({
            contentTypeId: 'dashboard',
            result: {
              item: {
                id,
                attributes: {
                  title: `Dashboard ${id}`,
                  description: `Description for ${id}`,
                  tags: ['tag1', 'tag2'],
                },
              },
            },
          } as unknown as GetResponse<any>);
        } else {
          const error = new Error('Dashboard not found');
          (error as any).output = { statusCode: 404 };
          return Promise.reject(error);
        }
      });

      const result = await client.getLinkedDashboardsByIds(['dashboard1', 'missing-dashboard']);

      expect(result).toEqual([
        {
          id: 'dashboard1',
          title: 'Dashboard dashboard1',
          description: 'Description for dashboard1',
          matchedBy: { linked: true },
          tags: ['tag1', 'tag2'],
        },
      ]);

      expect(dashboardClient.get).toHaveBeenCalledWith('dashboard1');
      expect(dashboardClient.get).toHaveBeenCalledWith('missing-dashboard');
      expect(logger.warn).toHaveBeenCalledWith(
        'Linked dashboard with id missing-dashboard not found. Skipping.'
      );
    });

    it('should propagate other errors', async () => {
      // Mock dashboard client to throw a non-404 error
      const error = new Error('Unexpected error');
      dashboardClient.get.mockRejectedValue(error);

      await expect(client.getLinkedDashboardsByIds(['dashboard1'])).rejects.toThrow(
        'Error fetching dashboard with id dashboard1: Unexpected error'
      );

      expect(dashboardClient.get).toHaveBeenCalledWith('dashboard1');
    });

    it('should handle null attributes in dashboard response', async () => {
      // Mock dashboard client to return a response with missing attributes
      dashboardClient.get.mockImplementation((id: string) => {
        return Promise.resolve({
          contentTypeId: 'dashboard',
          result: {
            item: {
              id,
              attributes: {
                title: `Dashboard ${id}`,
                // Missing description
                description: undefined,
                // Missing tags
                tags: undefined,
              },
            },
          },
        } as unknown as GetResponse<any>);
      });

      const result = await client.getLinkedDashboardsByIds(['dashboard1']);

      expect(result).toEqual([
        {
          id: 'dashboard1',
          title: 'Dashboard dashboard1',
          description: undefined,
          matchedBy: { linked: true },
          tags: undefined,
        },
      ]);
    });
  });
});
