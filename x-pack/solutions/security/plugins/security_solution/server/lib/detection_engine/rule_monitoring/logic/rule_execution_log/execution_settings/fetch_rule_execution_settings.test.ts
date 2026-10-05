/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';

import { createMockConfig } from '../../../../../../config.mock';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../../../../plugin_contract';
import { LogLevelSetting } from '../../../../../../../common/api/detection_engine/rule_monitoring';
import { fetchRuleExecutionSettings } from './fetch_rule_execution_settings';

const config = createMockConfig();
const logger = loggingSystemMock.createLogger();
const savedObjectsClient = savedObjectsClientMock.create();

const DEFAULT_SETTINGS = {
  extendedLogging: { isEnabled: false, minLevel: LogLevelSetting.off },
};

const setup = ({ error }: { error?: Error } = {}) => {
  const core = coreMock.createSetup();
  const coreStart = coreMock.createStart();
  const uiSettingsClient = uiSettingsServiceMock.createClient();

  uiSettingsClient.getAll.mockResolvedValue({});
  coreStart.uiSettings.asScopedToClient.mockReturnValue(uiSettingsClient);
  if (error) {
    core.getStartServices.mockRejectedValue(error);
  } else {
    core.getStartServices.mockResolvedValue([coreStart, {}, {}] as unknown as Awaited<
      ReturnType<SecuritySolutionPluginCoreSetupDependencies['getStartServices']>
    >);
  }

  return {
    core: core as unknown as SecuritySolutionPluginCoreSetupDependencies,
  };
};

beforeEach(() => jest.clearAllMocks());

describe('fetchRuleExecutionSettings()', () => {
  test('reads the settings on a healthy fetch', async () => {
    const { core } = setup();

    const settings = await fetchRuleExecutionSettings(config, logger, core, savedObjectsClient);

    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(logger.error).not.toHaveBeenCalled();
  });

  test('falls back to defaults when the fetch fails', async () => {
    const { core } = setup({ error: new Error('uiSettings unavailable') });

    const settings = await fetchRuleExecutionSettings(config, logger, core, savedObjectsClient);

    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(logger.error).toHaveBeenCalled();
  });
});
