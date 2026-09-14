/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import {
  createBootstrapIndex,
  createDataStream,
  deleteAllIndex,
  deleteDataStream,
  deleteIndexTemplate,
  deletePolicy,
  deleteTemplate,
  getBootstrapIndexExists,
  getDataStreamExists,
  getIndexTemplateExists,
  getPolicyExists,
  getTemplateExists,
  migrateToDataStream,
  putMappings,
  removeAliases,
  removePolicyFromIndex,
  setIndexTemplate,
  setPolicy,
} from '@kbn/securitysolution-es-utils';
import type {
  FoundAllListItemsSchema,
  FoundListItemSchema,
  FoundListSchema,
  ListItemArraySchema,
  ListItemSchema,
  ListSchema,
  SearchListItemArraySchema,
} from '@kbn/securitysolution-io-ts-list-types';
import {
  MAXIMUM_SMALL_IP_RANGE_VALUE_LIST_DASH_SIZE,
  MAXIMUM_SMALL_VALUE_LIST_SIZE,
} from '@kbn/securitysolution-list-constants';

import type { ConfigType } from '../../config';
import type { ScheduleCoalesceRebuild } from '../../types';
import {
  BufferLines,
  createListItem,
  deleteListItem,
  deleteListItemByValue,
  exportListItemsToStream,
  findAllListItems,
  findListItem,
  getListItem,
  getListItemByValue,
  getListItemByValues,
  getListItemIndex,
  getListItemTemplate,
  importListItemsToStream,
  searchListItemByValues,
  streamSharedItemValues,
  updateListItem,
} from '../items';
import listsItemsPolicy from '../items/list_item_policy.json';
import listItemMappings from '../items/list_item_mappings.json';
import {
  countLookupItems,
  createLookupIndex,
  deleteLookupIndex,
  deleteLookupItemByValue,
  findAllLookupItems,
  getLookupIndexName,
  importLookupItemsToStream,
  isRangeType,
  readStorageDescriptor,
  searchLookupItemsByValues,
  streamLookupItemValues,
  withStorageDescriptor,
  writeLookupItems,
  writeValuesToStream,
} from '../lookup';

import listPolicy from './list_policy.json';
import listMappings from './list_mappings.json';
// POC: value lists in per-list lookup-mode indices
import type {
  ConstructorOptions,
  CreateListIfItDoesNotExistOptions,
  CreateListItemOptions,
  CreateListOptions,
  DeleteListItemByValueOptions,
  DeleteListItemOptions,
  DeleteListOptions,
  ExportListItemsToStreamOptions,
  FindAllListItemsOptions,
  FindListItemOptions,
  FindListOptions,
  GetImportFilename,
  GetListItemByValueOptions,
  GetListItemOptions,
  GetListItemsByValueOptions,
  GetListOptions,
  ImportListItemsToStreamOptions,
  SearchListItemByValuesOptions,
  UpdateListItemOptions,
  UpdateListOptions,
} from './list_client_types';
import { createListIfItDoesNotExist } from './create_list_if_it_does_not_exist';

import {
  createList,
  deleteList,
  findList,
  getList,
  getListIndex,
  getListTemplate,
  updateList,
} from '.';

/**
 * Class for use for value lists are are associated with exception lists.
 * See {@link https://www.elastic.co/guide/en/security/current/lists-api-create-container.html}
 */
export class ListClient {
  /** Kibana space id the value lists are part of */
  private readonly spaceId: string;

  /** User creating, modifying, deleting, or updating a value list */
  private readonly user: string;

  /** Configuration for determining things such as maximum sizes  */
  private readonly config: ConfigType;

  /** The elastic search client to do the queries with */
  private readonly esClient: ElasticsearchClient;

  /** Enqueue the background coalesced-range rebuild after a range source mutation */
  private readonly scheduleCoalesceRebuild: ScheduleCoalesceRebuild;

  /**
   * Constructs the value list
   * @param options
   * @param options.spaceId Kibana space id the value lists are part of
   * @param options.user The user associated with the value list
   * @param options.config Configuration for determining things such as maximum sizes
   * @param options.esClient The elastic search client to do the queries with
   * @param options.scheduleCoalesceRebuild Enqueue the background coalesced-range rebuild
   */
  constructor({ spaceId, user, config, esClient, scheduleCoalesceRebuild }: ConstructorOptions) {
    this.spaceId = spaceId;
    this.user = user;
    this.config = config;
    this.esClient = esClient;
    this.scheduleCoalesceRebuild = scheduleCoalesceRebuild;
  }

  /**
   * Returns the list data stream or index name
   * @returns The list data stream/index name
   */
  public getListName = (): string => {
    const {
      spaceId,
      config: { listIndex: listsIndexName },
    } = this;
    return getListIndex({ listsIndexName, spaceId });
  };

  /**
   * Returns the list item data stream or index name
   * @returns The list item data stream/index name
   */
  public getListItemName = (): string => {
    const {
      spaceId,
      config: { listItemIndex: listsItemsIndexName },
    } = this;
    return getListItemIndex({ listsItemsIndexName, spaceId });
  };

  /**
   * Given a list id, this will return the list container
   * @param options
   * @param options.id The id of the list
   * @returns The List container if found, otherwise null
   */
  public getList = async ({ id }: GetListOptions): Promise<ListSchema | null> => {
    const { esClient } = this;
    const listName = this.getListName();
    return getList({ esClient, id, listIndex: listName });
  };

