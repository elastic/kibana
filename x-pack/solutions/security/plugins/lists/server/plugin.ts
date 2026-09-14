/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  KibanaRequest,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import type { SpacesServiceStart } from '@kbn/spaces-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';

import type { ConfigType } from './config';
import { initRoutes } from './routes/init_routes';
import { ListClient } from './services/lists/list_client';
import type {
  ContextProvider,
  ContextProviderReturn,
  ListPluginSetup,
  ListsPluginStart,
  ListsRequestHandlerContext,
  PluginsSetup,
  PluginsStart,
  ScheduleCoalesceRebuild,
  ValueListMigrationRuleScanner,
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
  // lazily per request by the migrate route, since it is registered after setup runs.
  private migrationRuleScanner: ValueListMigrationRuleScanner | undefined;
  // POC: Task Manager start contract, captured in start(), used to enqueue the
  // per-list coalesced-range rebuild after a range source mutation.
  private taskManager: TaskManagerStartContract | undefined;
  // POC: security start contract, used to grant a request-scoped API key so the
  // rebuild task can reach `.value-list-*`, which the internal user cannot.
  private security: SecurityPluginStart | undefined | null;

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
    initRoutes(router, config, kibanaVersion, () => this.migrationRuleScanner);

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
        return new ListClient({
          config,
          esClient,
          scheduleCoalesceRebuild: this.scheduleWithoutRequest,
          spaceId,
          user,
        });
      },
      registerExtension: (extension): void => {
        this.extensionPoints.add(extension);
      },
      registerValueListMigrationRuleScanner: (scanner): void => {
        this.migrationRuleScanner = scanner;
      },
    };
  }

  public start(core: CoreStart, plugins: PluginsStart): ListsPluginStart {
    this.logger.debug('Starting plugin');
    this.spaces = plugins.spaces?.spacesService;
    this.taskManager = plugins.taskManager;
    this.security = plugins.security;
  }

  // Build a request-scoped scheduler: it grants an API key on behalf of the request
  // user, scoped to the list's own index, then enqueues the rebuild task with it. The
  // task authenticates with that key, since the internal user cannot reach
  // `.value-list-*`. Fire-and-forget, because the source write has already succeeded.
  private makeScheduler = (request: KibanaRequest): ScheduleCoalesceRebuild => {
    return ({ index, type }): void => {
      const { taskManager, security, logger } = this;
      if (taskManager == null || security == null) {
        logger.warn(`cannot schedule coalesced rebuild for ${index}: dependency unavailable`);
        return;
      }
      security.authc.apiKeys
        .grantAsInternalUser(request, {
          expiration: '1h',
          metadata: { description: 'value list coalesced-range rebuild' },
          name: `vl-coalesce-rebuild-${index}`,
          role_descriptors: {
            // read + write cover the get, search, bulk, delete-by-query and the
            // conditional update; maintenance covers the refresh the rebuild forces
            // on its delete-by-query. Nothing broader (no index administration).
            vl_coalesce_rebuild: {
              index: [{ names: [index], privileges: ['read', 'write', 'maintenance'] }],
            },
          },
        })
        .then((grant) => {
          if (grant == null) {
            logger.warn(`coalesced rebuild for ${index} not scheduled: API keys unavailable`);
            return;
          }
          const apiKey = Buffer.from(`${grant.id}:${grant.api_key}`).toString('base64');
          scheduleCoalesceRebuildTask({ apiKey, index, logger, taskManager, type });
        })
        .catch((err) => {
          logger.warn(`failed to grant API key for coalesced rebuild of ${index}: ${err.message}`);
        });
    };
  };

  // Fallback for ListClients built outside a request (the setup contract). Range
  // writes on those paths cannot mint a user-scoped key, so the heal is skipped.
  private scheduleWithoutRequest: ScheduleCoalesceRebuild = ({ index }): void => {
    this.logger.warn(
      `coalesced rebuild for ${index} not scheduled: no request context to grant an API key`
    );
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
        const scheduleCoalesceRebuild = this.makeScheduler(request);
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
              scheduleCoalesceRebuild,
              spaceId,
              user,
            }),
        };
      }
    };
  };
}
