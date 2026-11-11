/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { EsClient, KbnClient, ScoutLogger, ScoutParallelWorkerFixtures } from '@kbn/scout';
import { measurePerformanceAsync } from '@kbn/scout';
import { INTERNAL_API_HEADERS, PUBLIC_API_HEADERS } from '../../../constants/api_headers';

const EXCEPTION_LIST_URL = '/api/exception_lists';
const EXCEPTION_LIST_ITEM_URL = '/api/exception_lists/items';
const EXCEPTION_LIST_ITEM_FIND_URL = '/api/exception_lists/items/_find';
const ENDPOINT_EXCEPTIONS_PER_POLICY_OPT_IN_ROUTE =
  '/internal/api/endpoint/endpoint_exceptions_per_policy_opt_in';

export interface CreateEndpointArtifactListInput {
  listId: string;
  type: string;
  /**
   * Defaults to `listId`. Pass the product metadata (`ENDPOINT_ARTIFACT_LISTS`)
   * for a list the UI will show.
   */
  name?: string;
  description?: string;
}

export interface CreateEndpointArtifactItemInput {
  name: string;
  listId: string;
  entries: object[];
  osTypes: string[];
  policyId?: string;
}

export interface CreatedEndpointArtifactItem {
  /** Exception list item `item_id`; pass it to `deleteItem`. */
  itemId: string;
}

export interface FindEndpointArtifactItemIdsInput {
  listId: string;
  /** Exact item name. Returns only items whose `name` equals it. */
  name: string;
}

export interface EndpointArtifactsApiService {
  /** Wipes the list (see `deleteList`) and then creates it. */
  createList: (input: CreateEndpointArtifactListInput) => Promise<void>;
  /**
   * Creates the list if it does not exist and leaves its items alone.
   * `POST /api/exception_lists/items` 404s until the list exists, and only
   * opening the UI or `createList` created it before; suites that share an
   * agnostic list across spec files call this instead of `createList`.
   */
  ensureList: (input: CreateEndpointArtifactListInput) => Promise<void>;
  createItem: (input: CreateEndpointArtifactItemInput) => Promise<CreatedEndpointArtifactItem>;
  /**
   * Deletes one agnostic item by `item_id`. Unlike `deleteList`, it never
   * touches other items on the list, so suites that share an agnostic list
   * across spec files can clean up only what they created.
   */
  deleteItem: (itemId: string) => Promise<void>;
  /**
   * `item_id`s of the items on `listId` whose name equals `name`. Lets a
   * suite clean up items created through the UI, where the `item_id` is not
   * returned to the test.
   */
  findItemIds: (input: FindEndpointArtifactItemIdsInput) => Promise<string[]>;
  deleteList: (listId: string) => Promise<void>;
  deleteAll: (listIds: string[]) => Promise<void>;
  optInEndpointExceptionsPerPolicy: () => Promise<void>;
}

