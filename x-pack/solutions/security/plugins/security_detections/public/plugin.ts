/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AppMountParameters,
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { DETECTIONS_V2_APP_ID } from '../common';
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
   * Whether the feature flag is on. The same check as the server side, so
   * callers read one property rather than re-reading config.
   */
  public get detectionsEnabled(): boolean {
    return this.config.enableDetectionsOnV2;
  }

  public setup(core: CoreSetup): void {
    // Gate the entire UI surface behind the feature flag. With the flag off no
    // app is registered, so the Security solution's Rules nav node resolves to
    // no deep link and the navigation framework drops it — the page simply does
    // not exist, in the nav or by URL.
    if (!this.detectionsEnabled) {
      return;
    }

    core.application.register({
      id: DETECTIONS_V2_APP_ID,
      title: i18n.translate('xpack.securityDetections.appTitle', {
        defaultMessage: 'Detection rules (SIEM) v2',
      }),
      appRoute: '/app/security_detections_v2',
      // 'projectSideNav' is required: a deep link that is not visible there is
      // removed from the Security solution side nav, node and all. The page is
      // surfaced through the Security nav tree's Rules panel rather than as a
      // top-level nav entry, so 'classicSideNav' is deliberately omitted — in a
      // classic space the app stays reachable by URL and global search.
      visibleIn: ['projectSideNav', 'globalSearch'],
      async mount(params: AppMountParameters) {
        const [coreStart] = await core.getStartServices();
        // Dynamic import keeps the page component out of the main bundle.
        const { mountDetectionRulesApp } = await import('./pages/detection_rules/mount');
        return mountDetectionRulesApp(params, coreStart);
      },
    });
  }

  public start(_core: CoreStart): void {}

  public stop(): void {}
}
