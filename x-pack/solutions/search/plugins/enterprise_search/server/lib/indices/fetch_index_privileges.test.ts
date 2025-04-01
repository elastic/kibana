/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import { fetchIndexPrivileges } from './fetch_index_privileges';

describe('fetchIndexPrivileges lib function', () => {
  const mockClient = {
    asCurrentUser: {
      security: {
        hasPrivileges: jest.fn(),
      },
    },
  };

  it('returns read, manage privileges for index and alias names provided', async () => {
    mockClient.asCurrentUser.security.hasPrivileges.mockImplementation(() => ({
      index: {
        index1: { manage: true, read: true },
        index2: { manage: false, read: true },
      },
    }));

    const indexAndAliasNames = ['index1', 'index2'];

    await expect(
      fetchIndexPrivileges(mockClient as unknown as IScopedClusterClient, indexAndAliasNames)
    ).resolves.toEqual({
      index1: { manage: true, read: true },
      index2: { manage: false, read: true },
    });
  });
});
