/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSignalsMigrationStatusRequest } from '../__mocks__/request_responses';
import { getSignalsMigrationSavedObjectMock } from '../../migrations/saved_objects_schema.mock';
import { serverMock } from '../__mocks__';
import { getMigrationSavedObjectsByIndex } from '../../migrations/get_migration_saved_objects_by_index';
import { getSignalVersionsByIndex } from '../../migrations/get_signal_versions_by_index';
import { getSignalsMigrationStatusRoute } from './get_signals_migration_status_route';
import { getSignalsIndicesInRange } from '../../migrations/get_signals_indices_in_range';
import { docLinksServiceMock } from '@kbn/core/server/mocks';

jest.mock('../../migrations/get_signals_indices_in_range');
jest.mock('../../migrations/get_signal_versions_by_index');
jest.mock('../../migrations/get_migration_saved_objects_by_index');

describe('get signals migration status', () => {
  let server: ReturnType<typeof serverMock.create>;
  const docLinks = docLinksServiceMock.createSetupContract();

  beforeEach(() => {
    server = serverMock.create();
    getSignalsMigrationStatusRoute(server.router, docLinks);

    (getSignalsIndicesInRange as jest.Mock).mockResolvedValueOnce(['my-signals-index']);
    (getSignalVersionsByIndex as jest.Mock).mockResolvedValueOnce({
      'my-signals-index': [],
    });
  });

  it('returns statuses by index', async () => {
    const migration = getSignalsMigrationSavedObjectMock();
    (getMigrationSavedObjectsByIndex as jest.Mock).mockResolvedValueOnce({
      'my-signals-index': [migration],
    });

    const response = await server.inject(getSignalsMigrationStatusRequest());
    expect(response.status).toEqual(200);
    expect(response.body).toEqual({
      indices: [
        {
          index: 'my-signals-index',
          is_outdated: false,
          migrations: [
            expect.objectContaining({
              id: migration.id,
              status: migration.attributes.status,
              updated: migration.attributes.updated,
              version: migration.attributes.version,
            }),
          ],
          signal_versions: [],
          version: 0,
        },
      ],
    });
  });
});
