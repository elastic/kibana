/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CustomRequestHandlerContext,
  ElasticsearchClient,
  IContextProvider,
  IRouter,
  KibanaRequest,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type {
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '@kbn/encrypted-saved-objects-plugin/server';
import type { Type } from '@kbn/securitysolution-io-ts-list-types';

import type { ListClient } from './services/lists/list_client';
import type { ExceptionListClient } from './services/exception_lists/exception_list_client';
import type {
  ExtensionPointStorageClientInterface,
  ListsServerExtensionRegistrar,
} from './services/extension_points';

export type ContextProvider = IContextProvider<ListsRequestHandlerContext, 'lists'>;
export type ListsPluginStart = void;

// Task Manager is a hard dependency: the coalesced-range cache of a range value
// list is only kept correct under concurrent writes by the rebuild task, so a
// missing scheduler would mean silent corruption, not a degraded optional feature.
export interface PluginsSetup {
  // The rebuild task authenticates with an API key kept in an encrypted saved object.
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
  taskManager: TaskManagerSetupContract;
}

export interface PluginsStart {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  security: SecurityPluginStart | undefined | null;
  spaces: SpacesPluginStart | undefined | null;
  taskManager: TaskManagerStartContract;
}

/**
 * Enqueue a coalesced-range rebuild for one list. Injected into the ListClient so
 * the write path can schedule the background reconcile after a source mutation.
 */
export type ScheduleCoalesceRebuild = (args: { index: string; type: Type }) => void;

export type GetListClientType = (
  esClient: ElasticsearchClient,
  spaceId: string,
  user: string
) => ListClient;

export type GetExceptionListClientType = (
  savedObjectsClient: SavedObjectsClientContract,
  user: string,
  /** Default is `true` - processing of server extension points are always on by default */
  enableServerExtensionPoints?: boolean
) => ExceptionListClient;

/**
 * Result of a referencing-rule scan for a value list. `lists` owns the shape; the
 * implementation (which detection rules reference the list) is supplied by a consumer
 * that knows about rules, so `lists` stays decoupled from alerting.
 * - `referenced`: rules that read this list, through an exception item or as a threat index.
 * - `maybe`: rules that read the shared `.items` data stream as a threat index without naming the list.
 * - `unverified`: the scan failed. `none`: nothing found.
 */
export interface ValueListReferencingRule {
  id: string;
  name: string;
  reason: 'exception' | 'threat_index';
  /** Owner of the API key the rule executes with, when known. */
  apiKeyOwner?: string | null;
  /**
   * Whether the rule's API key can read the index named by `verifyReadOn`. Undefined
   * when no check was requested, the rule has no key, or the check failed.
   */
  canRead?: boolean;
}

export interface ValueListReferencingRules {
  level: 'referenced' | 'maybe' | 'unverified' | 'none';
  ruleIds?: string[];
  rules?: ValueListReferencingRule[];
}

/**
 * A scanner that reports which detection rules reference a value list. Registered by a
 * consumer (the security solution) through the setup contract and invoked per request
 * by the migrate and restrict routes.
 */
export type ValueListRuleScanner = (args: {
  /** Names a rule can use to reach this list directly as a threat index: its alias and concrete index. */
  accessNames: string[];
  /** Exception lists that hold an item referencing this value list. */
  exceptionListIds: string[];
  /** The shared `.items-<space>` data stream, read by legacy threat-index rules. */
  itemsIndex: string;
  listId: string;
  request: KibanaRequest;
  /** When set, check each referencing rule's API key for read on this index. */
  verifyReadOn?: string;
}) => Promise<ValueListReferencingRules>;

export interface ListPluginSetup {
  getExceptionListClient: GetExceptionListClientType;
  getListClient: GetListClientType;
  registerExtension: ListsServerExtensionRegistrar;
  /** POC: register the scanner that finds detection rules referencing a value list. */
  registerValueListRuleScanner: (scanner: ValueListRuleScanner) => void;
}

/**
 * @public
 */
export interface ListsApiRequestHandlerContext {
  getInternalListClient: () => ListClient;
  getListClient: () => ListClient;
  getExceptionListClient: () => ExceptionListClient;
  getExtensionPointClient: () => ExtensionPointStorageClientInterface;
}

/**
 * @internal
 */
export type ListsRequestHandlerContext = CustomRequestHandlerContext<{
  lists?: ListsApiRequestHandlerContext;
}>;

/**
 * @internal
 */
export type ListsPluginRouter = IRouter<ListsRequestHandlerContext>;
/**
 * @internal
 */
export type ContextProviderReturn = Promise<ListsApiRequestHandlerContext>;

export type {
  ExtensionPoint,
  ExceptionsListPreUpdateItemServerExtension,
  ExceptionsListPreCreateItemServerExtension,
  ExceptionsListPreGetOneItemServerExtension,
  ExceptionsListPreImportServerExtension,
  ExceptionsListPreSummaryServerExtension,
  ExceptionsListPreExportServerExtension,
  ExceptionsListPreMultiListFindServerExtension,
  ExceptionsListPreSingleListFindServerExtension,
  ExceptionsListPreDeleteItemServerExtension,
  ListsServerExtensionRegistrar,
} from './services/extension_points';