  /**
   * Creates a list, if given at least the "name", "description", "type", and "version"
   * See {@link https://www.elastic.co/guide/en/security/current/lists-api-create-container.html}
   * @param options
   * @param options.id The id of the list to create or "undefined" if you want an "id" to be auto-created for you
   * @param options.immutable Set this to true if this is a list that is "immutable"/"pre-packaged".
   * @param options.name The name of the list
   * @param options.description The description of the list
   * @param options.type The type of list such as "boolean", "double", "text", "keyword", etc...
   * @param options.meta Additional meta data to associate with the list as an object of "key/value" pairs
   * @param options.version Version number of the list, typically this should be 1 unless you are re-creating a list you deleted or something unusual.
   * @returns The list created
   */
  public createList = async ({
    id,
    immutable,
    name,
    description,
    type,
    meta,
    version,
  }: CreateListOptions): Promise<ListSchema> => {
    const { esClient, user, config, spaceId } = this;
    const listName = this.getListName();

    // POC: with the flag on, every new list gets its own lookup-mode index and
    // records the storage descriptor in its container meta. The `__forceLegacy`
    // meta flag is a POC test affordance to create a legacy (data-stream) list even
    // with the flag on, so coexistence can be exercised without a config toggle.
    const forceLegacy = (meta as Record<string, unknown> | undefined)?.__forceLegacy === true;
    if (config.enableLookupIndices && !forceLegacy) {
      const listId = id ?? uuidv4();
      const index = getLookupIndexName(spaceId, listId);
      await createLookupIndex({ esClient, index, type });
      return createList({
        description,
        esClient,
        id: listId,
        immutable,
        listIndex: listName,
        meta: withStorageDescriptor(meta, { index, type: 'lookup' }),
        name,
        type,
        user,
        version,
      });
    }

    return createList({
      description,
      esClient,
      id,
      immutable,
      listIndex: listName,
      meta,
      name,
      type,
      user,
      version,
    });
  };

  /**
   * POC: migrate a legacy (shared `.items`) value list into its own lookup index.
   * Non-destructive: the `.items` rows are intentionally kept, so an existing rule
   * that points its threat index at `.items` keeps running (against a now-frozen
   * copy) until it is repointed. This only copies the items and flips the storage
   * descriptor; it does not touch any rules.
   * @param options.id The id of the list to migrate
   * @returns Whether the list was already a lookup list, the target index, and how many items were copied
   */
  public migrateListToLookup = async ({
    id,
  }: {
    id: string;
  }): Promise<{ alreadyLookup: boolean; index: string; itemsCopied: number }> => {
    const { esClient, spaceId, config } = this;
    if (!config.enableLookupIndices) {
      throw new Error('Lookup indices are not enabled (xpack.lists.enableLookupIndices)');
    }
    const list = await this.getList({ id });
    if (list == null) {
      throw new Error(`list "${id}" not found`);
    }
    const existing = readStorageDescriptor(list.meta);
    if (existing.type === 'lookup') {
      return { alreadyLookup: true, index: existing.index ?? '', itemsCopied: 0 };
    }

    const index = getLookupIndexName(spaceId, id);
    await createLookupIndex({ esClient, index, type: list.type });

    const listItemIndex = this.getListItemName();
    let itemsCopied = 0;
    for await (const batch of streamSharedItemValues({ esClient, listId: id, listItemIndex })) {
      if (batch.length > 0) {
        await writeLookupItems({ esClient, index, type: list.type, values: batch });
        itemsCopied += batch.length;
      }
    }
    if (isRangeType(list.type)) {
      this.scheduleCoalesceRebuild({ index, type: list.type });
    }

    // flip the storage descriptor; the `.items` rows are left in place on purpose
    await this.updateList({
      _version: list._version,
      description: list.description,
      id,
      meta: withStorageDescriptor(list.meta, { index, type: 'lookup' }),
      name: list.name,
      version: list.version,
    });

    return { alreadyLookup: false, index, itemsCopied };
  };

  /**
   * Creates a list, if given at least the "name", "description", "type", and "version"
   * See {@link https://www.elastic.co/guide/en/security/current/lists-api-create-container.html}
   * This will create the list if it does not exist. If the list exists, this will ignore creating
   * anything and just return the existing list.
   * @param options
   * @param options.id The id of the list to create or "undefined" if you want an "id" to be auto-created for you
   * @param options.immutable Set this to true if this is a list that is "immutable"/"pre-packaged".
   * @param options.name The name of the list
   * @param options.description The description of the list
   * @param options.type The type of list such as "boolean", "double", "text", "keyword", etc...
   * @param options.meta Additional meta data to associate with the list as an object of "key/value" pairs
   * @param options.version Version number of the list, typically this should be 1 unless you are re-creating a list you deleted or something unusual.
   * @returns The list created
   */
  public createListIfItDoesNotExist = async ({
    id,
    name,
    description,
    immutable,
    type,
    meta,
    version,
  }: CreateListIfItDoesNotExistOptions): Promise<ListSchema> => {
    const { esClient, user } = this;
    const listName = this.getListName();
    return createListIfItDoesNotExist({
      description,
      esClient,
      id,
      immutable,
      listIndex: listName,
      meta,
      name,
      type,
      user,
      version,
    });
  };

  /**
   * True if the list index exists, otherwise false
   * @returns True if the list index exists, otherwise false
   */
  public getListIndexExists = async (): Promise<boolean> => {
    const { esClient } = this;
    const listName = this.getListName();
    return getBootstrapIndexExists(esClient, listName);
  };

  /**
   * True if the list data stream exists, otherwise false
   * @returns True if the list data stream exists, otherwise false
   */
  public getListDataStreamExists = async (): Promise<boolean> => {
    const { esClient } = this;
    const listName = this.getListName();
    return getDataStreamExists(esClient, listName);
  };

