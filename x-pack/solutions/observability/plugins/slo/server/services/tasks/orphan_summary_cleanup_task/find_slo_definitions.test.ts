/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import { findSloDefinitionMap, getKey } from './find_slo_definitions';
import { SO_SLO_TYPE } from '../../../saved_objects';

describe('findSloDefinitionMap', () => {
  let soClient: jest.Mocked<SavedObjectsClientContract>;
  let logger: jest.Mocked<MockedLogger>;

  beforeEach(() => {
    soClient = savedObjectsClientMock.create();
    logger = loggerMock.create();
  });

  it('returns an empty map without calling soClient when no ids are given', async () => {
    const result = await findSloDefinitionMap([], { soClient: soClient as any, logger });

    expect(result.size).toBe(0);
    expect(soClient.find).not.toHaveBeenCalled();
  });

  it('queries across ALL spaces so SLOs in non-default spaces are not mistaken for orphans', async () => {
    soClient.find.mockResolvedValueOnce({
      total: 1,
      saved_objects: [{ id: 'so-1', attributes: { id: 'a-slo-id', revision: 1, enabled: true } }],
      page: 1,
      per_page: 1,
    } as any);

    await findSloDefinitionMap(['a-slo-id'], { soClient: soClient as any, logger });

    expect(soClient.find).toHaveBeenCalledWith(
      expect.objectContaining({
        type: SO_SLO_TYPE,
        namespaces: [ALL_SPACES_ID],
      })
    );
  });

  it('projects only the fields needed for orphan classification', async () => {
    soClient.find.mockResolvedValueOnce({
      total: 0,
      saved_objects: [],
      page: 1,
      per_page: 1,
    } as any);

    await findSloDefinitionMap(['a-slo-id'], { soClient: soClient as any, logger });

    expect(soClient.find).toHaveBeenCalledWith(
      expect.objectContaining({
        fields: ['id', 'revision', 'enabled'],
      })
    );
  });

  it('builds a KQL filter that matches any of the requested ids', async () => {
    soClient.find.mockResolvedValueOnce({
      total: 0,
      saved_objects: [],
      page: 1,
      per_page: 2,
    } as any);

    await findSloDefinitionMap(['slo-a', 'slo-b'], { soClient: soClient as any, logger });

    expect(soClient.find).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: `slo.attributes.id:(slo-a or slo-b)`,
        perPage: 2,
      })
    );
  });

  it('indexes entries by `${id}:::${revision}` so transforms can match by both', async () => {
    soClient.find.mockResolvedValueOnce({
      total: 2,
      saved_objects: [
        { id: 'so-1', attributes: { id: 'slo-a', revision: 1, enabled: true } },
        { id: 'so-2', attributes: { id: 'slo-b', revision: 2, enabled: false } },
      ],
      page: 1,
      per_page: 2,
    } as any);

    const result = await findSloDefinitionMap(['slo-a', 'slo-b'], {
      soClient: soClient as any,
      logger,
    });

    expect(result.get(getKey({ id: 'slo-a', revision: 1 }))).toEqual({
      id: 'slo-a',
      revision: 1,
      enabled: true,
    });
    expect(result.get(getKey({ id: 'slo-b', revision: 2 }))).toEqual({
      id: 'slo-b',
      revision: 2,
      enabled: false,
    });
    // Different revisions are different entries: looking up the same id with a
    // different revision must miss, otherwise old-revision transforms would
    // never be cleaned up.
    expect(result.has(getKey({ id: 'slo-a', revision: 2 }))).toBe(false);
    expect(result.has(getKey({ id: 'slo-b', revision: 1 }))).toBe(false);
  });

  it('propagates errors from soClient.find so the caller can abort instead of deleting transforms', async () => {
    soClient.find.mockRejectedValueOnce(new Error('saved objects index unavailable'));

    await expect(
      findSloDefinitionMap(['slo-a'], { soClient: soClient as any, logger })
    ).rejects.toThrow('saved objects index unavailable');
  });
});
