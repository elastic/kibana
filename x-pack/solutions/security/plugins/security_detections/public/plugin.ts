/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { ManagementSetup } from '@kbn/management-plugin/public';
import { i18n } from '@kbn/i18n';
import type { ConfigType } from '../server/config';

/**
 * The subset of ConfigType exposed to the browser via `exposeToBrowser` in
 * `server/index.ts`. Only `enableDetectionsOnV2` is forwarded.
 */
export type SecurityDetectionsUIConfig = Pick<ConfigType, 'enableDetectionsOnV2'>;

/** Setup dependencies injected by Kibana core. */
export interface SecurityDetectionsPluginSetupDeps {
  management: ManagementSetup;
}

const SECTION_ID = 'securityDetectionsV2';
const APP_ID = 'securityDetectionsRules';

export class SecurityDetectionsPublicPlugin
  implements Plugin<void, void, SecurityDetectionsPluginSetupDeps>
{
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

  public setup(core: CoreSetup, { management }: SecurityDetectionsPluginSetupDeps): void {
    // Gate the entire UI surface behind the feature flag. With the flag off no
    // section, no app, and no nav entry are registered — the page simply does
    // not exist.
    if (!this.detectionsEnabled) {
      return;
    }

    const detectionSection = management.sections.register({
      id: SECTION_ID,
      title: i18n.translate('xpack.securityDetections.management.sectionTitle', {
        defaultMessage: 'Security Detections',
      }),
      // order: 1 is taken by Alerting V2 Preview. order: 2 places this section
      // immediately after it in the Management sidebar, keeping related sections
      // together and above the fold at 1920 x 1080.
      order: 2,
    });

    detectionSection.registerApp({
      id: APP_ID,
      title: i18n.translate('xpack.securityDetections.management.rulesNavTitle', {
        defaultMessage: 'Detection Rules',
      }),
      order: 1,
      async mount(params) {
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
