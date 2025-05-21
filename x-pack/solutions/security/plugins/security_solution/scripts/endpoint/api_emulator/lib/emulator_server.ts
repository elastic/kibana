/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { ServerRoute } from '@hapi/hapi';
import Hapi from '@hapi/hapi';
import type { ToolingLog } from '@kbn/tooling-log';
import type {
  EmulatorServerPlugin,
  EmulatorServerPluginRegisterOptions,
  EmulatorServerRouteDefinition,
} from './emulator_server.types';
import type { DeferredPromiseInterface } from '../../common/utils';
import { getDeferredPromise, prefixedOutputLogger } from '../../common/utils';
import { createToolingLogger } from '../../../../common/endpoint/data_loaders/utils';

interface EmulatorServerOptions<TServices extends {} = {}> {
  /**
   * An object that contains services to be exposed
   */
  services?: TServices;
  logger?: ToolingLog;
  logPrefix?: string;
  port?: number;
}

/**
 * An HTTP server module wrapped around Hapi
 */
export class EmulatorServer<TServices extends {} = {}> {
  protected readonly server: Hapi.Server & { app: { services: TServices | {} } };
  protected log: ToolingLog;
  private stoppedDeferred: DeferredPromiseInterface;
  private wasStarted: boolean = false;

  constructor(protected readonly options: EmulatorServerOptions<TServices> = {}) {
    this.log = prefixedOutputLogger(
      (this.options.logPrefix || this.constructor.name) ?? 'EmulatorServer',
      options.logger ?? createToolingLogger()
    );

    // @ts-expect-error
    this.server = Hapi.server({
      port: this.options.port ?? 0,
    });
    this.server.app.services = this.options.services ?? {};
    this.stoppedDeferred = getDeferredPromise();
    this.stoppedDeferred.resolve();

    this.server.events.on('route', (route) => {
      this.log.info(
        `added route: [${route.realm.plugin ?? 'CORE'}] ${route.method.toUpperCase()} ${route.path}`
      );
    });

    this.registerInternalRoutes();
    this.log.verbose(`Instance created`);
  }

  protected registerInternalRoutes() {
    this.server.route({
      method: 'GET',
      path: '/_status',
      handler: async (req) => ({
        status: 'ok',
        started: new Date(req.server.info.started).toISOString(),
        uri: req.server.info.uri,
        plugins: Object.keys(req.server.registrations),
        routes: req.server.table().map((route) => `${route.method.toUpperCase()} ${route.path}`),
      }),
    });
  }

  /**
   * Utility that creates a Hapi Route definition based on the Route Definition defined for this framework
   * @param routesToRegister
   * @protected
   */
  protected createHapiRouteDefinition(
    routesToRegister: EmulatorServerRouteDefinition | EmulatorServerRouteDefinition[]
  ): ServerRoute[] {
    const routes = Array.isArray(routesToRegister) ? routesToRegister : [routesToRegister];

    for (const routeDefinition of routes) {
      if (typeof routeDefinition.options === 'function') {
        throw new Error(`a callback function for 'route.options' is not currently supported!`);
      }

      // Inject `services` to every request under `request.pre.services`
      routeDefinition.options = routeDefinition.options ?? {};
      routeDefinition.options.pre = routeDefinition.options.pre ?? [];
      routeDefinition.options.pre.unshift({
        method: () => this.server.app.services,
        assign: 'services',
      });
    }

    return routes;
  }

  /**
   * Access information about the running server
   */
  public get info(): Hapi.ServerInfo {
    return this.server.info;
  }

  /**
   * A promise that resolves when the server is stopped
   *
   * **IMPORTANT**: Only use this property after server has been started!
   */
  public get stopped(): Promise<void> {
    if (!this.wasStarted) {
      this.log.warning(`Can not access 'stopped' promise. Server not started`);
      return Promise.resolve();
    }

    return this.stoppedDeferred.promise;
  }

  /**
   * Register a plugin with the server
   * @param register
   * @param prefix
   * @param options
   */
  public async register({ register, prefix, ...options }: EmulatorServerPlugin) {
    const createHapiRouteDefinition = this.createHapiRouteDefinition.bind(this);
    const services = this.server.app.services;

    await this.server.register(
      {
        ...options,
        register(pluginScopedServer) {
          const scopedServer: EmulatorServerPluginRegisterOptions = {
            router: {
              route: (routesToRegister) => {
                return pluginScopedServer.route(createHapiRouteDefinition(routesToRegister));
              },
            },

            expose: (key: string, value: any): void => {
              pluginScopedServer.expose(key, value);
            },

            services,
          };

          return register(scopedServer);
        },
      },
      {
        routes: {
          // All plugin routes are namespaced by `prefix` or the plugin name if `prefix` not defined
          prefix: prefix || `/${options.name}`,
        },
      }
    );
  }

  /**
   * Register a route with the root server (non-plugin scoped)
   * @param routesToRegister
   */
  public route(
    routesToRegister: EmulatorServerRouteDefinition | EmulatorServerRouteDefinition[]
  ): void {
    return this.server.route(this.createHapiRouteDefinition(routesToRegister));
  }

  public async start() {
    if (this.wasStarted) {
      this.log.warning(`Can not start server - it already has been started and is running`);
    }

    this.stoppedDeferred = getDeferredPromise();
    await this.server.start();
    this.wasStarted = true;

    this.server.events.once('stop', () => {
      this.log.verbose(`Hapi server was stopped!`);
      this.wasStarted = false;
      this.stoppedDeferred.resolve();
    });

    this.log.info(`Server started and available at: ${this.server.info.uri}`);
  }

  public async stop() {
    this.log.debug(`Stopping Hapi server: ${this.server.info.uri}`);
    await this.server.stop();
  }

  /**
   * Returns a plugin client that enables interactions with the given plugin emulator.
   * Plugins can expose interfaces via the `expose()` method that is available to the plugin's
   * `register()` method.
   */
  public getClient<TClient extends {} = {}>(pluginName: string): TClient {
    const pluginExposedInterface = this.server.plugins[pluginName as keyof Hapi.PluginProperties];

    if (!pluginExposedInterface) {
      throw new Error(`No plugin named [${pluginName}] registered!`);
    }

    return pluginExposedInterface as TClient;
  }
}
