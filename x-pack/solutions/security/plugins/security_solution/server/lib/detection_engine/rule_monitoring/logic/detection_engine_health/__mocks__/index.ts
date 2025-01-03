/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  clusterHealthSnapshotMock,
  ruleHealthSnapshotMock,
  spaceHealthSnapshotMock,
} from '../../../../../../../common/api/detection_engine/rule_monitoring/mocks';

import type { IDetectionEngineHealthClient } from '../detection_engine_health_client_interface';

type CalculateRuleHealth = IDetectionEngineHealthClient['calculateRuleHealth'];
type CalculateSpaceHealth = IDetectionEngineHealthClient['calculateSpaceHealth'];
type CalculateClusterHealth = IDetectionEngineHealthClient['calculateClusterHealth'];
type InstallAssetsForMonitoringHealth =
  IDetectionEngineHealthClient['installAssetsForMonitoringHealth'];

export const detectionEngineHealthClientMock = {
  create: (): jest.Mocked<IDetectionEngineHealthClient> => ({
    calculateRuleHealth: jest
      .fn<ReturnType<CalculateRuleHealth>, Parameters<CalculateRuleHealth>>()
      .mockResolvedValue(ruleHealthSnapshotMock.getEmptyRuleHealthSnapshot()),

    calculateSpaceHealth: jest
      .fn<ReturnType<CalculateSpaceHealth>, Parameters<CalculateSpaceHealth>>()
      .mockResolvedValue(spaceHealthSnapshotMock.getEmptySpaceHealthSnapshot()),

    calculateClusterHealth: jest
      .fn<ReturnType<CalculateClusterHealth>, Parameters<CalculateClusterHealth>>()
      .mockResolvedValue(clusterHealthSnapshotMock.getEmptyClusterHealthSnapshot()),

    installAssetsForMonitoringHealth: jest
      .fn<
        ReturnType<InstallAssetsForMonitoringHealth>,
        Parameters<InstallAssetsForMonitoringHealth>
      >()
      .mockResolvedValue(),
  }),
};
