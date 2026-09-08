/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/server';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-server';

import { isWorkflowsEnabledForSpace } from '.';

const FEATURE_FLAG_KEY = 'securitySolution.attackDiscoveryWorkflowsEnabled';
const UI_SETTING_KEY = 'securitySolution:enableAttackDiscoveryWorkflows';

const buildFeatureFlags = (value: boolean): CoreStart['featureFlags'] =>
  ({
    getBooleanValue: jest.fn().mockResolvedValue(value),
  } as unknown as CoreStart['featureFlags']);

const buildUiSettingsClient = (value: boolean): IUiSettingsClient =>
  ({
    get: jest.fn().mockResolvedValue(value),
  } as unknown as IUiSettingsClient);

describe('isWorkflowsEnabledForSpace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns false when FF is off and per-space setting is off', async () => {
    const result = await isWorkflowsEnabledForSpace({
      featureFlags: buildFeatureFlags(false),
      uiSettingsClient: buildUiSettingsClient(false),
    });

    expect(result).toBe(false);
  });

  it('returns false when FF is off and per-space setting is on', async () => {
    const result = await isWorkflowsEnabledForSpace({
      featureFlags: buildFeatureFlags(false),
      uiSettingsClient: buildUiSettingsClient(true),
    });

    expect(result).toBe(false);
  });

  it('returns false when FF is on and per-space setting is off', async () => {
    const result = await isWorkflowsEnabledForSpace({
      featureFlags: buildFeatureFlags(true),
      uiSettingsClient: buildUiSettingsClient(false),
    });

    expect(result).toBe(false);
  });

  it('returns true when FF is on and per-space setting is on', async () => {
    const result = await isWorkflowsEnabledForSpace({
      featureFlags: buildFeatureFlags(true),
      uiSettingsClient: buildUiSettingsClient(true),
    });

    expect(result).toBe(true);
  });

  it('does not read the uiSetting when FF is off (short-circuits)', async () => {
    const uiSettingsClient = buildUiSettingsClient(true);

    await isWorkflowsEnabledForSpace({
      featureFlags: buildFeatureFlags(false),
      uiSettingsClient,
    });

    expect(uiSettingsClient.get).not.toHaveBeenCalled();
  });

  it('reads the correct uiSetting key', async () => {
    const uiSettingsClient = buildUiSettingsClient(true);

    await isWorkflowsEnabledForSpace({
      featureFlags: buildFeatureFlags(true),
      uiSettingsClient,
    });

    expect(uiSettingsClient.get).toHaveBeenCalledWith(UI_SETTING_KEY);
  });

  it('reads the correct feature flag key', async () => {
    const featureFlags = buildFeatureFlags(true);
    const uiSettingsClient = buildUiSettingsClient(true);

    await isWorkflowsEnabledForSpace({ featureFlags, uiSettingsClient });

    expect(featureFlags.getBooleanValue).toHaveBeenCalledWith(FEATURE_FLAG_KEY, expect.anything());
  });

  it('returns false when uiSetting returns null', async () => {
    const uiSettingsClient = {
      get: jest.fn().mockResolvedValue(null),
    } as unknown as IUiSettingsClient;

    const result = await isWorkflowsEnabledForSpace({
      featureFlags: buildFeatureFlags(true),
      uiSettingsClient,
    });

    expect(result).toBe(false);
  });
});
