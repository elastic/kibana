/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { NativeVulnScannerConfig } from './config';
import { ensureFindingsIndex } from './lib/findings';
import type { NativeVulnScannerServerSetup, NativeVulnScannerServerStart } from './types';

export class NativeVulnScannerPlugin
  implements Plugin<NativeVulnScannerServerSetup, NativeVulnScannerServerStart>
{
  private readonly config: NativeVulnScannerConfig;
  private readonly logger: Logger;

  constructor(context: PluginInitializerContext<NativeVulnScannerConfig>) {
    this.config = context.config.get<NativeVulnScannerConfig>();
    this.logger = context.logger.get();
  }

  public setup(): NativeVulnScannerServerSetup {
    if (this.config.enabled) {
      this.logger.debug('Native vulnerability scanner is enabled');
    }
    return {};
  }

  public start(core: CoreStart): NativeVulnScannerServerStart {
    if (this.config.enabled) {
      ensureFindingsIndex(core.elasticsearch.client.asInternalUser).catch((error: Error) => {
        this.logger.error(`Failed to set up the vulnerability findings index: ${error.message}`);
      });
    }
    return {};
  }

  public stop(): void {}
}
