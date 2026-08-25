/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';
import type { PublicRuleResultService } from '@kbn/alerting-plugin/server/types';

import { createMockConfig } from '../../../../../../config.mock';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../../../../plugin_contract';
import { LogLevelSetting } from '../../../../../../../common/api/detection_engine/rule_monitoring';
import { fetchRuleExecutionSettings } from './fetch_rule_execution_settings';

const config = createMockConfig();
const logger = loggingSystemMock.createLogger();
const savedObjectsClient = savedObjectsClientMock.create();

// The message shape production actually records for UIAM's APIKEY_MISSING: the stringified
// Elasticsearch security_exception, carrying the phrase the alerting plugin's
// isMissingUiamApiKeyMessage matches on.
const UIAM_KEY_MISSING_ERROR = new Error(
  [
    'security_exception',
    '\tCaused by:',
    '\t\tsecurity_exception: failed to authenticate cloud API key: [0x28D520]',
  ].join('\n')
);

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

  const ruleResultService = {
    addLastRunError: jest.fn(),
    addLastRunWarning: jest.fn(),
    setLastRunOutcomeMessage: jest.fn(),
  };

  return {
    core: core as unknown as SecuritySolutionPluginCoreSetupDependencies,
    ruleResultService: ruleResultService as PublicRuleResultService as PublicRuleResultService & {
      addLastRunError: jest.Mock;
    },
  };
};

beforeEach(() => jest.clearAllMocks());

describe('fetchRuleExecutionSettings()', () => {
  test('reads the settings without recording anything on a healthy fetch', async () => {
    const { core, ruleResultService } = setup();

    const settings = await fetchRuleExecutionSettings(
      config,
      logger,
      core,
      savedObjectsClient,
      ruleResultService
    );

    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(logger.error).not.toHaveBeenCalled();
    expect(ruleResultService.addLastRunError).not.toHaveBeenCalled();
  });

  test('records a run error when the fetch fails because UIAM no longer knows the API key', async () => {
    const { core, ruleResultService } = setup({ error: UIAM_KEY_MISSING_ERROR });

    const settings = await fetchRuleExecutionSettings(
      config,
      logger,
      core,
      savedObjectsClient,
      ruleResultService
    );

    // Still falls back to defaults: the run itself should proceed as before...
    expect(settings).toEqual(DEFAULT_SETTINGS);
    // ...but the rejection is recorded, so the run fails visibly and the alerting task runner's
    // UIAM API key repair can see it.
    expect(ruleResultService.addLastRunError).toHaveBeenCalledWith(
      `Error fetching rule execution settings: ${UIAM_KEY_MISSING_ERROR.message}`
    );
  });

  test('keeps every other failure silent, as before', async () => {
    const { core, ruleResultService } = setup({ error: new Error('uiSettings unavailable') });

    const settings = await fetchRuleExecutionSettings(
      config,
      logger,
      core,
      savedObjectsClient,
      ruleResultService
    );

    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(logger.error).toHaveBeenCalled();
    expect(ruleResultService.addLastRunError).not.toHaveBeenCalled();
  });

  test('tolerates callers that do not provide a rule result service', async () => {
    const { core } = setup({ error: UIAM_KEY_MISSING_ERROR });

    await expect(
      fetchRuleExecutionSettings(config, logger, core, savedObjectsClient)
    ).resolves.toEqual(DEFAULT_SETTINGS);
  });
});
