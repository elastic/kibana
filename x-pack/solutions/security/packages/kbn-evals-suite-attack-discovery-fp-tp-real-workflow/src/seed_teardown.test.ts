/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import { SeedLedger } from './seed_ledger';
import { teardownSeededData } from './seed_teardown';
import {
  RAW_EVENTS_INDEX_PATTERN,
  RAW_EVENTS_TEMPLATE,
  SCHEDULED_ATTACK_DISCOVERY_INDEX_PREFIX,
  SEED_ATTACK_DISCOVERY_INDEX_PREFIX,
  SEED_CITED_ALERTS_INDEX_PREFIX,
  seedAttackDiscovery,
  seedCitedAlerts,
  seedInvestigation,
  seedRawEvidence,
  type EsClientLike,
} from './workflow_task';

const AD_ID = 'a'.repeat(32);

const mockLog = () => ({ info: jest.fn(), warning: jest.fn(), error: jest.fn() } as never);

const makeEs = (overrides: Partial<EsClientLike> = {}) => {
  const deletes: Array<{ index: string; query: Record<string, unknown> }> = [];
  const templates: string[] = [];
  const client: EsClientLike = {
    get: async () => ({ found: true, _source: {} }),
    bulk: async () => ({ errors: false }),
    indices: {
      create: async () => ({}),
      putIndexTemplate: async () => ({}),
      deleteIndexTemplate: async ({ name }: { name: string }) => {
        templates.push(name);
      },
    },
    deleteByQuery: async (params) => {
      deletes.push({ index: params.index, query: params.query });
    },
    ...overrides,
  };
  return { client, deletes, templates };
};

const EVIDENCE = {
  events: [{ '@timestamp': '2026-02-11T10:00:00.000Z', event: { category: 'process' } }],
  entities: [{ entity: { id: 'fixture-host-1' } }, { entity: { id: 'fixture-user-1' } }],
  identities: [{ host: { id: 'h', name: 'h' }, user: { name: 'u' } }],
} as never;

describe('teardownSeededData', () => {
  const fullLedger = () => {
    const ledger = new SeedLedger();
    ledger.attackDiscoveryIds.add(AD_ID);
    ledger.alertIds.add('case-c1-inv-a-alert-1');
    ledger.entityIds.add('fixture-host-1');
    ledger.eventOwnerIds.add(AD_ID);
    ledger.conversationIds.add('conv-1');
    ledger.rawEventsTemplateInstalled = true;
    return ledger;
  };

  it('removes exactly the seeded ids, never a broad pattern, in every store', async () => {
    const { client, deletes, templates } = makeEs();
    const fetch = jest.fn(async () => ({}));

    const result = await teardownSeededData({
      esClient: client,
      fetch: fetch as unknown as HttpHandler,
      log: mockLog(),
      ledger: fullLedger(),
    });

    expect(result.failures).toEqual([]);
    expect(deletes).toEqual([
      {
        index: `${SCHEDULED_ATTACK_DISCOVERY_INDEX_PREFIX}default`,
        query: { ids: { values: [AD_ID] } },
      },
      {
        index: `${SEED_ATTACK_DISCOVERY_INDEX_PREFIX}default`,
        query: { ids: { values: [AD_ID] } },
      },
      {
        index: `${SEED_CITED_ALERTS_INDEX_PREFIX}default`,
        query: { ids: { values: ['case-c1-inv-a-alert-1'] } },
      },
      { index: 'entities-latest-default', query: { ids: { values: ['fixture-host-1'] } } },
      {
        index: RAW_EVENTS_INDEX_PATTERN,
        query: { terms: { 'labels.fp_tp_fixture': [AD_ID] } },
      },
    ]);
    expect(fetch).toHaveBeenCalledWith('/api/agent_builder/conversations/conv-1', {
      method: 'DELETE',
      headers: { 'kbn-xsrf': 'true', 'elastic-api-version': '2023-10-31' },
    });
    expect(templates).toEqual([RAW_EVENTS_TEMPLATE]);
  });

  it('does nothing for a run that seeded nothing (no template delete, no queries)', async () => {
    const { client, deletes, templates } = makeEs();
    const fetch = jest.fn();
    await teardownSeededData({
      esClient: client,
      fetch: fetch as unknown as HttpHandler,
      log: mockLog(),
      ledger: new SeedLedger(),
    });
    expect(deletes).toEqual([]);
    expect(templates).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('keeps going after a failing step so the template is still removed', async () => {
    const { client, templates } = makeEs({
      deleteByQuery: async () => {
        throw new Error('es down');
      },
    });
    const fetch = jest.fn(async () => {
      throw new Error('404');
    });

    const result = await teardownSeededData({
      esClient: client,
      fetch: fetch as unknown as HttpHandler,
      log: mockLog(),
      ledger: fullLedger(),
    });

    expect(result.failures.length).toBeGreaterThanOrEqual(6);
    expect(templates).toEqual([RAW_EVENTS_TEMPLATE]);
  });
});

describe('seeders record into the ledger before the write that can fail', () => {
  it('records the discovery, alerts, entities, events and template as they are seeded', async () => {
    const { client } = makeEs();
    const ledger = new SeedLedger();
    const clients = { fetch: jest.fn() as never, log: mockLog(), esClient: client, ledger };

    await seedRawEvidence(clients, EVIDENCE, AD_ID);
    await seedCitedAlerts(clients, { alertIds: ['alert-x'], title: 't' } as never, AD_ID, EVIDENCE);

    expect([...ledger.eventOwnerIds]).toEqual([AD_ID]);
    expect([...ledger.entityIds].sort()).toEqual(['fixture-host-1', 'fixture-user-1']);
    expect([...ledger.alertIds]).toEqual(['alert-x']);
    expect(ledger.rawEventsTemplateInstalled).toBe(true);
  });

  it('records a half-seeded case: a bulk that throws still leaves the ids in the ledger', async () => {
    const { client } = makeEs({
      bulk: async () => {
        throw new Error('bulk failed');
      },
    });
    const ledger = new SeedLedger();
    await expect(
      seedRawEvidence(
        { fetch: jest.fn() as never, log: mockLog(), esClient: client, ledger },
        EVIDENCE,
        AD_ID
      )
    ).rejects.toThrow('bulk failed');
    expect(ledger.rawEventsTemplateInstalled).toBe(true);
    expect([...ledger.eventOwnerIds]).toEqual([AD_ID]);
  });

  it('records the persisted discovery id and the investigation conversation id', async () => {
    const { client } = makeEs();
    const ledger = new SeedLedger();
    const fetch = jest.fn(async (url: string) =>
      url.endsWith('/_create') ? { data: [{ id: AD_ID, title: 't' }] } : {}
    ) as unknown as HttpHandler;

    const persisted = await seedAttackDiscovery(
      { fetch, log: mockLog(), esClient: client, ledger },
      { alertIds: [], title: 't', summaryMarkdown: '', detailsMarkdown: '' } as never,
      'c1',
      {}
    );
    const conversationId = await seedInvestigation(
      { fetch, log: mockLog(), ledger },
      persisted.id,
      't'
    );

    expect([...ledger.attackDiscoveryIds]).toEqual([AD_ID]);
    expect([...ledger.conversationIds]).toEqual([conversationId]);
  });
});
