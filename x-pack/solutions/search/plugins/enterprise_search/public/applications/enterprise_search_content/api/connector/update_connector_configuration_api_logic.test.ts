/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHttpValues } from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { postConnectorConfiguration } from './update_connector_configuration_api_logic';

describe('updateConnectorConfigurationLogic', () => {
  const { http } = mockHttpValues;
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('postConnectorConfiguration', () => {
    it('calls correct api', async () => {
      const promise = Promise.resolve('result');
      http.post.mockReturnValue(promise);
      const configuration = { configurationKey: 'yeahhhh' };
      const result = postConnectorConfiguration({
        configuration,
        connectorId: 'anIndexId',
      });
      await nextTick();
      expect(http.post).toHaveBeenCalledWith(
        '/internal/enterprise_search/connectors/anIndexId/configuration',
        { body: JSON.stringify(configuration) }
      );
      await expect(result).resolves.toEqual({ configuration: 'result' });
    });
  });
});