  /**
   * True if the list index item exists, otherwise false
   * @returns True if the list item index exists, otherwise false
   */
  public getListItemIndexExists = async (): Promise<boolean> => {
    const { esClient } = this;
    const listItemName = this.getListItemName();
    return getBootstrapIndexExists(esClient, listItemName);
  };

  /**
   * True if the list item data stream exists, otherwise false
   * @returns True if the list item data stream exists, otherwise false
   */
  public getListItemDataStreamExists = async (): Promise<boolean> => {
    const { esClient } = this;
    const listItemName = this.getListItemName();
    return getDataStreamExists(esClient, listItemName);
  };

  /**
   * Creates the list boot strap index for ILM policies.
   * @returns The contents of the bootstrap response from Elasticsearch
   * @deprecated after moving to data streams there should not be need to use it
   */
  public createListBootStrapIndex = async (): Promise<unknown> => {
    const { esClient } = this;
    const listName = this.getListName();
    return createBootstrapIndex(esClient, listName);
  };

  /**
   * Creates list data stream
   * @returns The contents of the create data stream from Elasticsearch
   */
  public createListDataStream = async (): Promise<unknown> => {
    const { esClient } = this;
    const listName = this.getListName();
    return createDataStream(esClient, listName);
  };

  /**
   * update list index mappings with @timestamp and migrates it to data stream
   * @returns
   */
  public migrateListIndexToDataStream = async (): Promise<void> => {
    const { esClient } = this;
    const listName = this.getListName();
    // update list index template
    await this.setListTemplate();
    // first need to update mapping of existing index to add @timestamp
    await putMappings(
      esClient,
      listName,
      listMappings.properties as Record<string, MappingProperty>
    );
    await removeAliases(esClient, listName);
    await migrateToDataStream(esClient, listName);
    await removePolicyFromIndex(esClient, listName);
    if (await this.getListPolicyExists()) {
      await this.deleteListPolicy();
    }

    // as migration will be called eventually for every instance of Kibana, it's more efficient to delete
    // legacy index template if it exists during migration
    await this.deleteLegacyListTemplateIfExists();
  };

  /**
   * update list items index mappings with @timestamp and migrates it to data stream
   * @returns
   */
  public migrateListItemIndexToDataStream = async (): Promise<void> => {
    const { esClient } = this;
    const listItemName = this.getListItemName();
    // update list items index template
    await this.setListItemTemplate();
    // first need to update mapping of existing index to add @timestamp
    await putMappings(
      esClient,
      listItemName,
      listItemMappings.properties as Record<string, MappingProperty>
    );
    await removeAliases(esClient, listItemName);
    await migrateToDataStream(esClient, listItemName);
    await removePolicyFromIndex(esClient, listItemName);
    if (await this.getListItemPolicyExists()) {
      await this.deleteListItemPolicy();
    }

    // as migration will be called eventually for every instance of Kibana, it's more efficient to delete
    // legacy index template if it exists during migration
    await this.deleteLegacyListItemTemplateIfExists();
  };

  /**
   * Creates the list item boot strap index for ILM policies.
   * @returns The contents of the bootstrap response from Elasticsearch
   * @deprecated after moving to data streams there should not be need to use it
   */
  public createListItemBootStrapIndex = async (): Promise<unknown> => {
    const { esClient } = this;
    const listItemName = this.getListItemName();
    return createBootstrapIndex(esClient, listItemName);
  };

  /**
   * Creates list item data stream
   * @returns The contents of the create data stream from Elasticsearch
   */
  public createListItemDataStream = async (): Promise<unknown> => {
    const { esClient } = this;
    const listItemName = this.getListItemName();
    return createDataStream(esClient, listItemName);
  };

  /**
   * Returns true if the list policy for ILM exists, otherwise false
   * @returns True if the list policy for ILM exists, otherwise false.
   */
  public getListPolicyExists = async (): Promise<boolean> => {
    const { esClient } = this;
    const listName = this.getListName();
    return getPolicyExists(esClient, listName);
  };

  /**
   * Returns true if the list item policy for ILM exists, otherwise false
   * @returns True if the list item policy for ILM exists, otherwise false.
   */
  public getListItemPolicyExists = async (): Promise<boolean> => {
    const { esClient } = this;
    const listsItemIndex = this.getListItemName();
    return getPolicyExists(esClient, listsItemIndex);
  };

  /**
   * Returns true if the list template for ILM exists, otherwise false
   * @returns True if the list template for ILM exists, otherwise false.
   */
  public getListTemplateExists = async (): Promise<boolean> => {
    const { esClient } = this;
    const listName = this.getListName();
    return getIndexTemplateExists(esClient, listName);
  };

  /**
   * Returns true if the list item template for ILM exists, otherwise false
   * @returns True if the list item template for ILM exists, otherwise false.
   */
  public getListItemTemplateExists = async (): Promise<boolean> => {
    const { esClient } = this;
    const listItemName = this.getListItemName();
    return getIndexTemplateExists(esClient, listItemName);
  };

  /**
   * Returns true if the list template for ILM exists, otherwise false
   * @returns True if the list template for ILM exists, otherwise false.
   */
  public getLegacyListTemplateExists = async (): Promise<boolean> => {
    const { esClient } = this;
    const listName = this.getListName();
    return getTemplateExists(esClient, listName);
  };

