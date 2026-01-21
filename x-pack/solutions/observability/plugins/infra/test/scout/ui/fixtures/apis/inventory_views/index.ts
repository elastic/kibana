/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient, ScoutLogger } from '@kbn/scout-oblt';
import { measurePerformanceAsync } from '@kbn/scout-oblt';
import type {
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
   * @param body - The inventory view attributes
   * @returns Promise with the newly created inventory view
   */
  create: (body: Record<string, any>) => Promise<InventoryView>;

  /**
   * Deletes an inventory view by ID
   * @param id - The id of the inventory view to delete
   * @returns Promise with no content
   */
  deleteOne: (id: string) => Promise<void>;

  /**
   * Retrieves the ID of an inventory view by its name
   * @param name Name of the inventory view to search for
   * @returns The ID of the inventory view if found, otherwise null
   */
  getViewIdByName: (name: string) => Promise<string | null>;

  /**
   * Upserts an inventory view by its name. If a view with the given name exists, it updates it; otherwise, it creates a new one.
   * @param name Name of the inventory view to upsert
   * @param body Attributes of the inventory view
   * @returns The upserted inventory view
   */
  upsertByName: (name: string, body: Record<string, any>) => Promise<InventoryView>;
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
    create: async (body: any) => {
      return await measurePerformanceAsync(
        log,
        'inventoryViews.create',
        async (): Promise<InventoryView> => {
          const response = await kbnClient.request<InventoryViewResponse>({
            method: 'POST',
            path: '/api/infra/inventory_views',
            retries: 3,
            body: { attributes: body },
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
    getViewIdByName: async (name: string): Promise<string | null> => {
      return await measurePerformanceAsync(
        log,
        'inventoryViews.getViewIdByName',
        async (): Promise<string | null> => {
          const findAllResponse = await kbnClient.request<FindInventoryViewResponse>({
            method: 'GET',
            path: '/api/infra/inventory_views',
            retries: 3,
          });
          const views = findAllResponse.data.data;

          const matchedView = views.find((view) => view.attributes.name === name);
          return matchedView ? matchedView.id : null;
        }
      );
    },
    upsertByName: async (name: string, body: Record<string, any>): Promise<InventoryView> => {
      return await measurePerformanceAsync(
        log,
        'inventoryViews.upsertByName',
        async (): Promise<InventoryView> => {
          const findAllResponse = await kbnClient.request<FindInventoryViewResponse>({
            method: 'GET',
            path: '/api/infra/inventory_views',
            retries: 3,
          });
          const views = findAllResponse.data.data;

          const matchedView = views.find((view) => view.attributes.name === name);

          if (matchedView) {
            const response = await kbnClient.request<InventoryViewResponse>({
              method: 'PUT',
              path: `/api/infra/inventory_views/${matchedView.id}`,
              retries: 3,
              body: { attributes: { name, ...body } },
            });

            return response.data.data;
          }

          const response = await kbnClient.request<InventoryViewResponse>({
            method: 'POST',
            path: '/api/infra/inventory_views',
            retries: 3,
            body: { attributes: { name, ...body } },
          });

          return response.data.data;
        }
      );
    },
  };
};
