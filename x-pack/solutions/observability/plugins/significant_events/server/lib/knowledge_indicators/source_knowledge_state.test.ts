/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { SourcesClient } from '@kbn/nightshift-sources-plugin/server';
import type { SourceWriteConflictReason } from '@kbn/significant-events-schema';
import { createSourceKnowledgeStateClient } from './source_knowledge_state';

type State = Parameters<
  Parameters<ReturnType<typeof createSourceKnowledgeStateClient>['runExclusive']>[0]['run']
>[0];

/** The 409 a caller sees: the status and the reason the route puts on the wire. */
const conflict = (reason: SourceWriteConflictReason) => ({
  statusCode: 409,
  data: { reason },
});

const setup = () => {
  const documents = new Map<string, { attributes: State; version: string }>();
  const key = (id: string, namespace?: string) => `${namespace}:${id}`;
  const repository = {
    get: jest.fn(async (_type: string, id: string, options: { namespace?: string }) => {
      const document = documents.get(key(id, options.namespace));
      if (!document) {
        throw SavedObjectsErrorHelpers.createGenericNotFoundError();
      }
      return document;
    }),
    create: jest.fn(
      async (_type: string, attributes: State, options: { id: string; namespace?: string }) => {
        const documentKey = key(options.id, options.namespace);
        if (documents.has(documentKey)) {
          throw SavedObjectsErrorHelpers.createConflictError(_type, 'source');
        }
        const document = { attributes, version: '1' };
        documents.set(documentKey, document);
        return document;
      }
    ),
    update: jest.fn(
      async (
        _type: string,
        id: string,
        patch: Partial<State>,
        options: { namespace?: string; version?: string }
      ) => {
        const documentKey = key(id, options.namespace);
        const current = documents.get(documentKey);
        if (!current || current.version !== options.version) {
          throw SavedObjectsErrorHelpers.createConflictError(_type, 'source');
        }
        const document = {
          attributes: { ...current.attributes, ...patch },
          version: String(Number(current.version) + 1),
        };
        documents.set(documentKey, document);
        return document;
      }
    ),
    delete: jest.fn(async (_type: string, id: string, options: { namespace?: string }) => {
      documents.delete(key(id, options.namespace));
      return {};
    }),
    createPointInTimeFinder: jest.fn(({ namespaces: [namespace] }: { namespaces: string[] }) => ({
      async *find() {
        yield {
          saved_objects: [...documents.keys()]
            .filter((documentKey) => documentKey.startsWith(`${namespace}:`))
            .map((documentKey) => ({ id: documentKey.slice(namespace.length + 1) })),
        };
      },
      close: jest.fn(),
    })),
  };
  const source = { enabled: true, esql_updated_at: 'revision-1' };
  const sourcesClient = { get: jest.fn(async () => ({ source })) } as unknown as SourcesClient;
  const clientForSpace = (space: string) =>
    createSourceKnowledgeStateClient({
      repository: repository as unknown as SavedObjectsClientContract,
      sourcesClient,
      space,
    });
  return { client: clientForSpace('default'), clientForSpace, source, documents, repository };
};