  /**
   * Returns true if the list item template for ILM exists, otherwise false
   * @returns True if the list item template for ILM exists, otherwise false.
   */
  public getLegacyListItemTemplateExists = async (): Promise<boolean> => {
    const { esClient } = this;
    const listItemName = this.getListItemName();
    return getTemplateExists(esClient, listItemName);
  };

  /**
   * Returns the list template for ILM.
   * @returns The contents of the list template for ILM.
   */
  public getListTemplate = (): Record<string, unknown> => {
    const listName = this.getListName();
    return getListTemplate(listName);
  };

  /**
   * Returns the list item template for ILM.
   * @returns The contents of the list item template for ILM.
   */
  public getListItemTemplate = (): Record<string, unknown> => {
    const listItemName = this.getListItemName();
    return getListItemTemplate(listItemName);
  };

  /**
   * Sets the list template for ILM.
   * @returns The contents of the list template for ILM.
   */
  public setListTemplate = async (): Promise<unknown> => {
    const { esClient } = this;
    const template = this.getListTemplate();
    const listName = this.getListName();
    return setIndexTemplate(esClient, listName, template);
  };

  /**
   * Sets the list item template for ILM.
   * @returns The contents of the list item template for ILM.
   */
  public setListItemTemplate = async (): Promise<unknown> => {
    const { esClient } = this;
    const template = this.getListItemTemplate();
    const listItemName = this.getListItemName();
    return setIndexTemplate(esClient, listItemName, template);
  };

  /**
   * Sets the list policy
   * @returns The contents of the list policy set
   * @deprecated after moving to data streams there should not be need to use it
   */
  public setListPolicy = async (): Promise<unknown> => {
    const { esClient } = this;
    const listName = this.getListName();
    return setPolicy(esClient, listName, listPolicy);
  };

  /**
   * Sets the list item policy
   * @returns The contents of the list policy set
   * @deprecated after moving to data streams there should not be need to use it
   */
  public setListItemPolicy = async (): Promise<unknown> => {
    const { esClient } = this;
    const listItemName = this.getListItemName();
    return setPolicy(esClient, listItemName, listsItemsPolicy);
  };

  /**
   * Deletes the list index
   * @returns True if the list index was deleted, otherwise false
   */
  public deleteListIndex = async (): Promise<boolean> => {
    const { esClient } = this;
    const listName = this.getListName();
    return deleteAllIndex(esClient, `${listName}-*`);
  };

  /**
   * Deletes the list item index
   * @returns True if the list item index was deleted, otherwise false
   */
  public deleteListItemIndex = async (): Promise<boolean> => {
    const { esClient } = this;
    const listItemName = this.getListItemName();
    return deleteAllIndex(esClient, `${listItemName}-*`);
  };

  /**
   * Deletes the list data stream
   * @returns True if the list index was deleted, otherwise false
   */
  public deleteListDataStream = async (): Promise<boolean> => {
    const { esClient } = this;
    const listName = this.getListName();
    return deleteDataStream(esClient, listName);
  };

  /**
   * Deletes the list item data stream
   * @returns True if the list index was deleted, otherwise false
   */
  public deleteListItemDataStream = async (): Promise<boolean> => {
    const { esClient } = this;
    const listItemName = this.getListItemName();
    return deleteDataStream(esClient, listItemName);
  };

  /**
   * Deletes the list policy
   * @returns The contents of the list policy
   */
  public deleteListPolicy = async (): Promise<unknown> => {
    const { esClient } = this;
    const listName = this.getListName();
    return deletePolicy(esClient, listName);
  };

  /**
   * Deletes the list item policy
   * @returns The contents of the list item policy
   */
  public deleteListItemPolicy = async (): Promise<unknown> => {
    const { esClient } = this;
    const listItemName = this.getListItemName();
    return deletePolicy(esClient, listItemName);
  };

  /**
   * Deletes the list template
   * @returns The contents of the list template
   */
  public deleteListTemplate = async (): Promise<unknown> => {
    const { esClient } = this;
    const listName = this.getListName();
    return deleteIndexTemplate(esClient, listName);
  };

  /**
   * Deletes the list item template
   * @returns The contents of the list item template
   */
  public deleteListItemTemplate = async (): Promise<unknown> => {
    const { esClient } = this;
    const listItemName = this.getListItemName();
    return deleteIndexTemplate(esClient, listItemName);
  };

  /**
   * Deletes the list boot strap index for ILM policies.
   * @returns The contents of the bootstrap response from Elasticsearch
   */
  public deleteLegacyListTemplate = async (): Promise<unknown> => {
    const { esClient } = this;
    const listName = this.getListName();
    return deleteTemplate(esClient, listName);
  };

  /**
   * Checks if legacy lists template exists and delete it
   */
  public deleteLegacyListTemplateIfExists = async (): Promise<void> => {
    try {
      const legacyTemplateExists = await this.getLegacyListTemplateExists();

      if (legacyTemplateExists) {
        await this.deleteLegacyListTemplate();
      }
    } catch (err) {
      if (err.statusCode !== 404) {
        throw err;
      }
    }
  };

  /**
   * Delete the list item boot strap index for ILM policies.
   * @returns The contents of the bootstrap response from Elasticsearch
   */
  public deleteLegacyListItemTemplate = async (): Promise<unknown> => {
    const { esClient } = this;
    const listItemName = this.getListItemName();
    return deleteTemplate(esClient, listItemName);
  };

  /**
   * Checks if legacy list item template exists and delete it
   */
  public deleteLegacyListItemTemplateIfExists = async (): Promise<void> => {
    try {
      const legacyTemplateListItemsExists = await this.getLegacyListItemTemplateExists();

      if (legacyTemplateListItemsExists) {
        await this.deleteLegacyListItemTemplate();
      }
    } catch (err) {
      if (err.statusCode !== 404) {
        throw err;
      }
    }
  };

