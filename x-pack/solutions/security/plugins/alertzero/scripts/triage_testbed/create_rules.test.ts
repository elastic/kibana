/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import type { GeneratedRule } from './create_rules';
import { parseArgs, ruleBody, createOne, main } from './create_rules';

const reply = (body: object | string, status = 200, type = 'application/json'): Response =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': type },
  });

const rule: GeneratedRule = {
  uuid: 'u-1',
  name: 'Rule 1',
  kind: 'process',
  severity: 'high',
  buildingBlock: false,
};

describe('create_rules parseArgs', () => {
  const full = [
    'node',
    'create_rules.js',
    '--data',
    'd',
    '--kibana',
    'http://kb',
    '--expect-es',
    'http://es',
    '--expect-cluster',
    'c',
  ];

  it('needs the data, Kibana, the Elasticsearch to check and the expected cluster name', () => {
    expect(parseArgs(full)).toEqual({
      data: 'd',
      kibana: 'http://kb',
      expectEs: 'http://es',
      expectCluster: 'c',
    });
    expect(() => parseArgs(full.slice(0, -2))).toThrow(/--expect-cluster is required/);
  });

  it('refuses an unknown flag', () => {
    expect(() => parseArgs([...full, '--nope', 'x'])).toThrow(/unknown argument/);
  });
});

describe('create_rules ruleBody', () => {
  it('makes a rule that can never run and never matches anything, because the alerts of the testbed are replayed and not detected', () => {
    const body = ruleBody(rule);

    expect(body).toMatchObject({
      rule_id: 'u-1',
      name: 'Rule 1',
      enabled: false,
      index: ['az-testbed-never-exists-*'],
      tags: ['az-testbed'],
    });
  });

  it('takes the risk score from the severity', () => {
    expect(ruleBody({ ...rule, severity: 'low' }).risk_score).toBe(21);
    expect(ruleBody({ ...rule, severity: 'critical' }).risk_score).toBe(99);
  });

  it('marks a building block rule, and only that one', () => {
    expect(ruleBody({ ...rule, buildingBlock: true }).building_block_type).toBe('default');
    expect(ruleBody(rule)).not.toHaveProperty('building_block_type');
  });
});

describe('create_rules createOne', () => {
  let fetchSpy: jest.SpiedFunction<typeof fetch>;
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the id that Kibana gave the rule', async () => {
    fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(async () => reply({ id: 'saved-1' }));

    await expect(createOne('http://kb', rule)).resolves.toBe('saved-1');
  });

  it('reads the existing rule when it already exists (409), so that a second run does not create a rule twice', async () => {
    fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockImplementation(async (url, init) =>
        init?.method === 'POST' ? reply('conflict', 409, 'text/plain') : reply({ id: 'saved-1' })
      );

    await expect(createOne('http://kb', rule)).resolves.toBe('saved-1');
    expect(String(fetchSpy.mock.calls[1][0])).toContain('rule_id=u-1');
  });

  it('fails when a rule cannot be created or found, and names the rule', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(async () => reply('boom', 500, 'text/plain'));

    await expect(createOne('http://kb', rule)).rejects.toThrow(/rule "Rule 1" failed with 500/);
  });

  it('fails for a 409 whose rule cannot be read, instead of returning nothing', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockImplementation(async (url, init) =>
        reply('x', init?.method === 'POST' ? 409 : 404, 'text/plain')
      );

    await expect(createOne('http://kb', rule)).rejects.toThrow(/failed with 409/);
  });
});

describe('create_rules main', () => {
  const originalArgv = process.argv;
  let dir: string;
  let rulePosts: string[];
  let esCluster: string;
  let kibanaIndices: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rules-test-'));
    const rules = ['u-3', 'u-1', 'u-2'].map((uuid) => ({ ...rule, uuid, name: `Rule ${uuid}` }));
    fs.writeFileSync(path.join(dir, 'rules.json'), JSON.stringify(rules));
    rulePosts = [];
    esCluster = 'elasticsearch';
    kibanaIndices = '.kibana_1\n.kibana_task_manager_1\n';
    jest.spyOn(global, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url === 'http://es/') return reply({ cluster_name: esCluster });
      if (url.startsWith('http://es/_cat/indices')) return reply(kibanaIndices, 200, 'text/plain');
      if (url === 'http://kb/api/detection_engine/rules' && init?.method === 'POST') {
        const { rule_id: ruleId } = JSON.parse(String(init.body)) as { rule_id: string };
        rulePosts.push(ruleId);
        return reply({ id: `saved-${ruleId}` });
      }
      return reply({}, 404);
    });
    process.argv = [
      'node',
      'create_rules.js',
      '--data',
      dir,
      '--kibana',
      'http://kb',
      '--expect-es',
      'http://es',
      '--expect-cluster',
      'elasticsearch',
    ];
    jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    process.argv = originalArgv;
    jest.restoreAllMocks();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('writes a rule map of generated rule id to saved id, sorted by rule id, so that the file is the same every time', async () => {
    await main();

    expect(JSON.parse(fs.readFileSync(path.join(dir, 'rule_map.json'), 'utf8'))).toEqual({
      'u-1': 'saved-u-1',
      'u-2': 'saved-u-2',
      'u-3': 'saved-u-3',
    });
    expect(
      Object.keys(JSON.parse(fs.readFileSync(path.join(dir, 'rule_map.json'), 'utf8')))
    ).toEqual(['u-1', 'u-2', 'u-3']);
  });

  it('refuses to write when the Elasticsearch is another cluster', async () => {
    esCluster = 'someone-elses';

    await expect(main()).rejects.toThrow(/refusing to write: cluster/);
    expect(rulePosts).toHaveLength(0);
  });

  it('refuses to write when that Elasticsearch has no Kibana indices, because Kibana then talks to another cluster', async () => {
    kibanaIndices = '';

    await expect(main()).rejects.toThrow(/no \.kibana indices/);
    expect(rulePosts).toHaveLength(0);
    expect(fs.existsSync(path.join(dir, 'rule_map.json'))).toBe(false);
  });

  it('writes no map when a rule fails, so that the replayer cannot use a half map', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url === 'http://es/') return reply({ cluster_name: 'elasticsearch' });
      if (url.startsWith('http://es/_cat/indices')) return reply('.kibana_1', 200, 'text/plain');
      return init?.method === 'POST' ? reply('boom', 500, 'text/plain') : reply({}, 404);
    });

    await expect(main()).rejects.toThrow(/failed with 500/);
    expect(fs.existsSync(path.join(dir, 'rule_map.json'))).toBe(false);
  });
});
