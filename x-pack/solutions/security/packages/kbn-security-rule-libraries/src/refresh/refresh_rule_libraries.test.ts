/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { PackageClient } from '@kbn/fleet-plugin/server';
import { COMMUNITY_LIBRARY_ID, ELASTIC_LIBRARY_ID } from '../constants';
import { RULE_LIBRARY_DEFINITIONS } from '../definitions';
import { ensureLibraries } from './ensure_libraries';
import { refreshRuleLibraries } from './refresh_rule_libraries';
import { refreshLibraryById } from './refresh_library_by_id';

jest.mock('./ensure_libraries');
jest.mock('./refresh_library_by_id');

const client = {
  update: jest.fn(),
  find: jest.fn(),
} as unknown as SavedObjectsClientContract;
const packages = {} as PackageClient;
const logger = {} as Logger;

describe('refreshRuleLibraries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(client.find).mockResolvedValue({
      saved_objects: [
        { id: 'custom-library' },
        { id: COMMUNITY_LIBRARY_ID },
        { id: ELASTIC_LIBRARY_ID },
      ],
    } as never);
    jest
      .mocked(refreshLibraryById)
      .mockImplementation(async ({ id }) => ({ id, outcome: 'refreshed', version: '1.0.0' }));
  });

  it('refreshes every library that exists by default, the built-in ones first', async () => {
    const { results } = await refreshRuleLibraries({ client, packages, logger });

    expect(results.map(({ id }) => id)).toEqual([
      ELASTIC_LIBRARY_ID,
      COMMUNITY_LIBRARY_ID,
      'custom-library',
    ]);
  });

  it('refreshes a library that is not one of the built-in definitions when it is asked for', async () => {
    const { results } = await refreshRuleLibraries({
      client,
      packages,
      logger,
      libraryIds: ['custom-library'],
    });

    expect(results.map(({ id }) => id)).toEqual(['custom-library']);
    expect(client.find).not.toHaveBeenCalled();
  });

  it('hands the secret lookup on to every refresh', async () => {
    const getSecret = jest.fn();

    await refreshRuleLibraries({
      client,
      packages,
      logger,
      libraryIds: ['custom-library'],
      getSecret,
    });

    expect(refreshLibraryById).toHaveBeenCalledWith(expect.objectContaining({ getSecret }));
  });

  it('creates every library object but refreshes only the listed libraries', async () => {
    const { results, elastic } = await refreshRuleLibraries({
      client,
      packages,
      logger,
      libraryIds: [ELASTIC_LIBRARY_ID],
    });

    expect(ensureLibraries).toHaveBeenCalledWith(
      expect.objectContaining({ definitions: RULE_LIBRARY_DEFINITIONS })
    );
    expect(results.map(({ id }) => id)).toEqual([ELASTIC_LIBRARY_ID]);
    expect(elastic).toEqual({
      status: 'installed',
      package: { name: 'security_detection_engine', version: '1.0.0' },
    });
  });
});