  /**
   * Given a list item id, this will delete the single list item
   * @returns The list item if found, otherwise null
   */
  public deleteListItem = async ({
    id,
    refresh,
  }: DeleteListItemOptions): Promise<ListItemSchema | null> => {
    const { esClient } = this;
    const listItemName = this.getListItemName();
    return deleteListItem({ esClient, id, listItemIndex: listItemName, refresh });
  };

  /**
   * Given a list value, this will delete all list items that have that value
   * @param options
   * @param options.listId The "list_id"/list container to delete from
   * @param options.value The value to delete the list items by
   * @param options.type The type of list such as "boolean", "double", "text", "keyword", etc...
   * @returns The list items deleted.
   */
  public deleteListItemByValue = async ({
    listId,
    value,
    type,
    refresh,
  }: DeleteListItemByValueOptions): Promise<ListItemArraySchema> => {
    const { esClient, config } = this;
    const listItemName = this.getListItemName();

    // POC: delete an authored value from the per-list lookup index (rebuilds
    // coalesced docs for range lists).
    if (config.enableLookupIndices) {
      const list = await this.getList({ id: listId });
      const descriptor = list != null ? readStorageDescriptor(list.meta) : undefined;
      if (list != null && descriptor?.type === 'lookup' && descriptor.index != null) {
        await deleteLookupItemByValue({
          esClient,
          index: descriptor.index,
          refresh,
          type: list.type,
          value,
        });
        if (isRangeType(list.type)) {
          this.scheduleCoalesceRebuild({ index: descriptor.index, type: list.type });
        }
        return [];
      }
    }

    return deleteListItemByValue({
      esClient,
      listId,
      listItemIndex: listItemName,
      refresh,
      type,
      value,
    });
  };

  /**
   * Given a list id, this will delete the list from the id
   * @param options
   * @param options.id The id of the list to delete
   * @returns The list deleted if found, otherwise null
   */
  public deleteList = async ({ id }: DeleteListOptions): Promise<ListSchema | null> => {
    const { esClient, config } = this;
    const listName = this.getListName();
    const listItemName = this.getListItemName();

    // POC: deleting a lookup list drops its index.
    if (config.enableLookupIndices) {
      const list = await this.getList({ id });
      const descriptor = list != null ? readStorageDescriptor(list.meta) : undefined;
      if (descriptor?.type === 'lookup' && descriptor.index != null) {
        await deleteLookupIndex({ esClient, index: descriptor.index });
      }
    }

    return deleteList({
      esClient,
      id,
      listIndex: listName,
      listItemIndex: listItemName,
    });
  };

  /**
   * Exports list items to a stream
   * @param options
   * @param options.stringToAppend Optional string to append at the end of each item such as a newline "\n". If undefined is passed, no string is appended.
   * @param options.listId The list id to export all the item from
   * @param options.stream The stream to push the export into
   */
  public exportListItemsToStream = ({
    stringToAppend,
    listId,
    stream,
  }: ExportListItemsToStreamOptions): void => {
    const { esClient, config } = this;
    const listItemName = this.getListItemName();

    // POC: export by draining one storage neutral value generator to the stream.
    // A lookup list streams from its per-list index (source docs for ranges); a
    // legacy list streams from the shared `.items` data stream. Both page the same
    // way and never fully buffer the list. Mirrors the service's own setTimeout
    // pattern so the async work does not bubble up to the caller.
    if (config.enableLookupIndices) {
      // The work runs detached in a timer, so an unhandled rejection here would be an
      // uncaught exception that crashes the process. Contain it: end the stream with
      // the error instead, which surfaces as a failed export rather than a crash.
      setTimeout(async (): Promise<void> => {
        try {
          const list = await this.getList({ id: listId });
          const descriptor = list != null ? readStorageDescriptor(list.meta) : undefined;
          const values =
            list != null && descriptor?.type === 'lookup' && descriptor.index != null
              ? streamLookupItemValues({ esClient, index: descriptor.index, type: list.type })
              : streamSharedItemValues({ esClient, listId, listItemIndex: listItemName });
          await writeValuesToStream({ stream, stringToAppend, values });
        } catch (error) {
          stream.destroy(error instanceof Error ? error : new Error(String(error)));
        }
      });
      return;
    }

    exportListItemsToStream({
      esClient,
      listId,
      listItemIndex: listItemName,
      stream,
      stringToAppend,
    });
  };

  /**
   * Gets the filename of the imported file
   * @param options
   * @param options.stream The stream to pull the import from
   * @returns
   */
  public getImportFilename = ({ stream }: GetImportFilename): Promise<string | undefined> => {
    return new Promise<string | undefined>((resolve, reject) => {
      const { config } = this;
      const readBuffer = new BufferLines({ bufferSize: config.importBufferSize, input: stream });
      let fileName: string | undefined;
      readBuffer.on('fileName', async (fileNameEmitted: string) => {
        try {
          readBuffer.pause();
          fileName = decodeURIComponent(fileNameEmitted);
          readBuffer.resume();
        } catch (err) {
          reject(err);
        }
      });

      readBuffer.on('close', () => {
        resolve(fileName);
      });
    });
  };

