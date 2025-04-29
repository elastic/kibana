/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getAPIKeyForSyntheticsService,
  getServiceApiKeyPrivileges,
  syntheticsIndex,
} from './get_api_key';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import { coreMock } from '@kbn/core/server/mocks';
import { syntheticsServiceApiKey } from '../saved_objects/service_api_key';
import { KibanaRequest } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';

import * as authUtils from './authentication/check_has_privilege';
import { SyntheticsServerSetup } from '../types';
import { getUptimeESMockClient } from '../queries/test_helpers';

describe('getAPIKeyTest', function () {
  const core = coreMock.createStart();
  const security = securityMock.createStart();
  const encryptedSavedObjects = encryptedSavedObjectsMock.createStart();
  const request = {} as KibanaRequest;

  const logger = loggerMock.create();

  const server = {
    logger,
    security,
    encryptedSavedObjects,
    savedObjectsClient: core.savedObjects.getScopedClient(request),
    syntheticsEsClient: getUptimeESMockClient().syntheticsEsClient,
  } as unknown as SyntheticsServerSetup;

  security.authc.apiKeys.areAPIKeysEnabled = jest.fn().mockReturnValue(true);
  security.authc.apiKeys.validate = jest.fn().mockReturnValue(true);
  security.authc.apiKeys.create = jest.fn().mockReturnValue({
    id: 'test',
    name: 'service-api-key',
    api_key: 'qwerty',
    encoded: '@#$%^&',
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(authUtils, 'checkHasPrivileges').mockResolvedValue({
      index: {
        [syntheticsIndex]: {
          auto_configure: true,
          create_doc: true,
          view_index_metadata: true,
          read: true,
        },
      },
    } as any);
  });

  it('should return existing api key', async () => {
    const getObject = jest
      .fn()
      .mockReturnValue({ attributes: { apiKey: 'qwerty', id: 'test', name: 'service-api-key' } });

    encryptedSavedObjects.getClient = jest.fn().mockReturnValue({
      getDecryptedAsInternalUser: getObject,
    });
    const apiKey = await getAPIKeyForSyntheticsService({
      server,
    });

    expect(apiKey).toEqual({
      apiKey: { apiKey: 'qwerty', id: 'test', name: 'service-api-key' },
      isValid: true,
    });

    expect(encryptedSavedObjects.getClient).toHaveBeenCalledTimes(1);
    expect(getObject).toHaveBeenCalledTimes(1);
    expect(encryptedSavedObjects.getClient).toHaveBeenCalledWith({
      includedHiddenTypes: [syntheticsServiceApiKey.name],
    });
    expect(getObject).toHaveBeenCalledWith(
      'uptime-synthetics-api-key',
      'ba997842-b0cf-4429-aa9d-578d9bf0d391'
    );
  });

  it.each([
    [true, ['monitor', 'read_pipeline']],
    [false, ['monitor', 'read_pipeline', 'read_ilm']],
  ])(
    'Includes/excludes `read_ilm` priv when serverless is mode is %s',
    (isServerlessEs, expectedClusterPrivs) => {
      const { cluster } = getServiceApiKeyPrivileges(isServerlessEs);

      expect(cluster).toEqual(expectedClusterPrivs);
    }
  );

  it('invalidates api keys with missing read permissions', async () => {
    jest.spyOn(authUtils, 'checkHasPrivileges').mockResolvedValue({
      index: {
        [syntheticsIndex]: {
          auto_configure: true,
          create_doc: true,
          view_index_metadata: true,
          read: false,
        },
      },
    } as any);

    const getObject = jest
      .fn()
      .mockReturnValue({ attributes: { apiKey: 'qwerty', id: 'test', name: 'service-api-key' } });

    encryptedSavedObjects.getClient = jest.fn().mockReturnValue({
      getDecryptedAsInternalUser: getObject,
    });
    const apiKey = await getAPIKeyForSyntheticsService({
      server,
    });

    expect(apiKey).toEqual({
      apiKey: { apiKey: 'qwerty', id: 'test', name: 'service-api-key' },
      isValid: false,
    });

    expect(encryptedSavedObjects.getClient).toHaveBeenCalledTimes(1);
    expect(getObject).toHaveBeenCalledTimes(1);
    expect(encryptedSavedObjects.getClient).toHaveBeenCalledWith({
      includedHiddenTypes: [syntheticsServiceApiKey.name],
    });
    expect(getObject).toHaveBeenCalledWith(
      'uptime-synthetics-api-key',
      'ba997842-b0cf-4429-aa9d-578d9bf0d391'
    );
  });
});