export const getEndpointArtifactsApiService = ({
  kbnClient,
  esClient,
  log,
  scoutSpace,
}: {
  kbnClient: KbnClient;
  esClient: EsClient;
  log: ScoutLogger;
  scoutSpace?: ScoutParallelWorkerFixtures['scoutSpace'];
}): EndpointArtifactsApiService => {
  const basePath = scoutSpace?.id ? `/s/${scoutSpace.id}` : '';

  /**
   * HTTP DELETE goes through the Saved Objects client so Kibana stops
   * serving the list (ES-only wipe leaves the SO layer stale → 409).
   * Then ES deleteByQuery + refresh removes leftover list_id copies and
   * items the API would miss. Match FTR endpoint_artifacts.deleteList.
   */
  const deleteList = async (listId: string) => {
    await kbnClient.request({
      method: 'DELETE',
      path: `${basePath}${EXCEPTION_LIST_URL}`,
      query: { list_id: listId, namespace_type: 'agnostic' },
      headers: PUBLIC_API_HEADERS,
      ignoreErrors: [404],
      retries: 0,
    });
    await esClient.deleteByQuery({
      index: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
      conflicts: 'proceed',
      refresh: true,
      ignore_unavailable: true,
      query: {
        bool: {
          filter: [{ term: { 'exception-list-agnostic.list_id': listId } }],
        },
      },
    });
  };

  // Opening an artifact tab/list page also ensure-creates the list, so the
  // POST may 409 — same as FTR ensureListExists. The list is not wiped here;
  // `global.teardown.ts` deletes every endpoint artifact list at the end of
  // the run.
  const ensureList = async ({
    listId,
    type,
    name,
    description,
  }: CreateEndpointArtifactListInput) => {
    await kbnClient.request({
      method: 'POST',
      path: `${basePath}${EXCEPTION_LIST_URL}`,
      headers: PUBLIC_API_HEADERS,
      ignoreErrors: [409],
      retries: 0,
      body: {
        name: name ?? listId,
        description: description ?? 'Scout endpoint artifact list',
        list_id: listId,
        type,
        namespace_type: 'agnostic',
      },
    });
  };

  return {
    createList: async (input) => {
      await measurePerformanceAsync(log, 'security.endpointArtifacts.createList', async () => {
        // Wipe items first.
        await deleteList(input.listId);
        await ensureList(input);
      });
    },

    ensureList: async (input) => {
      await measurePerformanceAsync(log, 'security.endpointArtifacts.ensureList', async () => {
        await ensureList(input);
      });
    },

    createItem: async ({ name, listId, entries, osTypes, policyId }) => {
      return measurePerformanceAsync(log, 'security.endpointArtifacts.createItem', async () => {
        const { data } = await kbnClient.request<{ item_id: string }>({
          method: 'POST',
          path: `${basePath}${EXCEPTION_LIST_ITEM_URL}`,
          headers: PUBLIC_API_HEADERS,
          retries: 0,
          body: {
            name,
            description: '',
            type: 'simple',
            namespace_type: 'agnostic',
            list_id: listId,
            entries,
            os_types: osTypes,
            ...(policyId ? { tags: [`policy:${policyId}`] } : {}),
          },
        });
        return { itemId: data.item_id };
      });
    },

    deleteItem: async (itemId) => {
      await measurePerformanceAsync(log, 'security.endpointArtifacts.deleteItem', async () => {
        await kbnClient.request({
          method: 'DELETE',
          path: `${basePath}${EXCEPTION_LIST_ITEM_URL}`,
          query: { item_id: itemId, namespace_type: 'agnostic' },
          headers: PUBLIC_API_HEADERS,
          ignoreErrors: [404],
          retries: 0,
        });
      });
    },

    findItemIds: async ({ listId, name }) => {
      // The route splits `filter` on commas to pair one filter per `list_id`,
      // so a comma in the name cannot be expressed in this query.
      if (name.includes(',')) {
        throw new Error(`findItemIds: item name must not contain a comma, got "${name}"`);
      }
      return measurePerformanceAsync(log, 'security.endpointArtifacts.findItemIds', async () => {
        const { data } = await kbnClient.request<{
          data: Array<{ item_id: string; name: string }>;
        }>({
          method: 'GET',
          path: `${basePath}${EXCEPTION_LIST_ITEM_FIND_URL}`,
          query: {
            list_id: listId,
            namespace_type: 'agnostic',
            // `name` is a keyword, so the quoted KQL value is an exact term.
            // The comparison below is a guard for names with quotes or spaces.
            filter: `exception-list-agnostic.attributes.name:"${name.replace(/["\\]/g, '\\$&')}"`,
            per_page: 100,
          },
          headers: PUBLIC_API_HEADERS,
          retries: 0,
        });
        return data.data.filter((item) => item.name === name).map((item) => item.item_id);
      });
    },

    deleteList,

    deleteAll: async (listIds) => {
      await measurePerformanceAsync(log, 'security.endpointArtifacts.deleteAll', async () => {
        for (const listId of listIds) {
          await deleteList(listId);
        }
      });
    },

    optInEndpointExceptionsPerPolicy: async () => {
      await measurePerformanceAsync(
        log,
        'security.endpointArtifacts.optInEndpointExceptionsPerPolicy',
        async () => {
          await kbnClient.request({
            method: 'POST',
            path: `${basePath}${ENDPOINT_EXCEPTIONS_PER_POLICY_OPT_IN_ROUTE}`,
            headers: INTERNAL_API_HEADERS,
            retries: 0,
          });
        }
      );
    },
  };
};
