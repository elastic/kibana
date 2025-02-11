/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { getRiskInputsIndex } from './get_risk_inputs_index';
import { buildDataViewResponseMock } from './get_risk_inputs_index.mock';

describe('getRiskInputsIndex', () => {
  let soClient: SavedObjectsClientContract;
  let logger: Logger;

  beforeEach(() => {
    soClient = savedObjectsClientMock.create();
    logger = loggingSystemMock.create().get('security_solution');
  });

  it('returns an index and runtimeMappings for an existing dataView', async () => {
    (soClient.get as jest.Mock).mockResolvedValueOnce(buildDataViewResponseMock());
    const {
      id,
      attributes: { runtimeFieldMap, title },
    } = buildDataViewResponseMock();

    const { index, runtimeMappings } = await getRiskInputsIndex({
      dataViewId: id,
      logger,
      soClient,
    });

    expect(index).toEqual(title);
    expect(runtimeMappings).toEqual(JSON.parse(runtimeFieldMap as string));
  });

  it('returns the index and empty runtimeMappings for a nonexistent dataView', async () => {
    const { index, runtimeMappings } = await getRiskInputsIndex({
      dataViewId: 'my-data-view',
      logger,
      soClient,
    });
    expect(index).toEqual('my-data-view');
    expect(runtimeMappings).toEqual({});
  });

  it('logs that the dataview was not found', async () => {
    await getRiskInputsIndex({
      dataViewId: 'my-data-view',
      logger,
      soClient,
    });
    expect(logger.info).toHaveBeenCalledWith(
      "No dataview found for ID 'my-data-view'; using ID instead as simple index pattern"
    );
  });
});
