/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMountParameters, CoreSetup, Plugin } from '@kbn/core/public';
import { DETECTION_INSPECTOR_APP_ID } from '../common/constants';

/**
 * Registers the engine inspector. The plugin only loads when `xpack.nightshiftDetection.enabled`
 * is true, so the page exists only where the engine does; `visibleIn: []` keeps it out of the nav
 * and search, so it is reached by URL only.
 */
export class NightshiftDetectionPlugin implements Plugin<void, void> {
  public setup(core: CoreSetup): void {
    core.application.register({
      id: DETECTION_INSPECTOR_APP_ID,
      title: 'Detection engine inspector',
      visibleIn: [],
      mount: async ({ element }: AppMountParameters) => {
        // Loaded on mount so the page stays out of every page-load bundle.
        const [[coreStart], { renderInspector }] = await Promise.all([
          core.getStartServices(),
          import('./application/render_inspector'),
        ]);
        return renderInspector({ coreStart, element });
      },
    });
  }

  public start(): void {}
}
