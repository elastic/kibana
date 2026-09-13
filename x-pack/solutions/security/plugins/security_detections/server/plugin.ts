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
import { defineBuilderType } from '@kbn/alerting-v2-rule-builders';
import {
  securityDetectionQuery,
  securityDetectionThreshold,
} from '@kbn/security-detection-rule-schema';
import type { AlertingServerSetup } from '@kbn/alerting-v2-plugin/server';
import type { ConfigType } from './config';
import { registerDetectionFetchRoutes } from './routes/fetch';
import { registerCrudRoutes } from './routes/crud_routes';
import type { DetectionsPluginStartDeps } from './routes/types';

interface SetupDeps {
  alertingVTwo: AlertingServerSetup;
}

export class SecurityDetectionsPlugin
  implements Plugin<void, void, SetupDeps, DetectionsPluginStartDeps>
{
  private readonly logger: Logger;
  private readonly config: ConfigType;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.config = initializerContext.config.get<ConfigType>();
  }

  /**
   * Whether the feature flag is on. Used by this step's registration and
   * reused by steps 8.6–8.8 for route registration and by the public plugin
   * for the UI page, so callers check this property rather than re-reading
   * config.
   */
  public get detectionsEnabled(): boolean {
    return this.config.enableDetectionsOnV2;
  }

  public setup(core: CoreSetup<DetectionsPluginStartDeps>, { alertingVTwo }: SetupDeps): void {
    if (this.detectionsEnabled) {
      this.logger.info(
        'Detection Engine v2 enabled — registering detection builder types and routes'
      );

      // defineBuilderType() is the sanctioned type-erasure helper from
      // @kbn/alerting-v2-rule-builders. registerBuilderType takes
      // RegisteredBuilderType (BuilderTypeDefinition<OpaqueBuilderFields>), but
      // the definitions exported from the schema package are typed with their
      // concrete field types. Function parameters are contravariant, so a typed
      // definition is not assignable to RegisteredBuilderType; defineBuilderType
      // is the correct seam.
      alertingVTwo.registerBuilderType(defineBuilderType(securityDetectionQuery));
      alertingVTwo.registerBuilderType(defineBuilderType(securityDetectionThreshold));

      // Register all detection routes.
      const router = core.http.createRouter();
      registerDetectionFetchRoutes(router, core.getStartServices, this.logger);
      registerCrudRoutes(router, core.getStartServices, this.logger);
    } else {
      this.logger.debug(
        'Detection Engine v2 disabled (xpack.securityDetections.enableDetectionsOnV2 = false) — ' +
          'no builder types or routes registered'
      );
    }
  }

  public start(_core: CoreStart): void {}

  public stop(): void {}
}
