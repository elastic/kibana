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
  Storage,
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
import { ErrorWithStatusCode } from '../../error_with_status_code';
import {
  addLookupAlias,
  buildLookupListItem,
  countLookupItems,
  createLookupIndex,
  deleteLookupIndex,
  deleteLookupItemByValue,
  findAllLookupItems,
  findListByLookupIndex,
  findLookupItems,
  getLookupAliasName,
  getLookupIndexName,
  importLookupItemsToStream,
  isRangeType,
  locateLookupItem,
  lookupAccessNameOf,
  lookupAliasOf,
  lookupIndexOf,
  lookupItemId,
  lookupStorage,
  removeLookupAlias,
  searchLookupItemsByValues,
  streamLookupItemValues,
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

/** `.lists-<space>` streams whose `storage` mapping this process has already applied. */
const storageMappingEnsured = new Set<string>();

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
   * Provisions per-list lookup indices as the Kibana system user, which holds
   * `.value-list-*`. Item reads and writes stay on `esClient`, the calling user.
   */
  private readonly provisioningClient: ElasticsearchClient;

  /**
   * Constructs the value list
   * @param options
   * @param options.spaceId Kibana space id the value lists are part of
   * @param options.user The user associated with the value list
   * @param options.config Configuration for determining things such as maximum sizes
   * @param options.esClient The elastic search client to do the queries with
   * @param options.scheduleCoalesceRebuild Enqueue the background coalesced-range rebuild
   */
  constructor({
    spaceId,
    user,
    config,
    esClient,
    scheduleCoalesceRebuild,
    internalEsClient,
  }: ConstructorOptions) {
    this.spaceId = spaceId;
    this.user = user;
    this.config = config;
    this.esClient = esClient;
    this.scheduleCoalesceRebuild = scheduleCoalesceRebuild;
    this.provisioningClient = internalEsClient ?? esClient;
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
    // records the storage descriptor in its container `storage` field. The
    // `__forceLegacy` meta flag is a POC test affordance to create a legacy
    // (data-stream) list even with the flag on, so coexistence can be exercised
    // without a config toggle.
    const forceLegacy = (meta as Record<string, unknown> | undefined)?.__forceLegacy === true;
    if (config.enableLookupIndices && !forceLegacy) {
      const listId = id ?? uuidv4();
      const index = getLookupIndexName(spaceId, listId);
      const alias = getLookupAliasName(this.getListItemName(), listId);
      await this.ensureStorageMapping();
      await createLookupIndex({ alias, esClient: this.provisioningClient, index, type });
      try {
        return await createList({
          description,
          esClient,
          id: listId,
          immutable,
          listIndex: listName,
          meta,
          name,
          storage: lookupStorage(index, alias),
          type,
          user,
          version,
        });
      } catch (err) {
        // The container write failed (for example a duplicate id or a mapping error), so
        // remove the index just created. Otherwise it stays behind with no list and blocks
        // the name for every later attempt.
        await deleteLookupIndex({ esClient: this.provisioningClient, index }).catch(() => {});
        throw err;
      }
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
   * Writes the storage descriptor on the container document. The `storage` field is
   * never mutable through the public update and patch API, so migration, restrict, and
   * un-restrict write it with this internal update.
   */
  private writeStorage = async (id: string, storage: Storage): Promise<void> => {
    await this.ensureStorageMapping();
    await this.esClient.updateByQuery({
      conflicts: 'proceed',
      index: this.getListName(),
      query: { ids: { values: [id] } },
      refresh: true,
      script: {
        lang: 'painless',
        params: { storage },
        source: 'ctx._source.storage = params.storage;',
      },
    });
  };

  /**
   * POC: migrate a legacy (shared `.items`) value list into its own lookup index.
   * Non-destructive: the `.items` rows are kept, so an existing rule whose threat
   * index is `.items` keeps running against a frozen copy until the rule is updated.
   * This copies the items and sets the storage descriptor; it does not touch rules.
   * The new list is shared: its alias sits under the `.items*` wildcard, so every
   * role and rule API key that reads `.items` today reads the migrated list.
   * @param options.id The id of the list to migrate
   * @returns Whether the list was already a lookup list, its names, and how many items were copied
   */
  public migrateListToLookup = async ({
    id,
  }: {
    id: string;
  }): Promise<{
    alreadyLookup: boolean;
    alias: string | undefined;
    index: string;
    itemsCopied: number;
  }> => {
    const { esClient, spaceId, config } = this;
    if (!config.enableLookupIndices) {
      throw new ErrorWithStatusCode(
        'Lookup indices are not enabled (xpack.lists.enableLookupIndices)',
        400
      );
    }
    const list = await this.getList({ id });
    if (list == null) {
      throw new ErrorWithStatusCode(`list "${id}" not found`, 404);
    }
    const existingIndex = lookupIndexOf(list);
    if (existingIndex != null) {
      return {
        alias: lookupAliasOf(list),
        alreadyLookup: true,
        index: existingIndex,
        itemsCopied: 0,
      };
    }

    const listItemIndex = this.getListItemName();
    const index = getLookupIndexName(spaceId, id);
    const alias = getLookupAliasName(listItemIndex, id);
    await createLookupIndex({ alias, esClient: this.provisioningClient, index, type: list.type });

    let itemsCopied = 0;
    try {
      for await (const batch of streamSharedItemValues({ esClient, listId: id, listItemIndex })) {
        if (batch.length > 0) {
          await writeLookupItems({ esClient, index: alias, type: list.type, values: batch });
          itemsCopied += batch.length;
        }
      }
      await this.writeStorage(id, lookupStorage(index, alias));
    } catch (err) {
      // The copy or the descriptor write failed, so the list is still legacy. Remove the
      // partial index so a rerun starts clean instead of failing on the taken name.
      await deleteLookupIndex({ esClient, index }).catch(() => {});
      throw err;
    }
    if (isRangeType(list.type)) {
      this.scheduleCoalesceRebuild({ index: alias, type: list.type });
    }

    return { alias, alreadyLookup: false, index, itemsCopied };
  };

  /** The concrete index and alias a list id maps to, whether or not the list exists yet. */
  public lookupNamesFor = ({ id }: { id: string }): { alias: string; index: string } => ({
    alias: getLookupAliasName(this.getListItemName(), id),
    index: getLookupIndexName(this.spaceId, id),
  });

  /**
   * Whether the calling user can read an index. Used before restricting a list, so a
   * caller whose role only grants the `.items*` wildcard does not lock themselves out.
   */
  public canReadIndex = async ({ index }: { index: string }): Promise<boolean> => {
    const response = await this.esClient.security.hasPrivileges({
      index: [{ names: [index], privileges: ['read'] }],
    });
    return response.has_all_requested;
  };

  /**
   * POC: restrict a lookup list to explicit grants on its concrete index. Removes the
   * list from the `.items*` wildcard by dropping its alias. The locator changes first,
   * so Kibana addresses the concrete index before the alias disappears; the other
   * order leaves a window where reads hit a missing alias. Both steps are idempotent,
   * so a rerun finishes an interrupted restrict.
   * @returns The concrete index, and whether anything changed
   */
  public restrictList = async ({
    id,
  }: {
    id: string;
  }): Promise<{ changed: boolean; index: string }> => {
    const list = await this.getList({ id });
    if (list == null) {
      throw new ErrorWithStatusCode(`list "${id}" not found`, 404);
    }
    const index = lookupIndexOf(list);
    if (index == null) {
      throw new ErrorWithStatusCode(
        `list "${id}" is a legacy data stream list. Migrate it before restricting it`,
        400
      );
    }
    const alias = lookupAliasOf(list);
    if (alias == null) {
      return { changed: false, index };
    }

    await this.writeStorage(id, lookupStorage(index));
    await removeLookupAlias({ alias, esClient: this.provisioningClient, index });
    if (isRangeType(list.type)) {
      // A pending rebuild holds a key scoped to the alias. Enqueue one scoped to the
      // concrete index so the coalesced set keeps converging.
      this.scheduleCoalesceRebuild({ index, type: list.type });
    }
    return { changed: true, index };
  };

  /**
   * POC: return a restricted lookup list to the shared state. Adds the alias back, then
   * records it in the locator, the reverse order of restrict for the same reason.
   * @returns The alias, and whether anything changed
   */
  public unrestrictList = async ({
    id,
  }: {
    id: string;
  }): Promise<{ alias: string; changed: boolean; index: string }> => {
    const list = await this.getList({ id });
    if (list == null) {
      throw new ErrorWithStatusCode(`list "${id}" not found`, 404);
    }
    const index = lookupIndexOf(list);
    if (index == null) {
      throw new ErrorWithStatusCode(`list "${id}" is not a lookup list`, 400);
    }
    const existingAlias = lookupAliasOf(list);
    if (existingAlias != null) {
      return { alias: existingAlias, changed: false, index };
    }

    const alias = getLookupAliasName(this.getListItemName(), id);
    await addLookupAlias({ alias, esClient: this.provisioningClient, index });
    await this.writeStorage(id, lookupStorage(index, alias));
    if (isRangeType(list.type)) {
      this.scheduleCoalesceRebuild({ index: alias, type: list.type });
    }
    return { alias, changed: true, index };
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
    const { esClient, user, config } = this;
    const listName = this.getListName();

    // With the flag on, a list created here is a lookup list like any other new list.
    if (config.enableLookupIndices) {
      const existing = await this.getList({ id });
      if (existing != null) {
        return existing;
      }
      return this.createList({ description, id, immutable, meta, name, type, version });
    }

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
   * Bring an existing `.lists` data stream up to date with the additive `storage`
   * field before the first write that sets it. A new installation gets the field from
   * the index template when the initialization flow creates the stream; an existing
   * stream keeps its old strict mapping, so it needs one additive `PUT mapping`. The
   * call is idempotent and runs on the internal client, which holds `manage` on the
   * stream. It is remembered per space for the life of the process, so it costs one
   * call per space. No-op unless the lookup-indices flag is on or when the stream does
   * not exist yet.
   */
  private ensureStorageMapping = async (): Promise<void> => {
    const { config } = this;
    const listName = this.getListName();
    if (!config.enableLookupIndices || storageMappingEnsured.has(listName)) {
      return;
    }
    const exists = await getDataStreamExists(this.provisioningClient, listName);
    if (exists) {
      const storageMapping = (listMappings as { properties: Record<string, MappingProperty> })
        .properties.storage;
      await this.provisioningClient.indices.putMapping({
        index: listName,
        properties: { storage: storageMapping },
      });
    }
    storageMappingEnsured.add(listName);
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
    const { esClient, config, user } = this;
    const listItemName = this.getListItemName();

    // A lookup item id names a value. Locate it, delete the value, and report the item.
    if (config.enableLookupIndices) {
      const resolved = await this.resolveLookupItem(id);
      if (resolved != null) {
        const { accessName, list, value } = resolved;
        // A delete by id is a single document; wait for the refresh so the caller's
        // next read (the items table, a repeated delete) sees it.
        await deleteLookupItemByValue({
          esClient,
          index: accessName,
          refresh: 'wait_for',
          type: list.type,
          value,
        });
        if (isRangeType(list.type)) {
          this.scheduleCoalesceRebuild({ index: accessName, type: list.type });
        }
        return buildLookupListItem({ listId: list.id, type: list.type, user, value });
      }
    }

    return deleteListItem({ esClient, id, listItemIndex: listItemName, refresh });
  };

  /**
   * Resolve a lookup item id to its list and authored value. Lookup item ids are
   * content addressed, so the id is searched across the space's lookup indices and the
   * owning list is read back from the container by the concrete index of the hit.
   */
  private resolveLookupItem = async (
    id: string
  ): Promise<{ accessName: string; list: ListSchema; value: string } | undefined> => {
    const { esClient, spaceId } = this;
    const located = await locateLookupItem({
      esClient,
      id,
      listItemIndex: this.getListItemName(),
      spaceId,
    });
    if (located == null) {
      return undefined;
    }
    const list = await findListByLookupIndex({
      esClient,
      index: located.index,
      listIndex: this.getListName(),
    });
    const accessName = list != null ? lookupAccessNameOf(list) : undefined;
    if (list == null || accessName == null) {
      return undefined;
    }
    return { accessName, list, value: located.value };
  };

  /**
   * Replace the value a lookup item id names. The new value is written before the old
   * one is removed, so membership never has a window with neither. The item id changes,
   * because it is a hash of the value. A missing value leaves the item unchanged, since
   * a lookup item carries nothing else to patch.
   */
  private replaceLookupItemValue = async ({
    id,
    refresh,
    value,
  }: {
    id: string;
    refresh: boolean | undefined;
    value: string | null | undefined;
  }): Promise<ListItemSchema | null | undefined> => {
    const { esClient, user } = this;
    const resolved = await this.resolveLookupItem(id);
    if (resolved == null) {
      return undefined;
    }
    const { accessName, list, value: current } = resolved;
    const item = (v: string): ListItemSchema =>
      buildLookupListItem({ listId: list.id, type: list.type, user, value: v });
    if (value == null || value === current) {
      return item(current);
    }
    const esRefresh = refresh ? 'wait_for' : undefined;
    await writeLookupItems({
      esClient,
      index: accessName,
      refresh: esRefresh,
      type: list.type,
      values: [value],
    });
    await deleteLookupItemByValue({
      esClient,
      index: accessName,
      refresh: esRefresh,
      type: list.type,
      value: current,
    });
    if (isRangeType(list.type)) {
      this.scheduleCoalesceRebuild({ index: accessName, type: list.type });
    }
    return item(value);
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
      const { user } = this;
      const list = await this.getList({ id: listId });
      const lookupIndex = list != null ? lookupAccessNameOf(list) : undefined;
      if (list != null && lookupIndex != null) {
        await deleteLookupItemByValue({
          esClient,
          index: lookupIndex,
          refresh,
          type: list.type,
          value,
        });
        if (isRangeType(list.type)) {
          this.scheduleCoalesceRebuild({ index: lookupIndex, type: list.type });
        }
        // Return a representation of the deleted item so callers (and the delete
        // route, which treats an empty array as "not found") see that the value was
        // removed. The lookup index keys items by a hash of the value, not a stored
        // item id, so the id here is synthesized.
        const now = new Date().toISOString();
        return [
          {
            '@timestamp': now,
            _version: undefined,
            created_at: now,
            created_by: user,
            id: uuidv4(),
            list_id: listId,
            meta: undefined,
            tie_breaker_id: uuidv4(),
            type: list.type,
            updated_at: now,
            updated_by: user,
            value,
          },
        ];
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

    // POC: deleting a lookup list drops its concrete index, which removes the alias too.
    // An index delete must name the concrete index, never the alias.
    if (config.enableLookupIndices) {
      const list = await this.getList({ id });
      const lookupIndex = list != null ? lookupIndexOf(list) : undefined;
      if (lookupIndex != null) {
        await deleteLookupIndex({ esClient: this.provisioningClient, index: lookupIndex });
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
          const lookupIndex = list != null ? lookupAccessNameOf(list) : undefined;
          const values =
            list != null && lookupIndex != null
              ? streamLookupItemValues({ esClient, index: lookupIndex, type: list.type })
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
    if (config.enableLookupIndices) {
      if (listId != null) {
        const list = await this.getList({ id: listId });
        const lookupIndex = list != null ? lookupAccessNameOf(list) : undefined;
        if (list != null && lookupIndex != null) {
          await importLookupItemsToStream({
            config,
            esClient,
            index: lookupIndex,
            stream,
            type: list.type,
          });
          if (isRangeType(list.type)) {
            this.scheduleCoalesceRebuild({ index: lookupIndex, type: list.type });
          }
          return list;
        }
      } else {
        // No list id: the list is created, or found, under the uploaded file name, the
        // same rule the shared stream applies. A file name that names an existing legacy
        // list is rejected, so a legacy list is never written through this path.
        let created: ListSchema | null = null;
        await importLookupItemsToStream({
          config,
          esClient,
          resolveIndex: async (fileName) => {
            created = await this.createListIfItDoesNotExist({
              description: `File uploaded from file system of ${fileName}`,
              id: fileName,
              immutable: false,
              meta,
              name: fileName,
              type,
              version,
            });
            const accessName = lookupAccessNameOf(created);
            if (accessName == null) {
              throw new ErrorWithStatusCode(
                `list "${fileName}" exists as a legacy list. Pass list_id to import into it`,
                400
              );
            }
            return accessName;
          },
          stream,
          type,
        });
        const list: ListSchema | null = created;
        if (list != null && isRangeType(type)) {
          const accessName = lookupAccessNameOf(list);
          if (accessName != null) {
            this.scheduleCoalesceRebuild({ index: accessName, type });
          }
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
    const { esClient, config } = this;
    const listItemName = this.getListItemName();

    if (config.enableLookupIndices) {
      const items = await this.lookupItemsByValues({ listId, values: [value] });
      if (items != null) {
        return items;
      }
    }

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
      const lookupIndex = list != null ? lookupAccessNameOf(list) : undefined;
      if (list != null && lookupIndex != null) {
        await writeLookupItems({
          esClient,
          index: lookupIndex,
          refresh,
          type: list.type,
          values: [value],
        });
        if (isRangeType(list.type)) {
          this.scheduleCoalesceRebuild({ index: lookupIndex, type: list.type });
        }
        const now = new Date().toISOString();
        return {
          '@timestamp': now,
          _version: undefined,
          created_at: now,
          created_by: user,
          // Lookup item ids are content addressed, so a caller supplied id is not kept.
          id: lookupItemId(list.type, value),
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
    const { esClient, user, config } = this;
    const listItemName = this.getListItemName();

    if (config.enableLookupIndices) {
      const replaced = await this.replaceLookupItemValue({ id, refresh: undefined, value });
      if (replaced !== undefined) {
        return replaced;
      }
    }

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
    const { esClient, user, config } = this;
    const listItemName = this.getListItemName();

    if (config.enableLookupIndices) {
      const replaced = await this.replaceLookupItemValue({ id, refresh, value });
      if (replaced !== undefined) {
        return replaced;
      }
    }

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
    const { esClient, config, user } = this;
    const listItemName = this.getListItemName();

    if (config.enableLookupIndices) {
      const resolved = await this.resolveLookupItem(id);
      if (resolved != null) {
        const { list, value } = resolved;
        return buildLookupListItem({ listId: list.id, type: list.type, user, value });
      }
    }

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
    const { esClient, config } = this;
    const listItemName = this.getListItemName();

    if (config.enableLookupIndices) {
      const items = await this.lookupItemsByValues({ listId, values: value });
      if (items != null) {
        return items;
      }
    }

    return getListItemByValues({
      esClient,
      listId,
      listItemIndex: listItemName,
      type,
      value,
    });
  };

  /**
   * The items of a lookup list that hold any of the values, or undefined when the list
   * is not a lookup list so the caller falls through to the shared stream.
   */
  private lookupItemsByValues = async ({
    listId,
    values,
  }: {
    listId: string;
    values: string[];
  }): Promise<ListItemArraySchema | undefined> => {
    const { esClient, user } = this;
    const list = await this.getList({ id: listId });
    const accessName = list != null ? lookupAccessNameOf(list) : undefined;
    if (list == null || accessName == null) {
      return undefined;
    }
    const found = await searchLookupItemsByValues({
      esClient,
      index: accessName,
      listId,
      type: list.type,
      user,
      values,
    });
    return found.flatMap((entry) => entry.items);
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
      const lookupIndex = list != null ? lookupAccessNameOf(list) : undefined;
      if (list != null && lookupIndex != null) {
        return searchLookupItemsByValues({
          esClient,
          index: lookupIndex,
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
    const { esClient, config, user } = this;
    const listName = this.getListName();
    const listItemName = this.getListItemName();

    // The items table of a lookup list reads the per-list index, paged by offset.
    if (config.enableLookupIndices) {
      const list = await this.getList({ id: listId });
      const accessName = list != null ? lookupAccessNameOf(list) : undefined;
      if (list != null && accessName != null) {
        return findLookupItems({
          currentIndexPosition,
          esClient,
          filter,
          index: accessName,
          listId,
          page,
          perPage,
          searchAfter,
          sortField,
          sortOrder,
          type: list.type,
          user,
        });
      }
    }

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
      const lookupIndex = lookupAccessNameOf(list);
      if (lookupIndex != null) {
        const count = await countLookupItems({
          esClient,
          index: lookupIndex,
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
      const lookupIndex = list != null ? lookupAccessNameOf(list) : undefined;
      if (list != null && lookupIndex != null) {
        return findAllLookupItems({
          esClient,
          index: lookupIndex,
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
