/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AppMountParameters,
  CoreSetup,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { DETECTION_INSPECTOR_APP_ID } from '../common/constants';

/** What the inspector reads from other plugins: the active space, and Discover links when `share` is on. */
export interface NightshiftDetectionStartDependencies {
  spaces: SpacesPluginStart;
  share?: SharePluginStart;
}

/**
 * Registers the engine inspector. The plugin only loads when `xpack.nightshiftDetection.enabled`
 * is true, so the page exists only where the engine does; `visibleIn: []` keeps it out of the nav
 * and search, so it is reached by URL only.
 */
export class NightshiftDetectionPlugin
  implements Plugin<void, void, object, NightshiftDetectionStartDependencies>
{
  constructor(private readonly context: PluginInitializerContext) {}

  public setup(core: CoreSetup<NightshiftDetectionStartDependencies>): void {
    core.application.register({
      id: DETECTION_INSPECTOR_APP_ID,
      title: 'Detection engine inspector',
      visibleIn: [],
      mount: async ({ element }: AppMountParameters) => {
        // Loaded on mount so the page stays out of every page-load bundle.
        const [[coreStart, { spaces, share }], { renderInspector }] = await Promise.all([
          core.getStartServices(),
          import('./application/render_inspector'),
        ]);
        const { id: spaceId } = await spaces.getActiveSpace();
        return renderInspector({
          coreStart,
          element,
          share,
          spaceId,
          isServerless: this.context.env.packageInfo.buildFlavor === 'serverless',
        });
      },
    });
  }

  public start(): void {}
}
