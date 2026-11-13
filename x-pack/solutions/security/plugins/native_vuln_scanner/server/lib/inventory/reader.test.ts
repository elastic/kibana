/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { AgentInventoryRows } from './normalize';
import { readAgentInventories } from './reader';

interface Doc {
  agent: string;
  schedule: string;
  time: number;
  row: Record<string, unknown>;
}

const SCHEDULES = {
  deb_packages: ['deb-new', 'pack_inventory_deb'],
  os_version: ['os'],
  kernel_info: ['kernel'],
};

const hit = ({ agent, schedule, time, row }: Doc, sort: number) => ({
  _index: 'i',
  _id: `${agent}-${schedule}-${time}-${sort}`,
  _source: {
    agent: { id: agent },
    host: { name: `${agent}-host` },
    schedule_id: schedule,
    osquery_meta: { unix_time: time },
    osquery: row,
  },
  sort: [agent, time, sort],
});

const setup = (docs: Doc[]) => {
  const es = elasticsearchServiceMock.createElasticsearchClient();
  es.openPointInTime.mockResolvedValue({
    id: 'pit-0',
    _shards: { total: 1, successful: 1, failed: 0 },
  });
  es.closePointInTime.mockResolvedValue({ succeeded: true, num_freed: 1 });
  const hits = docs.map(hit);
  es.search.mockImplementation(async (req) => {
    const size = req?.size ?? 10;
    const after = req?.search_after?.[2] as number | undefined;
    const start = after === undefined ? 0 : after + 1;
    return {
      took: 1,
      timed_out: false,
      _shards: { total: 1, successful: 1, failed: 0 },
      pit_id: `pit-${start}`,
      hits: { hits: hits.slice(start, start + size) },
    };
  });
  return es;
};

const collect = async (it: AsyncIterable<AgentInventoryRows>) => {
  const out: AgentInventoryRows[] = [];
  for await (const agent of it) out.push(agent);
  return out;
};

describe('readAgentInventories', () => {
  const docs: Doc[] = [
    { agent: 'a1', schedule: 'os', time: 200, row: { platform: 'ubuntu', codename: 'noble' } },
    { agent: 'a1', schedule: 'deb-new', time: 200, row: { name: 'apt', version: '2' } },
    { agent: 'a1', schedule: 'kernel', time: 200, row: { version: '6.8.0-51-generic' } },
    { agent: 'a1', schedule: 'deb-new', time: 200, row: { name: 'bash', version: '5' } },
    // An older run of the same queries: superseded.
    { agent: 'a1', schedule: 'os', time: 100, row: { platform: 'ubuntu', codename: 'jammy' } },
    { agent: 'a1', schedule: 'deb-new', time: 100, row: { name: 'apt', version: '1' } },
    // Legacy schedule id of the same query, older than the newest run: superseded too.
    { agent: 'a1', schedule: 'pack_inventory_deb', time: 50, row: { name: 'old', version: '0' } },
    // Rows of an unrelated schedule are ignored.
    { agent: 'a1', schedule: 'other', time: 300, row: { name: 'noise' } },
    { agent: 'a2', schedule: 'pack_inventory_deb', time: 150, row: { name: 'curl', version: '8' } },
    { agent: 'a2', schedule: 'os', time: 150, row: { platform: 'ubuntu', codename: 'jammy' } },
  ];

  it('groups rows per agent and keeps only the newest run of each query, across pages', async () => {
    const es = setup(docs);
    const agents = await collect(readAgentInventories(es, { scheduleIds: SCHEDULES, pageSize: 3 }));

    expect(agents).toEqual([
      {
        agentId: 'a1',
        hostName: 'a1-host',
        deb: [
          { name: 'apt', version: '2' },
          { name: 'bash', version: '5' },
        ],
        rpm: undefined,
        os: { platform: 'ubuntu', codename: 'noble' },
        kernel: { version: '6.8.0-51-generic' },
      },
      {
        agentId: 'a2',
        hostName: 'a2-host',
        deb: [{ name: 'curl', version: '8' }],
        rpm: undefined,
        os: { platform: 'ubuntu', codename: 'jammy' },
        kernel: undefined,
      },
    ]);
    // 10 docs at 3 per page: the reader pages past the first response instead of stopping.
    expect(es.search).toHaveBeenCalledTimes(4);
    expect(es.closePointInTime).toHaveBeenCalledWith({ id: 'pit-9' });
  });

  it('pins the point in time, the sort and the filters on every page', async () => {
    const es = setup(docs);
    await collect(
      readAgentInventories(es, { scheduleIds: SCHEDULES, pageSize: 3, since: 'now-1d' })
    );

    const [first, second] = es.search.mock.calls.map(([req]) => req);
    expect(first).toMatchObject({ pit: { id: 'pit-0' }, size: 3, search_after: undefined });
    expect(second).toMatchObject({ pit: { id: 'pit-0' }, search_after: ['a1', 200, 2] });
    expect(first?.sort).toEqual([
      { 'agent.id': { order: 'asc' } },
      { 'osquery_meta.unix_time': { order: 'desc', unmapped_type: 'long' } },
    ]);
    expect(first?.query).toEqual({
      bool: {
        filter: [
          {
            terms: { schedule_id: ['deb-new', 'pack_inventory_deb', 'os', 'kernel'] },
          },
          { range: { '@timestamp': { gte: 'now-1d' } } },
          { exists: { field: 'agent.id' } },
        ],
        must_not: [{ terms: { 'osquery_meta.action': ['added', 'removed'] } }],
      },
    });
  });

  it('closes the point in time when the search fails', async () => {
    const es = setup(docs);
    es.search.mockRejectedValueOnce(new Error('boom'));
    await expect(collect(readAgentInventories(es, { scheduleIds: SCHEDULES }))).rejects.toThrow(
      'boom'
    );
    expect(es.closePointInTime).toHaveBeenCalledWith({ id: 'pit-0' });
  });

  it('does not query when no schedule id is configured', async () => {
    const es = setup(docs);
    expect(await collect(readAgentInventories(es, { scheduleIds: {} }))).toEqual([]);
    expect(es.openPointInTime).not.toHaveBeenCalled();
  });
});
