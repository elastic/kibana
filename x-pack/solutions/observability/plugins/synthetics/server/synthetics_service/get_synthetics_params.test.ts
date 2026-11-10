/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SyntheticsServerSetup } from '../types';
import { getSyntheticsParams } from './get_synthetics_params';
import { mockEncryptedSO } from './utils/mocks';

const getServer = (encryptedSavedObjects: ReturnType<typeof mockEncryptedSO>) =>
  ({ encryptedSavedObjects } as unknown as SyntheticsServerSetup);

describe('getSyntheticsParams', () => {
  it('returns the params for all spaces', async () => {
    const server = getServer(
      mockEncryptedSO({
        params: [
          {
            attributes: { key: 'username', value: 'elastic' },
            namespaces: ['*'],
          },
        ],
      })
    );

    const params = await getSyntheticsParams(server);

    expect(params).toEqual({
      '*': {
        username: 'elastic',
      },
    });
  });

  it('returns the params for specific space', async () => {
    const server = getServer(
      mockEncryptedSO({
        params: [
          {
            attributes: { key: 'username', value: 'elastic' },
            namespaces: ['*'],
          },
        ],
      })
    );

    const params = await getSyntheticsParams(server, { spaceId: 'default' });

    expect(params).toEqual({
      '*': {
        username: 'elastic',
      },
      default: {
        username: 'elastic',
      },
    });
  });

  it('returns the space limited params', async () => {
    const server = getServer(
      mockEncryptedSO({
        params: [
          {
            attributes: { key: 'username', value: 'elastic' },
            namespaces: ['default'],
          },
        ],
      })
    );

    const params = await getSyntheticsParams(server, { spaceId: 'default' });

    expect(params).toEqual({
      default: {
        username: 'elastic',
      },
    });
  });

  it('returns the params from mixed spaces', async () => {
    const server = getServer(
      mockEncryptedSO({
        params: [
          {
            attributes: { key: 'username', value: 'elastic' },
            namespaces: ['default'],
          },
          {
            attributes: { key: 'username-shared', value: 'elastic' },
            namespaces: ['*'],
          },
          {
            attributes: { key: 'username-test-space', value: 'elastic' },
            namespaces: ['test'],
          },
        ],
      })
    );

    const params = await getSyntheticsParams(server, { spaceId: 'default' });

    expect(params).toEqual({
      '*': {
        'username-shared': 'elastic',
      },
      default: {
        username: 'elastic',
        'username-shared': 'elastic',
      },
      test: {
        'username-shared': 'elastic',
        'username-test-space': 'elastic',
      },
    });
  });
});
