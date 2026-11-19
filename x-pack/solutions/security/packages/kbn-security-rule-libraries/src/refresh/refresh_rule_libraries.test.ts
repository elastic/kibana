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

const client = { update: jest.fn() } as unknown as SavedObjectsClientContract;
const packages = {} as PackageClient;
const logger = {} as Logger;

describe('refreshRuleLibraries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(refreshLibraryById)
      .mockImplementation(async ({ id }) => ({ id, outcome: 'refreshed', version: '1.0.0' }));
  });

  it('refreshes every library by default', async () => {
    const { results } = await refreshRuleLibraries({ client, packages, logger });

    expect(results.map(({ id }) => id)).toEqual([ELASTIC_LIBRARY_ID, COMMUNITY_LIBRARY_ID]);
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
