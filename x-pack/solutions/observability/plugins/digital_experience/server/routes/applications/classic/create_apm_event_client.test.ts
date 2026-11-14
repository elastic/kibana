/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APMEventClient } from '@kbn/apm-data-access-plugin/server';
import type { ApmDataAccessPluginSetup } from '@kbn/apm-data-access-plugin/server';
import {
  elasticsearchServiceMock,
  httpServerMock,
  savedObjectsClientMock,
  uiSettingsServiceMock,
} from '@kbn/core/server/mocks';
import { UI_SETTINGS } from '@kbn/data-plugin/server';
import { createApmEventClient } from './create_apm_event_client';

jest.mock('@kbn/apm-data-access-plugin/server', () => ({ APMEventClient: jest.fn() }));

const INDICES = { transaction: 'traces-apm*', error: 'logs-apm.error-*' };

const setup = (includeFrozen: boolean) => {
  const apmDataAccess = {
    getApmIndices: jest.fn().mockResolvedValue(INDICES),
  } as unknown as ApmDataAccessPluginSetup;
  const uiSettingsClient = uiSettingsServiceMock.createClient();
  uiSettingsClient.get.mockResolvedValue(includeFrozen);
  return {
    apmDataAccess,
    esClient: elasticsearchServiceMock.createElasticsearchClient(),
    savedObjectsClient: savedObjectsClientMock.create(),
    uiSettingsClient,
    request: httpServerMock.createKibanaRequest(),
  };
};

describe('createApmEventClient', () => {
  beforeEach(() => jest.clearAllMocks());

  it("searches the space's APM indices as the current user", async () => {
    const params = setup(false);

    await createApmEventClient(params);

    expect(params.apmDataAccess.getApmIndices).toHaveBeenCalledWith(params.savedObjectsClient);
    expect(APMEventClient).toHaveBeenCalledWith({
      indices: INDICES,
      options: { includeFrozen: false },
      debug: false,
      esClient: params.esClient,
      request: params.request,
    });
  });

  it('includes the frozen tier when the advanced setting is on', async () => {
    const params = setup(true);

    await createApmEventClient(params);

    expect(params.uiSettingsClient.get).toHaveBeenCalledWith(UI_SETTINGS.SEARCH_INCLUDE_FROZEN);
    expect(APMEventClient).toHaveBeenCalledWith(
      expect.objectContaining({ options: { includeFrozen: true } })
    );
  });
});
