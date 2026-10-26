/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { SandboxSession } from '@kbn/sandbox-plugin/server';
import type { CortexTelemetry } from '../telemetry';
import { materializeCortex } from './materialize';
import type { CortexPageStore } from './page_store';

const createTelemetry = (): jest.Mocked<CortexTelemetry> => ({
  reportHydrated: jest.fn(),
  reportEditsApplied: jest.fn(),
});

describe('materializeCortex', () => {
  it('writes README, INDEX, and each page into the sandbox workspace', async () => {
    const store: CortexPageStore = {
      list: jest.fn().mockResolvedValue({
        pages: [
          {
            id: 'cortex_service_checkout',
            title: 'Checkout',
            entity_type: 'service',
            status: 'established',
            corroborations: 2,
            updated_at: '2026-09-09T12:00:00.000Z',
          },
        ],
        stats: { total: 1, established: 1, total_corroborations: 2 },
      }),
      get: jest.fn().mockResolvedValue({
        id: 'cortex_service_checkout',
        title: 'Checkout',
        entity_type: 'service',
        status: 'established',
        corroborations: 2,
        updated_at: '2026-09-09T12:00:00.000Z',
        slug: 'checkout',
        content: 'Checkout talks to Redis.',
      }),
      upsert: jest.fn(),
      create: jest.fn(),
      corroborate: jest.fn(),
      archive: jest.fn(),
      pruneDuplicates: jest.fn().mockResolvedValue(0),
    };

    const session = {
      mkdirs: jest.fn().mockResolvedValue([true]),
      writeFiles: jest.fn().mockResolvedValue([]),
    } as unknown as SandboxSession;

    const telemetry = createTelemetry();
    await materializeCortex({ session, store, telemetry, logger: loggerMock.create() });

    expect(store.pruneDuplicates).toHaveBeenCalled();
    expect(session.mkdirs).toHaveBeenCalledWith(
      expect.arrayContaining(['/workspace/cortex', '/workspace/cortex/services'])
    );
    // Pages are written before the index, so a partial failure cannot leave an INDEX.md
    // advertising pages that were never written.
    expect(session.writeFiles).toHaveBeenNthCalledWith(
      1,
      expect.arrayContaining([
        expect.objectContaining({ path: '/workspace/cortex/services/checkout.md' }),
      ])
    );
    expect(session.writeFiles).toHaveBeenNthCalledWith(
      2,
      expect.arrayContaining([
        expect.objectContaining({ path: '/workspace/cortex/README.md' }),
        expect.objectContaining({ path: '/workspace/cortex/INDEX.md' }),
      ])
    );
  });

  it('leaves archived pages out of the workspace and the index', async () => {
    const summaries = [
      {
        id: 'cortex_service_checkout',
        title: 'Checkout',
        entity_type: 'service',
        status: 'established',
        corroborations: 2,
        updated_at: '2026-09-09T12:00:00.000Z',
      },
      {
        id: 'cortex_service_legacy',
        title: 'Legacy',
        entity_type: 'service',
        status: 'archived',
        corroborations: 1,
        updated_at: '2026-09-09T12:00:00.000Z',
      },
    ];

    const store: CortexPageStore = {
      list: jest.fn().mockResolvedValue({
        pages: summaries,
        stats: { total: 2, established: 1, total_corroborations: 3 },
      }),
      get: jest.fn(async (id: string) => {
        const summary = summaries.find((page) => page.id === id);
        return summary
          ? { ...summary, slug: summary.title.toLowerCase(), content: 'content' }
          : undefined;
      }),
      upsert: jest.fn(),
      create: jest.fn(),
      corroborate: jest.fn(),
      archive: jest.fn(),
      pruneDuplicates: jest.fn().mockResolvedValue(0),
    } as never;

    const session = {
      mkdirs: jest.fn().mockResolvedValue([true]),
      writeFiles: jest.fn().mockResolvedValue([]),
    } as unknown as SandboxSession;

    const telemetry = createTelemetry();
    await materializeCortex({ session, store, telemetry, logger: loggerMock.create() });

    expect(store.get).not.toHaveBeenCalledWith('cortex_service_legacy');

    // Archived pages never reach the sandbox, so they must not inflate the hydrate counts either.
    expect(telemetry.reportHydrated).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'cortex_service_checkout' }),
    ]);

    const [pageFiles] = (session.writeFiles as jest.Mock).mock.calls[0];
    const paths = pageFiles.map((file: { path: string }) => file.path);
    expect(paths).toContain('/workspace/cortex/services/checkout.md');
    expect(paths).not.toContain('/workspace/cortex/services/legacy.md');

    const [indexFiles] = (session.writeFiles as jest.Mock).mock.calls[1];
    const index = indexFiles.find((file: { path: string }) => file.path.endsWith('INDEX.md'));
    expect(index.content.toString('utf8')).not.toContain('Legacy');
  });
});
