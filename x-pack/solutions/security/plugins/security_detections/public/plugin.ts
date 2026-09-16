/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { ConfigType } from '../server/config';

/**
 * The subset of ConfigType exposed to the browser via `exposeToBrowser` in
 * `server/index.ts`. Only `enableDetectionsOnV2` is forwarded.
 */
export type SecurityDetectionsUIConfig = Pick<ConfigType, 'enableDetectionsOnV2'>;

export class SecurityDetectionsPublicPlugin implements Plugin<void, void> {
  private readonly config: SecurityDetectionsUIConfig;

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get<SecurityDetectionsUIConfig>();
  }

  /**
   * Whether the feature flag is on. Step 9 uses this to conditionally register
   * the management UI page — the same check as the server side so callers read
   * one property rather than re-reading config.
   */
  public get detectionsEnabled(): boolean {
    return this.config.enableDetectionsOnV2;
  }

  public setup(_core: CoreSetup): void {}

  public start(_core: CoreStart): void {}

  public stop(): void {}
}