describe('source knowledge write coordination', () => {
  it('keeps cleanup out while a final write is in flight and rejects its obsolete retry', async () => {
    const { client, source } = setup();
    let releaseWrite = () => {};
    const pendingWrite = new Promise<void>((resolve) => {
      releaseWrite = resolve;
    });
    let markStarted = () => {};
    const started = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    const write = client.write({
      sourceId: 'source',
      expectedRevision: 'revision-1',
      run: async () => {
        markStarted();
        await pendingWrite;
      },
    });
    await started;
    source.esql_updated_at = 'revision-2';
    const cleanup = jest.fn(async () => {});
    await expect(client.runExclusive({ sourceId: 'source', run: cleanup })).rejects.toThrow(
      'being updated'
    );
    expect(cleanup).not.toHaveBeenCalled();
    releaseWrite();
    await write;
    await client.runExclusive({
      sourceId: 'source',
      run: async (_state, checkpoint) => {
        await cleanup();
        await checkpoint({ revision: 'revision-2' });
      },
    });
    const staleWrite = jest.fn(async () => {});
    await expect(
      client.write({ sourceId: 'source', expectedRevision: 'revision-1', run: staleWrite })
    ).rejects.toMatchObject(conflict('stale_revision'));
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(staleWrite).not.toHaveBeenCalled();
    await expect(
      client.write({
        sourceId: 'source',
        expectedRevision: 'revision-2',
        run: async () => 'new knowledge',
      })
    ).resolves.toBe('new knowledge');
  });

  it('retains the old revision and releases the lease after a failed cleanup', async () => {
    const { client, source, documents } = setup();
    await client.write({ sourceId: 'source', run: async () => {} });
    source.esql_updated_at = 'revision-2';
    await expect(
      client.runExclusive({
        sourceId: 'source',
        run: async () => {
          throw new Error('delete failed');
        },
      })
    ).rejects.toThrow('delete failed');
    expect(documents.get('default:source')?.attributes).toEqual({
      revision: 'revision-1',
      onboardingScheduled: false,
      lease: null,
    });
    await expect(client.write({ sourceId: 'source', run: async () => {} })).rejects.toMatchObject(
      conflict('reconcile_pending')
    );
  });

  it('deletes the state object of a retired source only after its cleanup succeeded', async () => {
    const { client, documents, repository } = setup();

    await expect(
      client.retire({
        sourceId: 'source',
        run: async () => {
          throw new Error('cleanup failed');
        },
      })
    ).rejects.toThrow('cleanup failed');
    expect(documents.has('default:source')).toBe(true);

    repository.delete.mockRejectedValueOnce(new Error('delete failed'));
    await expect(client.retire({ sourceId: 'source', run: async () => {} })).rejects.toThrow(
      'delete failed'
    );
    expect(documents.get('default:source')?.attributes.lease).toBeNull();

    await client.retire({ sourceId: 'source', run: async () => {} });
    expect(documents.has('default:source')).toBe(false);
  });

  it('keeps other writes out until the state object of a retired source is deleted', async () => {
    const { client, repository } = setup();
    const competingWrite = jest.fn(async () => {});
    let competingResult: Promise<void> = Promise.resolve();
    const deleteDocument = repository.delete.getMockImplementation();
    repository.delete.mockImplementationOnce(async (...args) => {
      competingResult = client.runExclusive({ sourceId: 'source', run: competingWrite });
      await competingResult.catch(() => {});
      return deleteDocument?.(...args) ?? {};
    });

    await client.retire({ sourceId: 'source', run: async () => {} });

    await expect(competingResult).rejects.toThrow('being updated');
    expect(competingWrite).not.toHaveBeenCalled();
  });

  it('isolates equal source ids in different spaces', async () => {
    const { clientForSpace, documents } = setup();
    await Promise.all(
      ['a', 'b'].map((space) =>
        clientForSpace(space).write({ sourceId: 'same-id', run: async () => {} })
      )
    );
    expect([...documents.keys()]).toEqual(['a:same-id', 'b:same-id']);
    await clientForSpace('a').write({ sourceId: 'only-in-a', run: async () => {} });
    await expect(clientForSpace('a').listSourceIds()).resolves.toEqual(['same-id', 'only-in-a']);
    await expect(clientForSpace('b').listSourceIds()).resolves.toEqual(['same-id']);
  });

  it('closes the point-in-time finder when listing the state objects fails', async () => {
    const { client, repository } = setup();
    const close = jest.fn();
    repository.createPointInTimeFinder.mockImplementationOnce(() => ({
      async *find() {
        yield { saved_objects: [{ id: 'first-page' }] };
        throw new Error('search failed');
      },
      close,
    }));

    await expect(client.listSourceIds()).rejects.toThrow('search failed');
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('rejects disabled sources before writing', async () => {
    const { client, source } = setup();
    source.enabled = false;
    const run = jest.fn(async () => {});
    await expect(client.write({ sourceId: 'source', run })).rejects.toMatchObject(
      conflict('source_disabled')
    );
    expect(run).not.toHaveBeenCalled();
  });

  it('lets a removal through for a disabled source and still rejects an obsolete revision', async () => {
    const { client, source } = setup();
    source.enabled = false;
    const run = jest.fn(async () => 'removed');
    await expect(client.write({ sourceId: 'source', allowDisabled: true, run })).resolves.toBe(
      'removed'
    );
    await expect(
      client.write({ sourceId: 'source', allowDisabled: true, expectedRevision: 'old', run })
    ).rejects.toMatchObject(conflict('stale_revision'));
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('renews a live write lease until the final write completes', async () => {
    jest.useFakeTimers();
    const { client, documents } = setup();
    let releaseWrite = () => {};
    let markStarted = () => {};
    const pendingWrite = new Promise<void>((resolve) => {
      releaseWrite = resolve;
    });
    const started = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    const write = client.write({
      sourceId: 'source',
      run: async () => {
        markStarted();
        await pendingWrite;
      },
    });
    try {
      await started;
      await jest.advanceTimersByTimeAsync(40 * 60_000);
      await expect(
        client.runExclusive({ sourceId: 'source', run: async () => {} })
      ).rejects.toMatchObject(conflict('lease_held'));
    } finally {
      releaseWrite();
      await write;
      jest.useRealTimers();
    }
    expect(documents.get('default:source')?.attributes.lease).toBeNull();
  });

  it('recovers the expired lease of a stopped process', async () => {
    const { client, documents } = setup();
    documents.set('default:source', {
      version: '1',
      attributes: {
        revision: 'revision-1',
        lease: { owner: 'stopped', expiresAt: Date.now() - 1 },
      },
    });
    await expect(client.write({ sourceId: 'source', run: async () => 'written' })).resolves.toBe(
      'written'
    );
    expect(documents.get('default:source')?.attributes.lease).toBeNull();
  });

  describe('waiting for the write lease', () => {
    const WAIT_MS = 5_000;
    const FIRST_RETRY_MS = 100;

    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    const seedLease = ({
      documents,
      lease,
      version = '1',
    }: {
      documents: ReturnType<typeof setup>['documents'];
      lease: State['lease'];
      version?: string;
    }) => {
      documents.set('default:source', { version, attributes: { revision: 'revision-1', lease } });
    };

    const heldLease = () => ({ owner: 'other', expiresAt: Date.now() + 60_000 });

    // Attaches its handlers up front so a rejection is never reported as unhandled.
    const trackSettlement = <T>(promise: Promise<T>) => {
      let settled = false;
      const markSettled = () => {
        settled = true;
      };
      promise.then(markSettled, markSettled);
      return { promise, isSettled: () => settled };
    };

    it('completes a write once the lease it waited on is released', async () => {
      const { client, documents } = setup();
      seedLease({ documents, lease: heldLease() });
      const write = trackSettlement(
        client.write({ sourceId: 'source', waitForLeaseMs: WAIT_MS, run: async () => 'written' })
      );
      await jest.advanceTimersByTimeAsync(0);
      expect(write.isSettled()).toBe(false);

      seedLease({ documents, lease: null, version: '2' });
      await jest.advanceTimersByTimeAsync(FIRST_RETRY_MS);

      await expect(write.promise).resolves.toBe('written');
    });

    it('rejects when the lease stays held longer than the wait', async () => {
      const { client, documents } = setup();
      seedLease({ documents, lease: heldLease() });
      const run = jest.fn(async () => 'written');
      const write = trackSettlement(
        client.write({ sourceId: 'source', waitForLeaseMs: WAIT_MS, run })
      );

      await jest.advanceTimersByTimeAsync(WAIT_MS - 1);
      expect(write.isSettled()).toBe(false);
      await jest.advanceTimersByTimeAsync(1);

      await expect(write.promise).rejects.toMatchObject(conflict('lease_held'));
      expect(run).not.toHaveBeenCalled();
    });

    it('stops waiting for the lease once the request is aborted', async () => {
      const { client, documents } = setup();
      seedLease({ documents, lease: heldLease() });
      const controller = new AbortController();
      const run = jest.fn(async () => 'written');
      const write = trackSettlement(
        client.write({
          sourceId: 'source',
          waitForLeaseMs: WAIT_MS,
          signal: controller.signal,
          run,
        })
      );
      await jest.advanceTimersByTimeAsync(0);
      expect(write.isSettled()).toBe(false);

      controller.abort();
      seedLease({ documents, lease: null, version: '2' });
      await jest.advanceTimersByTimeAsync(0);
      expect(write.isSettled()).toBe(true);

      await expect(write.promise).rejects.toMatchObject(conflict('lease_held'));
      expect(run).not.toHaveBeenCalled();
    });

    it('does not start a write whose request was already aborted', async () => {
      const { client } = setup();
      const run = jest.fn(async () => 'written');

      await expect(
        client.write({ sourceId: 'source', signal: AbortSignal.abort(), run })
      ).rejects.toMatchObject({ name: 'AbortError' });
      expect(run).not.toHaveBeenCalled();
    });

    it('does not retry a stale revision', async () => {
      const { client, source } = setup();
      await client.write({ sourceId: 'source', run: async () => {} });
      source.esql_updated_at = 'revision-2';
      const run = jest.fn(async () => {});
      const write = trackSettlement(
        client.write({
          sourceId: 'source',
          expectedRevision: 'revision-1',
          waitForLeaseMs: WAIT_MS,
          run,
        })
      );

      await jest.advanceTimersByTimeAsync(0);

      expect(write.isSettled()).toBe(true);
      await expect(write.promise).rejects.toMatchObject(conflict('stale_revision'));
      expect(run).not.toHaveBeenCalled();
    });

    it('completes a write after losing the race to acquire the lease', async () => {
      const { client, documents, repository } = setup();
      seedLease({ documents, lease: null });
      repository.update.mockImplementationOnce(async (type, id) => {
        throw SavedObjectsErrorHelpers.createConflictError(type, id);
      });
      const write = trackSettlement(
        client.write({ sourceId: 'source', waitForLeaseMs: WAIT_MS, run: async () => 'written' })
      );

      await jest.advanceTimersByTimeAsync(FIRST_RETRY_MS);

      await expect(write.promise).resolves.toBe('written');
    });
  });
});
