/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/public';
import { UX_OVERVIEW_PANEL_EMBEDDABLE_ID } from '../../common/embeddables/overview_panel/constants';
import type { ApmPluginSetupDeps, ApmPluginStartDeps } from '../plugin';

export const registerUxEmbeddables = (
  core: CoreSetup<ApmPluginStartDeps>,
  plugins: ApmPluginSetupDeps
): void => {
  plugins.embeddable.registerEmbeddablePublicDefinition(
    UX_OVERVIEW_PANEL_EMBEDDABLE_ID,
    async () => {
      const [{ getUxOverviewPanelEmbeddableFactory }, [coreStart, pluginsStart]] =
        await Promise.all([import('./overview_panel/factory'), core.getStartServices()]);
      return getUxOverviewPanelEmbeddableFactory({
        coreStart,
        pluginsStart,
      });
    }
  );
};