  /**
   * Imports list items to a stream. If the list already exists, this will append the list items to the existing list.
   * If the list does not exist, this will auto-create the list and then add the items to that list.
   * See {@link https://www.elastic.co/guide/en/security/current/lists-api-create-container.html}
   * @param options
   * @param options.type The type of list such as "boolean", "double", "text", "keyword", etc...
   * @param options.stream The stream to pull the import from
   * @param options.meta Additional meta data to associate with the list items as an object of "key/value" pairs. You can set this to "undefined" for no meta values.
   * @param options.version Version number of the list, typically this should be 1 unless you are re-creating a list you deleted or something unusual.
   * @param options.refresh If true, then refresh the index after importing the list items.
   */
  public importListItemsToStream = async ({
    type,
    listId,
    stream,
    meta,
    version,
    refresh,
  }: ImportListItemsToStreamOptions): Promise<ListSchema | null> => {
    const { esClient, user, config } = this;
    const listItemName = this.getListItemName();
    const listName = this.getListName();

    // POC: import into a per-list lookup index (dedup for equality, source +
    // coalesced for ranges).
    if (config.enableLookupIndices && listId != null) {
      const list = await this.getList({ id: listId });
      const descriptor = list != null ? readStorageDescriptor(list.meta) : undefined;
      if (list != null && descriptor?.type === 'lookup' && descriptor.index != null) {
        await importLookupItemsToStream({
          config,
          esClient,
          index: descriptor.index,
          stream,
          type: list.type,
        });
        if (isRangeType(list.type)) {
          this.scheduleCoalesceRebuild({ index: descriptor.index, type: list.type });
        }
        return list;
      }
    }

    return importListItemsToStream({
      config,
      esClient,
      listId,
      listIndex: listName,
      listItemIndex: listItemName,
      meta,
      refresh,
      stream,
      type,
      user,
      version,
    });
  };

  /**
   * Returns all list items found by value.
   * @param options
   * @param options.listId The list id to search for the list item by value.
   * @param options.value The list value to find the list item by.
   * @param options.type The type of list such as "boolean", "double", "text", "keyword", etc...
   * @returns The list items by value found.
   */
  public getListItemByValue = async ({
    listId,
    value,
    type,
  }: GetListItemByValueOptions): Promise<ListItemArraySchema> => {
    const { esClient } = this;
    const listItemName = this.getListItemName();
    return getListItemByValue({
      esClient,
      listId,
      listItemIndex: listItemName,
      type,
      value,
    });
  };

  /**
   * Creates a list item given at least "value", "type", and a "listId" where "listId" is the parent container that this list
   * item belongs to.
   * See {@link https://www.elastic.co/guide/en/security/current/lists-api-create-container.html}
   * @param options
   * @param options.id Optional Elasticsearch id, if none is given an autogenerated one will be used.
   * @param options.listId The "list_id" this list item belongs to.
   * @param options.value The value of the list item.
   * @param options.type The type of list such as "boolean", "double", "text", "keyword", etc...
   * @param options.meta Additional meta data to associate with the list items as an object of "key/value" pairs. You can set this to "undefined" for no meta values.
   */
  public createListItem = async ({
    id,
    listId,
    value,
    type,
    meta,
    refresh,
  }: CreateListItemOptions): Promise<ListItemSchema | null> => {
    const { esClient, user, config } = this;
    const listItemName = this.getListItemName();

    // POC: route writes to the per-list lookup index when the list is a lookup list.
    if (config.enableLookupIndices) {
      const list = await this.getList({ id: listId });
      const descriptor = list != null ? readStorageDescriptor(list.meta) : undefined;
      if (list != null && descriptor?.type === 'lookup' && descriptor.index != null) {
        await writeLookupItems({
          esClient,
          index: descriptor.index,
          refresh,
          type: list.type,
          values: [value],
        });
        if (isRangeType(list.type)) {
          this.scheduleCoalesceRebuild({ index: descriptor.index, type: list.type });
        }
        const now = new Date().toISOString();
        return {
          '@timestamp': now,
          _version: undefined,
          created_at: now,
          created_by: user,
          id: id ?? uuidv4(),
          list_id: listId,
          meta,
          tie_breaker_id: uuidv4(),
          type: list.type,
          updated_at: now,
          updated_by: user,
          value,
        };
      }
    }

    return createListItem({
      esClient,
      id,
      listId,
      listItemIndex: listItemName,
      meta,
      refresh,
      type,
      user,
      value,
    });
  };

  /**
   * Updates a list item's value given the id of the list item.
   * See {@link https://www.elastic.co/guide/en/elasticsearch/reference/current/optimistic-concurrency-control.html}
   * for more information around optimistic concurrency control.
   * @param options
   * @param options._version This is the version, useful for optimistic concurrency control.
   * @param options.id id of the list to replace the list item with.
   * @param options.value The value of the list item to replace.
   * @param options.meta Additional meta data to associate with the list items as an object of "key/value" pairs. You can set this to "undefined" to not update meta values.
   */
  public updateListItem = async ({
    _version,
    id,
    value,
    meta,
  }: UpdateListItemOptions): Promise<ListItemSchema | null> => {
    const { esClient, user } = this;
    const listItemName = this.getListItemName();
    return updateListItem({
      _version,
      esClient,
      id,
      isPatch: false,
      listItemIndex: listItemName,
      meta,
      user,
      value,
    });
  };

