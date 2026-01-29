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
   * @param id - The id of the inventory view(s) to delete
   * @returns Promise with no content
   */
  deleteById: (id: string | string[]) => Promise<void>;

  /**
   * Deletes an inventory view by name
   * @param name - The name of the inventory view(s) to delete
   * @returns Promise with no content
   */
  deleteByName: (name: string | string[]) => Promise<void>;

  /**
   * Gets a full inventory view by ID
   * @param id Id of the inventory view to retrieve
   * @returns InventoryView object
   */
  getById: (id: string) => Promise<InventoryView>;

  /**
   * Makes an inventory view the default view
   * @param id Id of the inventory view to set as default
   * @returns Promise with no content
   */
  makeDefault: (id: string) => Promise<void>;
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
    deleteById: async (id: string | string[]): Promise<void> => {
      return await measurePerformanceAsync(
        log,
        'inventoryViews.deleteById',
        async (): Promise<void> => {
          const ids = Array.isArray(id) ? id : [id];

          for (const viewId of ids) {
            await kbnClient.request({
              method: 'DELETE',
              path: `/api/infra/inventory_views/${viewId}`,
              retries: 3,
              ignoreErrors: [404],
            });
          }
        }
      );
    },
    deleteByName: async (name: string | string[]): Promise<void> => {
      return await measurePerformanceAsync(
        log,
        'inventoryViews.deleteByName',
        async (): Promise<void> => {
          const names = Array.isArray(name) ? name : [name];
          const nameSet = new Set(names);

          const findAllResponse = await kbnClient.request<FindInventoryViewResponse>({
            method: 'GET',
            path: '/api/infra/inventory_views',
            retries: 3,
          });
          const existingViews = findAllResponse.data.data;

          const ids = existingViews
            .filter((view) => nameSet.has(view.attributes.name))
            .map((view) => view.id);

          if (ids.length === 0) {
            return;
          }

          for (const viewId of ids) {
            await kbnClient.request({
              method: 'DELETE',
              path: `/api/infra/inventory_views/${viewId}`,
              retries: 3,
              ignoreErrors: [404],
            });
          }
        }
      );
    },
    getById: async (id: string): Promise<InventoryView> => {
      return await measurePerformanceAsync(
        log,
        'inventoryViews.getById',
        async (): Promise<InventoryView> => {
          const response = await kbnClient.request<InventoryViewResponse>({
            method: 'GET',
            path: `/api/infra/inventory_views/${id}`,
            retries: 3,
          });

          return response.data.data;
        }
      );
    },
    makeDefault: async (id: string): Promise<void> => {
      return await measurePerformanceAsync(
        log,
        'inventoryViews.makeDefault',
        async (): Promise<void> => {
          await kbnClient.request({
            method: 'PATCH',
            path: `/api/metrics/source/default`,
            body: { inventoryDefaultView: id },
            retries: 3,
          });
        }
      );
    },
  };
};
