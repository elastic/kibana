/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { OBSERVABILITY_PROFILING_PROJECT_SETTINGS } from '@kbn/serverless-observability-settings';
import { ServerlessObservabilityPlugin } from './plugin';
import type { SetupDependencies } from './types';

describe('ServerlessObservabilityPlugin', () => {
  describe('setup — profiling project-setting allowlist', () => {
    const getProjectSettings = (profiling?: SetupDependencies['profiling']) =>
      new Promise<string[]>((resolve) => {
        const plugin = new ServerlessObservabilityPlugin(coreMock.createPluginInitializerContext());
        plugin.setup(coreMock.createSetup(), {
          serverless: { setupProjectSettings: resolve },
          profiling,
        } as unknown as SetupDependencies);
      });

    it('includes the profiling project settings when the profiling plugin is enabled', async () => {
      const projectSettings = await getProjectSettings({});

      expect(projectSettings).toEqual(
        expect.arrayContaining(OBSERVABILITY_PROFILING_PROJECT_SETTINGS)
      );
    });

    it('omits the profiling project settings when the profiling plugin is disabled', async () => {
      const projectSettings = await getProjectSettings();

      OBSERVABILITY_PROFILING_PROJECT_SETTINGS.forEach((setting) =>
        expect(projectSettings).not.toContain(setting)
      );
    });
  });
});