  /**
   * Patches a list item's value given the id of the list item.
   * See {@link https://www.elastic.co/guide/en/elasticsearch/reference/current/optimistic-concurrency-control.html}
   * for more information around optimistic concurrency control.
   * @param options
   * @param options._version This is the version, useful for optimistic concurrency control.
   * @param options.id id of the list to replace the list item with.
   * @param options.value The value of the list item to replace.
   * @param options.meta Additional meta data to associate with the list items as an object of "key/value" pairs. You can set this to "undefined" to not update meta values.
   */
  public patchListItem = async ({
    _version,
    id,
    value,
    meta,
    refresh,
  }: UpdateListItemOptions): Promise<ListItemSchema | null> => {
    const { esClient, user } = this;
    const listItemName = this.getListItemName();
    return updateListItem({
      _version,
      esClient,
      id,
      isPatch: true,
      listItemIndex: listItemName,
      meta,
      refresh,
      user,
      value,
    });
  };

  /**
   * Updates a list container's value given the id of the list.
   * See {@link https://www.elastic.co/guide/en/elasticsearch/reference/current/optimistic-concurrency-control.html}
   * for more information around optimistic concurrency control.
   * @param options
   * @param options._version This is the version, useful for optimistic concurrency control.
   * @param options.id id of the list to replace the list container data with.
   * @param options.name The new name, or "undefined" if this should not be updated.
   * @param options.description The new description, or "undefined" if this should not be updated.
   * @param options.meta Additional meta data to associate with the list items as an object of "key/value" pairs. You can set this to "undefined" to not update meta values.
   * @param options.version Updates the version of the list.
   */
  public updateList = async ({
    _version,
    id,
    name,
    description,
    meta,
    version,
  }: UpdateListOptions): Promise<ListSchema | null> => {
    const { esClient, user } = this;
    const listName = this.getListName();
    return updateList({
      _version,
      description,
      esClient,
      id,
      isPatch: false,
      listIndex: listName,
      meta,
      name,
      user,
      version,
    });
  };

  /**
   * Patches a list container's value given the id of the list.
   * @param options
   * @param options._version This is the version, useful for optimistic concurrency control.
   * @param options.id id of the list to replace the list container data with.
   * @param options.name The new name, or "undefined" if this should not be updated.
   * @param options.description The new description, or "undefined" if this should not be updated.
   * @param options.meta Additional meta data to associate with the list items as an object of "key/value" pairs. You can set this to "undefined" to not update meta values.
   * @param options.version Updates the version of the list.
   */
  public patchList = async ({
    _version,
    id,
    name,
    description,
    meta,
    version,
  }: UpdateListOptions): Promise<ListSchema | null> => {
    const { esClient, user } = this;
    const listName = this.getListName();
    return updateList({
      _version,
      description,
      esClient,
      id,
      isPatch: true,
      listIndex: listName,
      meta,
      name,
      user,
      version,
    });
  };

  /**
   * Given a list item id, this returns the list item if it exists, otherwise "null".
   * @param options
   * @param options.id The id of the list item to get.
   * @returns The list item found if it exists, otherwise "null".
   */
  public getListItem = async ({ id }: GetListItemOptions): Promise<ListItemSchema | null> => {
    const { esClient } = this;
    const listItemName = this.getListItemName();
    return getListItem({
      esClient,
      id,
      listItemIndex: listItemName,
    });
  };

  /**
   * Given a list item value, this returns all list items found with that value.
   * @param options
   * @param options.type The type of list such as "boolean", "double", "text", "keyword", etc...
   * @param options.listId The id of the list container to search for list items.
   * @param options.value The value to search for list items based off.
   * @returns All list items that match the value sent in.
   */
  public getListItemByValues = async ({
    type,
    listId,
    value,
  }: GetListItemsByValueOptions): Promise<ListItemArraySchema> => {
    const { esClient } = this;
    const listItemName = this.getListItemName();
    return getListItemByValues({
      esClient,
      listId,
      listItemIndex: listItemName,
      type,
      value,
    });
  };

  /**
   * Given a list item value, this search for all list items found with that value.
   * @param options
   * @param options.type The type of list such as "boolean", "double", "text", "keyword", etc...
   * @param options.listId The id of the list container to search for list items.
   * @param options.value The value to search for list items based off.
   * @returns All list items that match the value sent in.
   */
  public searchListItemByValues = async ({
    type,
    listId,
    value,
  }: SearchListItemByValuesOptions): Promise<SearchListItemArraySchema> => {
    const { esClient, config, user } = this;
    const listItemName = this.getListItemName();

    // POC: post-filter exception path routed to the per-list lookup index.
    if (config.enableLookupIndices) {
      const list = await this.getList({ id: listId });
      const descriptor = list != null ? readStorageDescriptor(list.meta) : undefined;
      if (list != null && descriptor?.type === 'lookup' && descriptor.index != null) {
        return searchLookupItemsByValues({
          esClient,
          index: descriptor.index,
          listId,
          type: list.type,
          user,
          values: value,
        });
      }
    }

    return searchListItemByValues({
      esClient,
      listId,
      listItemIndex: listItemName,
      type,
      value,
    });
  };

  /**
   * Finds lists based on a filter passed in. This is a bit complicated as it existed before
   * PIT (Point in Time) and other mechanisms. This uses an older way of doing "hops" and
   * accepting a "currentIndexPosition" which acts like a pointer to where the search should continue.
   * @param options
   * @param options.filter A KQL string filter to find lists.
   * @param options.currentIndexPosition The current index position to search from.
   * @param options.perPage How many per page to return.
   * @param options.sortField Which field to sort on, "undefined" for no sort field
   * @param options.sortOrder "asc" or "desc" to sort, otherwise "undefined" if there is no sort order
   * @param options.searchAfter array of search_after terms, otherwise "undefined" if there is no search_after
   * @returns All lists found based on the passed in filter.
   */
  public findList = async ({
    filter,
    currentIndexPosition,
    perPage,
    page,
    sortField,
    sortOrder,
    searchAfter,
    runtimeMappings,
  }: FindListOptions): Promise<FoundListSchema> => {
    const { esClient } = this;
    const listName = this.getListName();
    return findList({
      currentIndexPosition,
      esClient,
      filter,
      listIndex: listName,
      page,
      perPage,
      runtimeMappings,
      searchAfter,
      sortField,
      sortOrder,
    });
  };

