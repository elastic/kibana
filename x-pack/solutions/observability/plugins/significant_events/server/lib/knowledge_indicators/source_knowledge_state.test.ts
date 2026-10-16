/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { SourcesClient } from '@kbn/nightshift-sources-plugin/server';
import { createSourceKnowledgeStateClient } from './source_knowledge_state';

type State = Parameters<
  Parameters<ReturnType<typeof createSourceKnowledgeStateClient>['runExclusive']>[0]['run']
>[0];

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
    ).rejects.toThrow('has changed');
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
    await expect(client.write({ sourceId: 'source', run: async () => {} })).rejects.toThrow(
      'has changed'
    );
  });

  it('isolates equal source ids in different spaces', async () => {
    const { clientForSpace, documents } = setup();
    await Promise.all(
      ['a', 'b'].map((space) =>
        clientForSpace(space).write({ sourceId: 'same-id', run: async () => {} })
      )
    );
    expect([...documents.keys()]).toEqual(['a:same-id', 'b:same-id']);
  });

  it('rejects disabled sources before writing', async () => {
    const { client, source } = setup();
    source.enabled = false;
    const run = jest.fn(async () => {});
    await expect(client.write({ sourceId: 'source', run })).rejects.toThrow('has changed');
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
    ).rejects.toThrow('has changed');
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
      ).rejects.toThrow('being updated');
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
});
