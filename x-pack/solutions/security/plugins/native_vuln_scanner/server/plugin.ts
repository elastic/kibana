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
import type { NativeVulnScannerConfig } from './config';
import { ensureFindingsIndex } from './lib/findings';
import { OSQUERY_PACK_SO_TYPE } from './lib/inventory';
import { ensureSummaryIndex } from './lib/summary';
import { installWorkflows } from './managed_workflows/install';
import { registerOwner } from './managed_workflows/register_owner';
import { registerRoutes } from './routes/register_routes';
import { registerNativeVulnScannerSteps } from './workflows/step_types';
import type {
  NativeVulnScannerServerSetup,
  NativeVulnScannerServerStart,
  NativeVulnScannerSetupDeps,
  NativeVulnScannerStartDeps,
} from './types';

export class NativeVulnScannerPlugin
  implements
    Plugin<
      NativeVulnScannerServerSetup,
      NativeVulnScannerServerStart,
      NativeVulnScannerSetupDeps,
      NativeVulnScannerStartDeps
    >
{
  private readonly config: NativeVulnScannerConfig;
  private readonly logger: Logger;

  constructor(context: PluginInitializerContext<NativeVulnScannerConfig>) {
    this.config = context.config.get<NativeVulnScannerConfig>();
    this.logger = context.logger.get();
  }

  public setup(
    core: CoreSetup<NativeVulnScannerStartDeps>,
    { workflowsExtensions, workflowsManagement }: NativeVulnScannerSetupDeps
  ): NativeVulnScannerServerSetup {
    if (!this.config.enabled) return {};
    registerOwner({ workflowsExtensions });
    registerNativeVulnScannerSteps(workflowsExtensions, {
      logger: this.logger.get('scan'),
      includeUnfixed: this.config.includeUnfixed,
      getLicense: async () => {
        const [, { licensing }] = await core.getStartServices();
        return licensing.getLicense();
      },
      getScanDeps: async () => {
        const [coreStart] = await core.getStartServices();
        return {
          // Origin-only under CPS: osquery results and the findings index live in this project.
          es: coreStart.elasticsearch.client.asInternalUser,
          packRepository: coreStart.savedObjects.createInternalRepository([OSQUERY_PACK_SO_TYPE]),
        };
      },
    });
    registerRoutes({
      router: core.http.createRouter(),
      logger: this.logger.get('routes'),
      getLicense: async () => {
        const [, { licensing }] = await core.getStartServices();
        return licensing.getLicense();
      },
      getServices: async () => {
        const [coreStart, { fleet }] = await core.getStartServices();
        return {
          fleet,
          workflows: workflowsManagement.management,
          // Origin-only under CPS: the run summary and osquery results live in this project (read by the internal user).
          es: coreStart.elasticsearch.client.asInternalUser,
          packRepository: coreStart.savedObjects.createInternalRepository([OSQUERY_PACK_SO_TYPE]),
        };
      },
    });
    return {};
  }

  public start(
    core: CoreStart,
    { workflowsExtensions }: NativeVulnScannerStartDeps
  ): NativeVulnScannerServerStart {
    if (!this.config.enabled) return {};
    this.setUp(core, workflowsExtensions).catch((error: Error) => {
      this.logger.error(`Failed to set up the vulnerability scanner: ${error.message}`);
    });
    return {};
  }

  /** The indices come first so the first scheduled run never writes into an auto-created index. */
  private async setUp(
    core: CoreStart,
    workflowsExtensions: NativeVulnScannerStartDeps['workflowsExtensions']
  ) {
    // Origin-only under CPS: both indices are plugin-owned and live in this project.
    const es = core.elasticsearch.client.asInternalUser;
    await Promise.all([
      ensureFindingsIndex(es).catch((error: Error) => {
        this.logger.error(`Failed to set up the vulnerability findings index: ${error.message}`);
      }),
      ensureSummaryIndex(es).catch((error: Error) => {
        this.logger.error(
          `Failed to set up the vulnerability scan summary index: ${error.message}`
        );
      }),
    ]);
    await installWorkflows({ logger: this.logger, workflowsExtensions });
  }

  public stop(): void {}
}