  /**
   * Finds list items based on a filter passed in. This is a bit complicated as it existed before
   * PIT (Point in Time) and other mechanisms. This uses an older way of doing "hops" and
   * accepting a "currentIndexPosition" which acts like a pointer to where the search should continue.
   * @param options
   * @param options.listId The list id to search for the list items
   * @param options.filter A KQL string filter to find list items.
   * @param options.currentIndexPosition The current index position to search from.
   * @param options.perPage How many per page to return.
   * @param options.page The current page number for the current find
   * @param options.sortField Which field to sort on, "undefined" for no sort field
   * @param options.sortOrder "asc" or "desc" to sort, otherwise "undefined" if there is no sort order
   * @param options.searchAfter array of search_after terms, otherwise "undefined" if there is no search_after
   * @returns All list items found based on the passed in filter.
   */
  public findListItem = async ({
    listId,
    filter,
    currentIndexPosition,
    perPage,
    page,
    runtimeMappings,
    sortField,
    sortOrder,
    searchAfter,
  }: FindListItemOptions): Promise<FoundListItemSchema | null> => {
    const { esClient } = this;
    const listName = this.getListName();
    const listItemName = this.getListItemName();
    return findListItem({
      currentIndexPosition,
      esClient,
      filter,
      listId,
      listIndex: listName,
      listItemIndex: listItemName,
      page,
      perPage,
      runtimeMappings,
      searchAfter,
      sortField,
      sortOrder,
    });
  };

  /**
   * Whether a value list is small enough to inline into a rule query, rather than
   * large and applied by the per-page post filter. Handles three cases:
   * - legacy list: counts items in the shared `.items` stream, and for `ip_range`
   *   also caps the dash-notation ranges, since each becomes one inline clause.
   * - lookup equality or native list: counts the one document per distinct value.
   * - lookup range list: counts the coalesced intervals, never the source docs,
   *   since each interval becomes one inline clause and the sources are only truth
   *   for rebuilds.
   * Only the list types usable in exceptions (`ip`, `keyword`, `ip_range`) can be
   * small; any other type is treated as large.
   */
  public isSmallList = async ({ list }: { list: ListSchema }): Promise<boolean> => {
    const { esClient, config } = this;
    if (list.type !== 'ip_range' && list.type !== 'ip' && list.type !== 'keyword') {
      return false;
    }

    if (config.enableLookupIndices) {
      const descriptor = readStorageDescriptor(list.meta);
      if (descriptor.type === 'lookup' && descriptor.index != null) {
        const count = await countLookupItems({
          esClient,
          index: descriptor.index,
          type: list.type,
        });
        const limit = isRangeType(list.type)
          ? MAXIMUM_SMALL_IP_RANGE_VALUE_LIST_DASH_SIZE
          : MAXIMUM_SMALL_VALUE_LIST_SIZE;
        return count < limit;
      }
    }

    const item = await this.findListItem({
      currentIndexPosition: 0,
      filter: '',
      listId: list.id,
      page: 0,
      perPage: 0,
      runtimeMappings: undefined,
      searchAfter: [],
      sortField: undefined,
      sortOrder: undefined,
    });
    if (item == null || item.total >= MAXIMUM_SMALL_VALUE_LIST_SIZE) {
      return false;
    }
    if (list.type !== 'ip_range') {
      return true;
    }
    // For a legacy ip_range list, each dash-notation range becomes its own inline
    // clause, so cap their count. CIDR values collapse to a single terms clause and
    // are excluded by the `is_cidr` runtime field (dash ranges are stored as an
    // object, CIDR as a string).
    const dashRanges = await this.findListItem({
      currentIndexPosition: 0,
      filter: 'is_cidr: false',
      listId: list.id,
      page: 0,
      perPage: 0,
      runtimeMappings: {
        is_cidr: {
          script: `
          if (params._source["ip_range"] instanceof String) {
            emit(true);
          } else {
            emit(false);
          }
          `,
          type: 'boolean',
        },
      },
      searchAfter: [],
      sortField: undefined,
      sortOrder: undefined,
    });
    return dashRanges != null && dashRanges.total < MAXIMUM_SMALL_IP_RANGE_VALUE_LIST_DASH_SIZE;
  };

  public findAllListItems = async ({
    listId,
    filter,
    sortField,
    sortOrder,
  }: FindAllListItemsOptions): Promise<FoundAllListItemsSchema | null> => {
    const { esClient, config, user } = this;
    const listName = this.getListName();
    const listItemName = this.getListItemName();

    // POC: inline exception path routed to the per-list lookup index.
    if (config.enableLookupIndices) {
      const list = await this.getList({ id: listId });
      const descriptor = list != null ? readStorageDescriptor(list.meta) : undefined;
      if (list != null && descriptor?.type === 'lookup' && descriptor.index != null) {
        return findAllLookupItems({
          esClient,
          index: descriptor.index,
          listId,
          type: list.type,
          user,
        });
      }
    }

    return findAllListItems({
      esClient,
      filter,
      listId,
      listIndex: listName,
      listItemIndex: listItemName,
      sortField,
      sortOrder,
    });
  };
}
