/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient, ScoutLogger } from '@kbn/scout-oblt';
import { measurePerformanceAsync } from '@kbn/scout-oblt';
import type {
  CreateInventoryViewAttributes,
  FindInventoryViewResponse,
  InventoryView,
  InventoryViewResponse,
  SingleInventoryView,
} from './types';

/**
 * Inventory Views API Service
 * Provides methods to interact with Kibana's Inventory Views API
 */
export interface InventoryViewApiService {
  /**
   * Retrieves all inventory views in a reduced version.
   * @returns Promise with array of reduced inventory views
   */
  findAll: () => Promise<SingleInventoryView[]>;

  /**
   * Creates a new inventory view
   * @param attributes - The inventory view attributes
   * @returns Promise with the newly created inventory view
   */
  create: (attributes: CreateInventoryViewAttributes) => Promise<InventoryView>;

  /**
   * Deletes an inventory view by ID
   * @param id - The id of the inventory view to delete
   * @returns Promise with no content
   */
  deleteOne: (id: string) => Promise<void>;
}

/**
 * Factory function to create an Inventory Views API service helper
 * @param log - Scout logger instance
 * @param kbnClient - Kibana client for making API requests
 * @returns InventoryViewApiService instance
 */
export const getInventoryViewsApiService = ({
  kbnClient,
  log,
}: {
  kbnClient: KbnClient;
  log: ScoutLogger;
}): InventoryViewApiService => {
  return {
    findAll: async () => {
      return await measurePerformanceAsync(
        log,
        'inventoryViews.findAll',
        async (): Promise<SingleInventoryView[]> => {
          const response = await kbnClient.request<FindInventoryViewResponse>({
            method: 'GET',
            path: '/api/infra/inventory_views',
            retries: 3,
          });

          return response.data.data;
        }
      );
    },
    create: async (attributes: CreateInventoryViewAttributes) => {
      return await measurePerformanceAsync(
        log,
        'inventoryViews.create',
        async (): Promise<InventoryView> => {
          const response = await kbnClient.request<InventoryViewResponse>({
            method: 'POST',
            path: '/api/infra/inventory_views',
            retries: 3,
            body: { attributes },
          });

          return response.data.data;
        }
      );
    },
    deleteOne: async (id: string): Promise<void> => {
      return await measurePerformanceAsync(
        log,
        'inventoryViews.deleteOne',
        async (): Promise<void> => {
          await kbnClient.request({
            method: 'DELETE',
            path: `/api/infra/inventory_views/${id}`,
            retries: 3,
            ignoreErrors: [404],
          });
        }
      );
    },
  };
};
