/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import type { SetupDependencies } from './types';
import { ServerlessWorkplaceAIPlugin } from './plugin';

// Literal id of `ai:anonymizationSettings` (`AI_ANONYMIZATION_SETTINGS` in `@kbn/management-settings-ids`).
const AI_ANONYMIZATION_SETTINGS_ID = 'ai:anonymizationSettings';

describe('ServerlessWorkplaceAIPlugin', () => {
  describe('setup', () => {
    it('allowlists the AI anonymization setting so it is editable in Advanced Settings', () => {
      const plugin = new ServerlessWorkplaceAIPlugin(
        coreMock.createPluginInitializerContext({ enabled: true })
      );
      const serverless = { setupProjectSettings: jest.fn() };

      plugin.setup(coreMock.createSetup(), {
        serverless,
      } as unknown as SetupDependencies);

      expect(serverless.setupProjectSettings).toHaveBeenCalledTimes(1);
      const [settings] = serverless.setupProjectSettings.mock.calls[0];
      expect(settings).toContain(AI_ANONYMIZATION_SETTINGS_ID);
    });
  });
});
