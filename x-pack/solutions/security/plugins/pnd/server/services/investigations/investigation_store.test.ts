/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { InvestigationStore } from './investigation_store';
import { MAPPINGS_VERSION } from './mappings';

/**
 * Migration behaviour for the move off `dynamic: true`.
 *
 * ES cannot change an existing field's type in place, so an index created under
 * dynamic mapping keeps `confidence` as `long` forever — silently truncating
 * 0.85 to 0. These indices hold demo seed data and reproducible Watch output,
 * so the chosen fix is delete-and-reseed rather than a reindex.
 */
describe('InvestigationStore index migration', () => {
  const makeEsClient = (opts: { exists: boolean; mappingsVersion?: number | 'unreadable' }) => {
    const getMapping = jest.fn().mockImplementation(({ index }: { index: string }) => {
      if (opts.mappingsVersion === 'unreadable') {
        return Promise.reject(new Error('mapping unavailable'));
      }
      // Key by the requested index — the store bootstraps five of them, and a
      // mock that only answers for one makes the rest look stale.
      return Promise.resolve({
        [index]: {
          mappings:
            opts.mappingsVersion == null
              ? {} // legacy index: created under dynamic mapping, no marker
              : { _meta: { mappingsVersion: opts.mappingsVersion } },
        },
      });
    });

    return {
      indices: {
        exists: jest.fn().mockResolvedValue(opts.exists),
        create: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue({}),
        getMapping,
      },
      count: jest.fn().mockResolvedValue({ count: 1 }), // non-empty: skip seeding
      bulk: jest.fn().mockResolvedValue({ errors: false, items: [] }),
    } as unknown as Parameters<InvestigationStore['ensureReady']>[0] & {
      indices: {
        exists: jest.Mock;
        create: jest.Mock;
        delete: jest.Mock;
        getMapping: jest.Mock;
      };
    };
  };

  const run = async (opts: { exists: boolean; mappingsVersion?: number | 'unreadable' }) => {
    const esClient = makeEsClient(opts);
    const store = new InvestigationStore(loggingSystemMock.createLogger());
    await store.ensureReady(esClient);
    return esClient;
  };

  it('creates indices with the version marker when none exist', async () => {
    const es = await run({ exists: false });

    expect(es.indices.delete).not.toHaveBeenCalled();
    expect(es.indices.create).toHaveBeenCalled();

    const [{ mappings }] = es.indices.create.mock.calls[0];
    expect(mappings._meta.mappingsVersion).toBe(MAPPINGS_VERSION);
    expect(mappings.dynamic).toBe(false);
  });

  it('leaves an index alone when its marker matches the current version', async () => {
    const es = await run({ exists: true, mappingsVersion: MAPPINGS_VERSION });

    expect(es.indices.delete).not.toHaveBeenCalled();
    expect(es.indices.create).not.toHaveBeenCalled();
  });

  it('deletes and recreates a legacy index that has no version marker', async () => {
    // The real-world case: every index created while `dynamic: true` was in use.
    const es = await run({ exists: true });

    // All five PND indices are legacy in this scenario, so all five are rebuilt.
    expect(es.indices.delete).toHaveBeenCalledTimes(5);
    expect(es.indices.create).toHaveBeenCalledTimes(5);
    expect(es.indices.delete.mock.invocationCallOrder[0]).toBeLessThan(
      es.indices.create.mock.invocationCallOrder[0]
    );
  });

  it('deletes and recreates an index stamped with an older version', async () => {
    const es = await run({ exists: true, mappingsVersion: MAPPINGS_VERSION - 1 });

    expect(es.indices.delete).toHaveBeenCalled();
    expect(es.indices.create).toHaveBeenCalled();
  });

  it('treats an unreadable mapping as stale rather than assuming it is current', async () => {
    // Fail toward recreating: querying a mis-mapped index returns wrong results
    // silently, which is worse than dropping reproducible demo data.
    const es = await run({ exists: true, mappingsVersion: 'unreadable' });

    expect(es.indices.delete).toHaveBeenCalled();
    expect(es.indices.create).toHaveBeenCalled();
  });
});
