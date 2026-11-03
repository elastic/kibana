/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { attackDiscoveryIndexForSpace } from './constants';
import { assertCleanSpace, cleanupSeed, seedScenario, type SeededScenario } from './seed';
import { AUDIT_SCENARIOS } from './audit_failure_classes/registry';

const seeded: SeededScenario = {
  runMarker: 'adw-1',
  spaceId: 'space-a',
  goldIdBySeededId: new Map(),
  alertCount: 0,
  openAlertIds: [],
};

const esWith = (overrides: Record<string, unknown>): Client =>
  ({
    deleteByQuery: jest.fn(async () => ({})),
    count: jest.fn(async () => ({ count: 0 })),
    ...overrides,
  } as unknown as Client);

describe('assertCleanSpace', () => {
  it('passes an empty space', async () => {
    await expect(assertCleanSpace({ esClient: esWith({}), spaceId: 's' })).resolves.toBeUndefined();
  });

  it('fails loudly when open alerts are left over', async () => {
    const count = jest.fn(async ({ index }: { index: string }) => ({
      count: index.startsWith('.alerts-security') ? 2 : 0,
    }));
    await expect(assertCleanSpace({ esClient: esWith({ count }), spaceId: 's' })).rejects.toThrow(
      /2 open alerts and 0 attack fingerprints/
    );
  });

  it('fails loudly when fingerprints are left over', async () => {
    const count = jest.fn(async ({ index }: { index: string }) => ({
      count: index.startsWith('ai-index') ? 1 : 0,
    }));
    await expect(assertCleanSpace({ esClient: esWith({ count }), spaceId: 's' })).rejects.toThrow(
      /0 open alerts and 1 attack fingerprints/
    );
  });
});

describe('cleanupSeed', () => {
  it('deletes alerts, fingerprints and persisted discoveries', async () => {
    const deleteByQuery = jest.fn(async () => ({}));
    await cleanupSeed({ esClient: esWith({ deleteByQuery }), seeded });
    const indices = deleteByQuery.mock.calls.map(([args]) => (args as { index: string }).index);
    expect(indices).toContain(attackDiscoveryIndexForSpace('space-a'));
    expect(indices).toHaveLength(3);
  });

  it('throws when a delete fails, after attempting the others', async () => {
    const deleteByQuery = jest
      .fn()
      .mockRejectedValueOnce(new Error('es unavailable'))
      .mockResolvedValue({});
    await expect(cleanupSeed({ esClient: esWith({ deleteByQuery }), seeded })).rejects.toThrow(
      /Cleanup of space "space-a" failed/
    );
    expect(deleteByQuery).toHaveBeenCalledTimes(3);
  });
});

describe('seedScenario', () => {
  it('refuses to seed into a dirty space and writes nothing', async () => {
    const bulk = jest.fn();
    const count = jest.fn(async () => ({ count: 1 }));
    await expect(
      seedScenario({
        esClient: esWith({ bulk, count }),
        log: { info: jest.fn() } as unknown as ToolingLog,
        scenario: AUDIT_SCENARIOS[0],
        spaceId: 's',
      })
    ).rejects.toThrow(/not clean/);
    expect(bulk).not.toHaveBeenCalled();
  });

  it('records the open alert ids of the space after seeding, mapped to scenario ids', async () => {
    const scenario = AUDIT_SCENARIOS[0];
    const search = jest.fn(async () => ({ hits: { hits: [] as Array<{ _id: string }> } }));
    const bulk = jest.fn(async () => ({ errors: false, items: [] }));
    search.mockImplementation(async () => ({
      hits: {
        hits: scenario.alerts.map(({ id }) => ({
          _id: (
            bulk.mock.calls[0] as unknown as [{ operations: Array<{ index?: { _id: string } }> }]
          )[0].operations.find((op) => op.index?._id.endsWith(`-${id}`))?.index?._id as string,
        })),
      },
    }));
    const result = await seedScenario({
      esClient: esWith({ bulk, search }),
      log: { info: jest.fn() } as unknown as ToolingLog,
      scenario,
      spaceId: 's',
    });
    expect([...result.openAlertIds].sort()).toEqual(scenario.alerts.map(({ id }) => id).sort());
  });
});
