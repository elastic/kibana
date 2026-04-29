/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { requestContextMock } from '../../detection_engine/routes/__mocks__';
import { AssetCriticalityDataClient } from './asset_criticality_data_client';
import { checkAndInitAssetCriticalityResources } from './check_and_init_asset_criticality_resources';

describe('checkAndInitAssetCriticalityResources', () => {
  const logger = loggingSystemMock.createLogger();
  const { context } = requestContextMock.createTools();
  const doesIndexExist = jest.spyOn(AssetCriticalityDataClient.prototype, 'doesIndexExist');
  const initAssetCriticality = jest.spyOn(AssetCriticalityDataClient.prototype, 'init');

  beforeEach(() => {
    doesIndexExist.mockImplementation(() => Promise.resolve(false));
    initAssetCriticality.mockImplementation(() => Promise.resolve());
  });

  afterEach(() => {
    doesIndexExist.mockReset();
    initAssetCriticality.mockReset();
  });

  it('should initialise asset criticality resources if they do not exist', async () => {
    await checkAndInitAssetCriticalityResources(requestContextMock.convertContext(context), logger);

    expect(initAssetCriticality).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('Asset criticality resources installed');
  });

  it('should not initialise asset criticality resources if they already exist', async () => {
    doesIndexExist.mockImplementationOnce(() => Promise.resolve(true));
    await checkAndInitAssetCriticalityResources(requestContextMock.convertContext(context), logger);

    expect(initAssetCriticality).not.toHaveBeenCalled();
  });
});
