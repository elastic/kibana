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
import { installWorkflows, uninstallWorkflows } from './managed_workflows/install';
import { registerOwner } from './managed_workflows/register_owner';
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
    { workflowsExtensions }: NativeVulnScannerSetupDeps
  ): NativeVulnScannerServerSetup {
    // Registered even when disabled: the owner must exist for `start()` to uninstall the workflow.
    registerOwner({ workflowsExtensions });
    if (!this.config.enabled) return {};
    registerNativeVulnScannerSteps(workflowsExtensions, {
      logger: this.logger.get('scan'),
      getScanDeps: async () => {
        const [coreStart] = await core.getStartServices();
        return {
          // Origin-only under CPS: osquery results and the findings index live in this project.
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
    if (!this.config.enabled) {
      // A scan workflow installed while the plugin was on must not outlive it. Best effort: a
      // failure here is logged and never blocks Kibana from starting.
      uninstallWorkflows({ logger: this.logger, workflowsExtensions }).catch((error: Error) => {
        this.logger.warn(`Failed to remove the vulnerability scan workflow: ${error.message}`);
      });
      return {};
    }
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
