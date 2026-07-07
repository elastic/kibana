/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { ApiEndpointId } from '../../../common/api_endpoints';
import { createVerificationStore } from './verification_store';
import { createVerificationForKey } from './create_verification_for_key';

describe('createVerificationForKey', () => {
  it('registers a session and skips the watch when config is missing', async () => {
    const store = createVerificationStore({ now: () => 0 });
    const registerWatch = jest.fn();
    const result = await createVerificationForKey(
      { store, registerWatch, logger: loggerMock.create() },
      {
        apiKeyId: 'key-1',
        endpointId: ApiEndpointId.Elasticsearch,
        apiEndpointsConfig: {},
      }
    );

    expect(result.verificationId).toMatch(/^obs-onb-/);
    expect(result.detectionActive).toBe(false);
    expect(registerWatch).not.toHaveBeenCalled();
    const session = store.getByVerificationId(result.verificationId);
    expect(session?.ingestPath).toBe('managed_es_bulk');
    expect(session?.signal).toBe('logs');
  });

  it('registers the watch and marks detectionActive when it succeeds', async () => {
    const store = createVerificationStore({ now: () => 0 });
    const registerWatch = jest.fn().mockResolvedValue(true);
    const result = await createVerificationForKey(
      { store, registerWatch, logger: loggerMock.create() },
      {
        apiKeyId: 'key-1',
        endpointId: ApiEndpointId.Elasticsearch,
        apiEndpointsConfig: {
          collectorWatchUrl: 'https://collector.example',
          kibanaToCollectorToken: 'k2c',
        },
        cloudSetup: { deploymentId: 'dep-1' },
      }
    );

    expect(registerWatch).toHaveBeenCalledWith(
      expect.objectContaining({
        collectorWatchUrl: 'https://collector.example',
        token: 'k2c',
        body: expect.objectContaining({
          targetType: 'hosted',
          targetId: 'dep-1',
          apiKeyId: 'key-1',
          verificationId: result.verificationId,
        }),
      })
    );
    expect(result.detectionActive).toBe(true);
    expect(store.getByVerificationId(result.verificationId)?.detectionActive).toBe(true);
  });

  it('leaves detectionActive false when watch registration fails', async () => {
    const store = createVerificationStore({ now: () => 0 });
    const registerWatch = jest.fn().mockResolvedValue(false);
    const result = await createVerificationForKey(
      { store, registerWatch, logger: loggerMock.create() },
      {
        apiKeyId: 'key-1',
        endpointId: ApiEndpointId.Elasticsearch,
        apiEndpointsConfig: {
          collectorWatchUrl: 'https://collector.example',
          kibanaToCollectorToken: 'k2c',
        },
        cloudSetup: { deploymentId: 'dep-1' },
      }
    );
    expect(result.detectionActive).toBe(false);
  });
});
