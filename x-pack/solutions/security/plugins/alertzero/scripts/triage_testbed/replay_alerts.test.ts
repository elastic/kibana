/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import type { AlertSource } from './replay_alerts';
import { parseArgs, planSlice, withLiveFields, main } from './replay_alerts';

const DAY = Date.parse('2026-11-15T00:00:00.000Z');
const MINUTE = 60 * 1000;
const required = ['--data', 'd', '--es', 'http://es', '--expect-cluster', 'c', '--index', 'i'];
const argv = (...extra: string[]) => ['node', 'replay_alerts.js', ...required, ...extra];

const reply = (body: object, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('replay_alerts parseArgs', () => {
  it.each(['--data', '--es', '--expect-cluster', '--index'])(
    'refuses to run without %s, because the script writes into an index',
    (flag) => {
      const without = argv().filter((_, i, all) => all[i] !== flag && all[i - 1] !== flag);

      expect(() => parseArgs(without)).toThrow(/is required/);
    }
  );

  it('has real time with speed 1 by default and speed 60 in fast mode', () => {
    expect(parseArgs(argv())).toMatchObject({ mode: 'real-time', speed: 1 });
    expect(parseArgs(argv('--mode', 'fast'))).toMatchObject({ mode: 'fast', speed: 60 });
    expect(parseArgs(argv('--mode', 'fast', '--speed', '120')).speed).toBe(120);
  });

  it('does not let real-time mode run at another speed, because the sweep windows would not match production', () => {
    expect(() => parseArgs(argv('--speed', '10'))).toThrow(/real-time mode has speed 1/);
  });

  it('does not let a backfill use a compressed clock, because a backfill keeps the real offsets', () => {
    expect(() => parseArgs(argv('--mode', 'fast', '--backfill'))).toThrow(/--backfill/);
  });

  it('refuses an unknown mode, a speed under 1 and an unknown flag', () => {
    expect(() => parseArgs(argv('--mode', 'slow'))).toThrow(/--mode must be/);
    expect(() => parseArgs(argv('--mode', 'fast', '--speed', '0'))).toThrow(/--speed/);
    expect(() => parseArgs(argv('--nope'))).toThrow(/unknown argument/);
  });
});

describe('replay_alerts planSlice', () => {
  const line = (id: string, offsetMs: number) =>
    JSON.stringify({
      _id: id,
      _source: { '@timestamp': new Date(DAY + 10 * 3600 * 1000 + offsetMs).toISOString() },
    });
  const args = { sliceStartHour: 10, sliceHours: 2 };

  it('groups alerts in windows of 5 minutes, because a window is one rule execution', () => {
    const { windows, windowCount } = planSlice(
      [line('a', 0), line('b', 5 * MINUTE - 1), line('c', 5 * MINUTE)],
      args
    );

    expect(windowCount).toBe(24);
    expect(windows.get(0)?.map((x) => x._id)).toEqual(['a', 'b']);
    expect(windows.get(1)?.map((x) => x._id)).toEqual(['c']);
    expect(windows.get(1)?.[0].offsetMs).toBe(5 * MINUTE);
  });

  it('leaves out alerts before the start and at or after the end of the slice', () => {
    const { windows } = planSlice(
      [line('before', -1), line('inside', 2 * 3600 * 1000 - 1), line('end', 2 * 3600 * 1000)],
      args
    );

    expect([...windows.values()].flat().map((x) => x._id)).toEqual(['inside']);
    expect([...windows.keys()]).toEqual([23]);
  });
});

describe('replay_alerts withLiveFields', () => {
  const source: AlertSource = {
    '@timestamp': 'old',
    'kibana.alert.rule.uuid': 'generated-1',
    'process.name': 'x.exe',
  };

  it('points the alert to the rule that Kibana created, so that the alert belongs to a rule that exists', () => {
    const out = withLiveFields(source, { 'generated-1': 'saved-1' }, 'default', 1000);

    expect(out['kibana.alert.rule.uuid']).toBe('saved-1');
  });

  it('fails for a rule that is not in the map, instead of writing an alert of an unknown rule', () => {
    expect(() => withLiveFields(source, { other: 'saved-2' }, 'default', 1000)).toThrow(
      /rule generated-1 is not in the rule map/
    );
  });

  it('keeps the rule id when there is no map', () => {
    expect(withLiveFields(source, undefined, 'default', 1000)['kibana.alert.rule.uuid']).toBe(
      'generated-1'
    );
  });

  it('sets the times and the space, keeps the other fields and does not change its input', () => {
    const out = withLiveFields(source, undefined, 'sec', Date.parse('2026-11-17T10:00:00Z'));

    expect(out).toMatchObject({
      '@timestamp': '2026-11-17T10:00:00.000Z',
      'kibana.alert.start': '2026-11-17T10:00:00.000Z',
      'kibana.alert.last_detected': '2026-11-17T10:00:00.000Z',
      'kibana.space_ids': ['sec'],
      'process.name': 'x.exe',
    });
    expect(source['@timestamp']).toBe('old');
  });
});

describe('replay_alerts main', () => {
  let dir: string;
  let bulks: string[];
  let cluster: string;
  let bulkErrors: boolean;
  let fetchSpy: jest.SpiedFunction<typeof fetch>;
  let stdoutSpy: jest.SpiedFunction<typeof process.stdout.write>;
  const originalArgv = process.argv;

  const alert = (id: string, offsetMin: number) => ({
    _id: id,
    _source: {
      '@timestamp': new Date(DAY + offsetMin * MINUTE).toISOString(),
      'kibana.alert.rule.uuid': 'generated-1',
    },
  });

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'replay-test-'));
    fs.writeFileSync(
      path.join(dir, 'alerts.ndjson'),
      [alert('a', 10), alert('b', 12), alert('c', 70)].map((a) => JSON.stringify(a)).join('\n')
    );
    fs.writeFileSync(path.join(dir, 'rule_map.json'), JSON.stringify({ 'generated-1': 'saved-1' }));
    bulks = [];
    cluster = 'elasticsearch';
    bulkErrors = false;
    fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith('/_bulk?refresh=false')) {
        bulks.push(String(init?.body));
        return reply(
          bulkErrors
            ? {
                errors: true,
                took: 1,
                items: [{ create: { error: { type: 'version_conflict' } } }],
              }
            : { errors: false, took: 1, items: [] }
        );
      }
      if (url === 'http://es/') return reply({ cluster_name: cluster });
      return reply({});
    });
    stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    process.argv = originalArgv;
    jest.restoreAllMocks();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const run = (...extra: string[]): Promise<void> => {
    process.argv = [
      'node',
      'replay_alerts.js',
      '--data',
      dir,
      '--es',
      'http://es',
      '--expect-cluster',
      'elasticsearch',
      '--index',
      'alerts',
      '--rule-map',
      path.join(dir, 'rule_map.json'),
      '--slice-hours',
      '2',
      ...extra,
    ];
    return main();
  };

  const docsOf = (body: string): AlertSource[] =>
    body
      .trim()
      .split('\n')
      .filter((_, i) => i % 2 === 1)
      .map((l) => JSON.parse(l) as AlertSource);

  it('writes one bulk per window with alerts, with the ids of the data and the mapped rule', async () => {
    await run('--backfill');

    expect(bulks).toHaveLength(2);
    const first = bulks[0].trim().split('\n');
    expect(JSON.parse(first[0])).toEqual({ create: { _id: 'a' } });
    expect(docsOf(bulks[0]).map((d) => d['kibana.alert.rule.uuid'])).toEqual([
      'saved-1',
      'saved-1',
    ]);
  });

  it('shifts a backfill so that it ends now and keeps the real distance between alerts', async () => {
    const before = Date.now();
    await run('--backfill');

    const [a, b] = docsOf(bulks[0]).map((d) => Date.parse(d['@timestamp']));
    expect(b - a).toBe(2 * MINUTE);
    // Alert "a" is 10 minutes into a 2-hour slice that ends now.
    expect(a).toBeGreaterThanOrEqual(before - 2 * 3600 * 1000 + 10 * MINUTE);
    expect(a).toBeLessThanOrEqual(Date.now() - 2 * 3600 * 1000 + 10 * MINUTE + 5000);
  });

  it('refuses to write when the cluster is not the expected one, because port 9200 can belong to another session', async () => {
    cluster = 'someone-elses';

    await expect(run('--backfill')).rejects.toThrow(/refusing to write/);
    expect(bulks).toHaveLength(0);
  });

  it('fails when a bulk reports an error, instead of leaving a half written slice (version conflicts on existing alerts)', async () => {
    bulkErrors = true;

    await expect(run('--backfill')).rejects.toThrow(/bulk errors in window 2/);
  });

  it('writes nothing in a dry run, and says how many alerts the slice holds', async () => {
    await run('--dry-run');

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(JSON.parse(String(stdoutSpy.mock.calls[0][0]))).toMatchObject({
      dryRun: true,
      alerts: 3,
      windows: 24,
      windowsWithAlerts: 2,
    });
  });

  it('writes a manifest with what it wrote, so that a run can be read back later', async () => {
    await run('--backfill');

    const manifests = fs.readdirSync(dir).filter((f) => f.startsWith('replay_manifest_'));
    expect(manifests).toHaveLength(1);
    expect(JSON.parse(fs.readFileSync(path.join(dir, manifests[0]), 'utf8'))).toMatchObject({
      alerts: 3,
      backfill: true,
      cluster: 'elasticsearch',
    });
  });
});
