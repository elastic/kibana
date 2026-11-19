/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { AgentInventoryRows } from './normalize';
import { AgentAccumulator, readAgentInventories } from './reader';

interface Doc {
  agent: string;
  /** Scheduled run: the schedule id. */
  schedule?: string;
  /** Live run: the query id (`action_data.id`), the action id and the space it ran in. */
  live?: { queryId: string; action?: string; space?: string };
  /** Seconds since epoch: `osquery_meta.unix_time` of a scheduled run, `@timestamp` of a live one. */
  time: number;
  row: Record<string, unknown>;
}

const live = (queryId: string, action: string | undefined, space = 'default') => ({
  queryId,
  action,
  space,
});

const SCHEDULES = {
  deb_packages: ['deb-new', 'pack_inventory_deb'],
  os_version: ['os'],
  kernel_info: ['kernel'],
};

const hit = ({ agent, schedule, live: liveRun, time, row }: Doc, sort: number) => ({
  _index: 'i',
  _id: `${agent}-${schedule ?? liveRun?.action}-${time}-${sort}`,
  _source: {
    '@timestamp': new Date(time * 1000).toISOString(),
    agent: { id: agent },
    host: { name: `${agent}-host` },
    ...(schedule ? { schedule_id: schedule, osquery_meta: { unix_time: time } } : {}),
    ...(liveRun
      ? {
          action_id: liveRun.action,
          action_data: { id: liveRun.queryId, space_id: liveRun.space },
        }
      : {}),
    osquery: row,
  },
  sort: [agent, time * 1000, sort],
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

    const requests = es.search.mock.calls.map(([req]) => req);
    expect(requests).toHaveLength(4);
    expect(requests[0]).toMatchObject({ pit: { id: 'pit-0' }, size: 3, search_after: undefined });
    expect(requests[1]).toMatchObject({ pit: { id: 'pit-0' }, search_after: ['a1', 200000, 2] });

    const sort = [
      { 'agent.id': { order: 'asc' } },
      { '@timestamp': { order: 'desc', unmapped_type: 'date' } },
    ];
    const query = {
      bool: {
        filter: [
          {
            bool: {
              should: [
                { terms: { schedule_id: ['deb-new', 'pack_inventory_deb', 'os', 'kernel'] } },
                {
                  bool: {
                    filter: [
                      {
                        terms: {
                          'action_data.id': [
                            'native_vuln_scanner_deb_packages',
                            'native_vuln_scanner_rpm_packages',
                            'native_vuln_scanner_os_version',
                            'native_vuln_scanner_kernel_info',
                          ],
                        },
                      },
                      { term: { 'action_data.space_id': 'default' } },
                    ],
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
          { range: { '@timestamp': { gte: 'now-1d' } } },
          { exists: { field: 'agent.id' } },
        ],
        must_not: [{ terms: { 'osquery_meta.action': ['added', 'removed'] } }],
      },
    };
    for (const request of requests) {
      expect(request?.size).toBe(3);
      expect(request?.sort).toEqual(sort);
      expect(request?.query).toEqual(query);
    }
  });

  describe('live-query results', () => {
    const RPM = 'native_vuln_scanner_rpm_packages';
    const OS = 'native_vuln_scanner_os_version';
    const KERNEL = 'native_vuln_scanner_kernel_info';
    const SCHEDULED = { rpm_packages: ['rpm-sched'], os_version: ['os'], kernel_info: ['kernel'] };
    const read = async (results: Doc[]) =>
      collect(readAgentInventories(setup(results), { scheduleIds: SCHEDULED, pageSize: 2 }));

    // Trimmed from a live query run on a RHEL 9.9 agent.
    const liveDocs: Doc[] = [
      {
        agent: 'rhel',
        live: live(RPM, 'rpm-1'),
        time: 1000,
        row: { name: 'util-linux', epoch: '', version: '2.37.4', release: '28.el9_9.1' },
      },
      {
        agent: 'rhel',
        live: live(OS, 'os-1'),
        time: 1001,
        row: { platform: 'rhel', major: 9, name: 'Red Hat Enterprise Linux' },
      },
      {
        agent: 'rhel',
        live: live(KERNEL, 'kernel-1'),
        time: 1002,
        row: { version: '5.14.0-570.el9.aarch64' },
      },
    ];

    it('reads an inventory made only of live-query results', async () => {
      expect(await read(liveDocs)).toEqual([
        {
          agentId: 'rhel',
          hostName: 'rhel-host',
          deb: undefined,
          rpm: [liveDocs[0].row],
          os: liveDocs[1].row,
          kernel: liveDocs[2].row,
        },
      ]);
    });

    it('reads an inventory made only of scheduled results', async () => {
      const [agent] = await read([
        { agent: 'rhel', schedule: 'rpm-sched', time: 900, row: { name: 'shadow-utils' } },
        { agent: 'rhel', schedule: 'os', time: 900, row: { platform: 'rhel' } },
      ]);
      expect(agent).toMatchObject({
        rpm: [{ name: 'shadow-utils' }],
        os: { platform: 'rhel' },
        kernel: undefined,
      });
    });

    it('prefers a newer scheduled run over an older live run, per query', async () => {
      const [agent] = await read([
        ...liveDocs,
        { agent: 'rhel', schedule: 'rpm-sched', time: 2000, row: { name: 'scheduled-newer' } },
        { agent: 'rhel', schedule: 'os', time: 500, row: { platform: 'older-scheduled' } },
      ]);
      expect(agent.rpm).toEqual([{ name: 'scheduled-newer' }]);
      // The scheduled OS run predates the live one, so the live row wins.
      expect(agent.os).toEqual(liveDocs[1].row);
      expect(agent.kernel).toEqual(liveDocs[2].row);
    });

    it('prefers a newer live run over an older scheduled run, per query', async () => {
      const [agent] = await read([
        { agent: 'rhel', schedule: 'rpm-sched', time: 500, row: { name: 'scheduled-older' } },
        ...liveDocs,
      ]);
      expect(agent.rpm).toEqual([liveDocs[0].row]);
    });

    it('keeps only the newest of overlapping live runs even when their rows interleave', async () => {
      const [agent] = await read([
        { agent: 'rhel', live: live(RPM, 'new'), time: 3000, row: { name: 'new-a' } },
        { agent: 'rhel', live: live(RPM, 'old'), time: 2999, row: { name: 'old-a' } },
        { agent: 'rhel', live: live(RPM, 'new'), time: 2998, row: { name: 'new-b' } },
        { agent: 'rhel', live: live(RPM, 'old'), time: 2997, row: { name: 'old-b' } },
      ]);
      expect(agent.rpm).toEqual([{ name: 'new-a' }, { name: 'new-b' }]);
    });

    it('keeps only the newest run when many older runs of both shapes interleave with it', async () => {
      const results: Doc[] = [];
      for (let i = 0; i < 20; i++) {
        results.push(
          { agent: 'rhel', live: live(RPM, `live-${i}`), time: 1000 + i, row: { name: `l${i}` } },
          { agent: 'rhel', schedule: 'rpm-sched', time: 2000 + i, row: { name: `s${i}` } }
        );
        // The newest run (scheduled, time 5000) trickles in between the older ones.
        if (i % 7 === 0) {
          results.push({
            agent: 'rhel',
            schedule: 'rpm-sched',
            time: 5000,
            row: { name: `newest-${i}` },
          });
        }
      }
      const [agent] = await read(results);
      expect(agent.rpm).toEqual([
        { name: 'newest-0' },
        { name: 'newest-7' },
        { name: 'newest-14' },
      ]);
    });

    it('lets a newer run displace a partly read older one', async () => {
      const [agent] = await read([
        { agent: 'rhel', live: live(RPM, 'old'), time: 1000, row: { name: 'old-a' } },
        { agent: 'rhel', live: live(RPM, 'old'), time: 1000, row: { name: 'old-b' } },
        { agent: 'rhel', live: live(RPM, 'new'), time: 2000, row: { name: 'new-a' } },
        { agent: 'rhel', live: live(RPM, 'old'), time: 1000, row: { name: 'old-c' } },
      ]);
      expect(agent.rpm).toEqual([{ name: 'new-a' }]);
    });

    it('ignores a live result of an unknown query', async () => {
      const agents = await read([
        { agent: 'rhel', live: live('some_other_query', 'x'), time: 1000, row: { name: 'noise' } },
      ]);
      expect(agents).toEqual([]);
    });

    it('ignores a live result that ran in another space', async () => {
      const agents = await read([
        { agent: 'rhel', live: live(OS, 'x', 'other-space'), time: 1000, row: { platform: 'x' } },
        { agent: 'rhel', live: { queryId: OS, action: 'y' }, time: 1001, row: { platform: 'y' } },
      ]);
      expect(agents).toEqual([]);
    });

    it('ignores a live result without an action id', async () => {
      const agents = await read([
        { agent: 'rhel', live: live(OS, undefined), time: 1000, row: { platform: 'x' } },
      ]);
      expect(agents).toEqual([]);
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

describe('AgentAccumulator', () => {
  it('holds only the newest run of a query while older runs stream in', () => {
    const accumulator = new AgentAccumulator('a1');
    for (let run = 1; run <= 50; run++) {
      for (let i = 0; i < 100; i++) {
        accumulator.add(
          'deb_packages',
          { osquery: { name: `pkg-${i}`, version: `${run}` } },
          { key: `deb@${run}`, time: run }
        );
        expect(accumulator.heldRowCount()).toBeLessThanOrEqual(100);
      }
    }
    for (let i = 0; i < 3; i++) {
      accumulator.add(
        'deb_packages',
        { osquery: { name: `new-${i}`, version: '51' } },
        { key: 'deb@51', time: 51 }
      );
      expect(accumulator.heldRowCount()).toBeLessThanOrEqual(100);
    }

    expect(accumulator.heldRowCount()).toBe(3);
    expect(accumulator.build().deb?.map((row) => row.name)).toEqual(['new-0', 'new-1', 'new-2']);
  });
});
