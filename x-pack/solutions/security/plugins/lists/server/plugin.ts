/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import type { SpacesServiceStart } from '@kbn/spaces-plugin/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';

import type { ConfigType } from './config';
import { initRoutes } from './routes/init_routes';
import { ListClient } from './services/lists/list_client';
import { VALUE_LIST_INDEX_PREFIX } from './services/lookup';
import type {
  ContextProvider,
  ContextProviderReturn,
  ListPluginSetup,
  ListsPluginStart,
  ListsRequestHandlerContext,
  PluginsSetup,
  PluginsStart,
  ScheduleCoalesceRebuild,
  ValueListRuleScanner,
} from './types';
import {
  registerCoalesceRebuildTask,
  scheduleCoalesceRebuild as scheduleCoalesceRebuildTask,
} from './tasks/coalesce_rebuild_task';
import { getSpaceId } from './get_space_id';
import { getUser } from './get_user';
import { initSavedObjects } from './saved_objects';
import { ExceptionListClient } from './services/exception_lists/exception_list_client';
import type {
  ExtensionPointStorageClientInterface,
  ExtensionPointStorageInterface,
} from './services/extension_points';
import { ExtensionPointStorage } from './services/extension_points';

export class ListPlugin
  implements Plugin<ListPluginSetup, ListsPluginStart, PluginsSetup, PluginsStart>
{
  private readonly logger: Logger;
  private readonly config: ConfigType;
  private readonly extensionPoints: ExtensionPointStorageInterface;
  private spaces: SpacesServiceStart | undefined | null;
  // POC: set by a consumer (the security solution) through the setup contract; read
  // lazily per request by the migrate and restrict routes, since it is registered
  // after setup runs.
  private ruleScanner: ValueListRuleScanner | undefined;
  // POC: Task Manager start contract, captured in start(), used to enqueue the
  // per-list coalesced-range rebuild after a range source mutation. The task runs as
  // the Kibana system user, so scheduling needs no request and no credential.
  private taskManager: TaskManagerStartContract | undefined;
  private coreStart: CoreStart | undefined;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.logger = this.initializerContext.logger.get();
    this.config = this.initializerContext.config.get<ConfigType>();
    this.extensionPoints = new ExtensionPointStorage(this.logger);
  }

  public setup(core: CoreSetup<PluginsStart>, plugins: PluginsSetup): ListPluginSetup {
    const { config } = this;

    // Register the coalesced-range rebuild task. Task Manager coordinates a single
    // rebuild per list, so concurrent and interrupted writes converge.
    registerCoalesceRebuildTask({
      getStartServices: core.getStartServices,
      logger: this.logger,
      taskManager: plugins.taskManager,
    });

    initSavedObjects(core.savedObjects);

    core.http.registerRouteHandlerContext<ListsRequestHandlerContext, 'lists'>(
      'lists',
      this.createRouteHandlerContext()
    );
    const router = core.http.createRouter<ListsRequestHandlerContext>();
    const kibanaVersion = this.initializerContext.env.packageInfo.version;
    initRoutes(router, config, kibanaVersion, () => this.ruleScanner);

    return {
      getExceptionListClient: (
        savedObjectsClient,
        user,
        enableServerExtensionPoints = true
      ): ExceptionListClient => {
        return new ExceptionListClient({
          enableServerExtensionPoints,
          savedObjectsClient,
          serverExtensionsClient: this.extensionPoints.getClient(),
          user,
        });
      },
      getListClient: (esClient, spaceId, user): ListClient => {
        // Called after start, so the internal client is available. Index and alias
        // provisioning always runs as the Kibana system user, whatever client the
        // consumer reads with.
        return new ListClient({
          config,
          esClient,
          internalEsClient: this.coreStart?.elasticsearch.client.asInternalUser,
          scheduleCoalesceRebuild: this.scheduleCoalesceRebuild,
          spaceId,
          user,
        });
      },
      // Decided by the name alone: a lookup list that exists keeps being one when the flag
      // that allowed its creation is turned off again.
      isValueListLookupIndex: (indexName): boolean =>
        indexName.startsWith(`${VALUE_LIST_INDEX_PREFIX}-`),
      registerExtension: (extension): void => {
        this.extensionPoints.add(extension);
      },
      registerValueListRuleScanner: (scanner): void => {
        this.ruleScanner = scanner;
      },
    };
  }

  public start(core: CoreStart, plugins: PluginsStart): ListsPluginStart {
    this.logger.debug('Starting plugin');
    this.spaces = plugins.spaces?.spacesService;
    this.taskManager = plugins.taskManager;
    this.coreStart = core;
  }

  /**
   * Enqueue the rebuild task for a list. The task runs as the Kibana system user, so
   * any ListClient, with or without a request, can schedule it. Fire and forget, because
   * the source write has already succeeded.
   */
  private scheduleCoalesceRebuild: ScheduleCoalesceRebuild = ({ index, type }): void => {
    const { taskManager, logger } = this;
    if (taskManager == null) {
      logger.warn(`cannot schedule coalesced rebuild for ${index}: Task Manager unavailable`);
      return;
    }
    scheduleCoalesceRebuildTask({ index, logger, taskManager, type });
  };

  public stop(): void {
    this.extensionPoints.clear();
    this.logger.debug('Stopping plugin');
  }

  private createRouteHandlerContext = (): ContextProvider => {
    return async (context, request): ContextProviderReturn => {
      const { spaces, config, extensionPoints } = this;
      const {
        security,
        savedObjects: { client: savedObjectsClient },
        elasticsearch: {
          client: { asCurrentUser: esClient, asInternalUser: internalEsClient },
        },
      } = await context.core;
      if (config == null) {
        throw new TypeError('Configuration is required for this plugin to operate');
      } else {
        const spaceId = getSpaceId({ request, spaces });
        const user = getUser({ security });
        const { scheduleCoalesceRebuild } = this;
        return {
          getExceptionListClient: (): ExceptionListClient =>
            new ExceptionListClient({
              request,
              savedObjectsClient,
              serverExtensionsClient: this.extensionPoints.getClient(),
              user,
            }),
          getExtensionPointClient: (): ExtensionPointStorageClientInterface =>
            extensionPoints.getClient(),
          getInternalListClient: (): ListClient =>
            new ListClient({
              config,
              esClient: internalEsClient,
              scheduleCoalesceRebuild,
              spaceId,
              user,
            }),
          getListClient: (): ListClient =>
            new ListClient({
              config,
              esClient,
              internalEsClient,
              scheduleCoalesceRebuild,
              spaceId,
              user,
            }),
        };
      }
    };
  };
}
