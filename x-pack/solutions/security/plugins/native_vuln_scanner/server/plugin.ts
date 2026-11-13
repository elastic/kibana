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
import { registerScanTask, scheduleScanTask } from './tasks/scan_task';
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
    { taskManager }: NativeVulnScannerSetupDeps
  ): NativeVulnScannerServerSetup {
    if (!this.config.enabled) return {};
    const logger = this.logger.get('scan');
    registerScanTask(taskManager, async () => {
      const [coreStart] = await core.getStartServices();
      return {
        // Origin-only under CPS: osquery results and the findings index live in this project.
        es: coreStart.elasticsearch.client.asInternalUser,
        packRepository: coreStart.savedObjects.createInternalRepository([OSQUERY_PACK_SO_TYPE]),
        logger,
      };
    });
    return {};
  }

  public start(
    core: CoreStart,
    { taskManager }: NativeVulnScannerStartDeps
  ): NativeVulnScannerServerStart {
    if (!this.config.enabled) return {};
    ensureFindingsIndex(core.elasticsearch.client.asInternalUser).catch((error: Error) => {
      this.logger.error(`Failed to set up the vulnerability findings index: ${error.message}`);
    });
    scheduleScanTask(taskManager).catch((error: Error) => {
      this.logger.error(`Failed to schedule the vulnerability scan task: ${error.message}`);
    });
    return {};
  }

  public stop(): void {}
}
