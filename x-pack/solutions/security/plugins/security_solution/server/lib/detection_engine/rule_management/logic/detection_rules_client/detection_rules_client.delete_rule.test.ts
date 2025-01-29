/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientMock } from '@kbn/alerting-plugin/server/mocks';
import type { ActionsClient } from '@kbn/actions-plugin/server';

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { buildMlAuthz } from '../../../../machine_learning/authz';
import { createDetectionRulesClient } from './detection_rules_client';
import type { IDetectionRulesClient } from './detection_rules_client_interface';
import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';
import { createProductFeaturesServiceMock } from '../../../../product_features_service/mocks';
import type { ExperimentalFeatures } from '../../../../../../common';

jest.mock('../../../../machine_learning/authz');

describe('DetectionRulesClient.deleteRule', () => {
  let rulesClient: ReturnType<typeof rulesClientMock.create>;
  let detectionRulesClient: IDetectionRulesClient;

  const mlAuthz = (buildMlAuthz as jest.Mock)();
  let actionsClient: jest.Mocked<ActionsClient>;

  beforeEach(() => {
    rulesClient = rulesClientMock.create();
    const savedObjectsClient = savedObjectsClientMock.create();
    detectionRulesClient = createDetectionRulesClient({
      actionsClient,
      rulesClient,
      mlAuthz,
      savedObjectsClient,
      license: licenseMock.createLicenseMock(),
      experimentalFeatures: { prebuiltRulesCustomizationEnabled: true } as ExperimentalFeatures,
      productFeaturesService: createProductFeaturesServiceMock(),
    });
  });

  it('should call rulesClient.delete passing the expected ruleId', async () => {
    const ruleId = 'ruleId';
    await detectionRulesClient.deleteRule({
      ruleId,
    });

    expect(rulesClient.delete).toHaveBeenCalledWith({ id: ruleId });
  });
});
