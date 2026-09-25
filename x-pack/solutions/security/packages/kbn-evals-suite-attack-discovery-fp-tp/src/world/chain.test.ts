/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildChainWorld, getChainIds, type FpTpChainDefinition } from './chain';
import { FP_TP_BASE_TIME, FP_TP_RAW_EVENT_WINDOW_MS } from './constants';
import {
  withCommandLine,
  withFilePath,
  withNetworkDestination,
  withoutEventCategory,
  withoutEventIds,
  withoutProcessParent,
  withProcessExecutable,
  withProcessParent,
} from './mutations';

const RUN_MARKER = 'run-marker';

const PROCESS = {
  name: 'powershell.exe',
  pid: 100,
  executable: 'C:\\powershell.exe',
  commandLine: 'powershell.exe -c whoami',
  parent: { name: 'explorer.exe', pid: 10 },
};

const DEFINITION: FpTpChainDefinition = {
  key: 'test-chain',
  host: { name: 'host-1', os: { type: 'windows', name: 'Windows 11' } },
  user: { name: 'user-1', domain: 'CORP' },
  attack: {
    id: 'attack-1',
    title: 'title',
    summaryMarkdown: 'summary',
    detailsMarkdown: 'details',
    tactics: ['Execution'],
  },
  events: [
    { key: 'start', category: 'process', offsetSeconds: 0, process: PROCESS },
    {
      key: 'beacon',
      category: 'network',
      offsetSeconds: 7200,
      process: PROCESS,
      destination: { domain: 'bad.example', ip: '203.0.113.1', port: 443 },
    },
  ],
  stages: [
    {
      key: 'exec',
      ruleName: 'rule',
      severity: 'high',
      riskScore: 73,
      reason: 'reason',
      eventKeys: ['start', 'beacon'],
    },
  ],
};

const ids = getChainIds(DEFINITION, RUN_MARKER);

describe('buildChainWorld', () => {
  const world = buildChainWorld(DEFINITION, RUN_MARKER);

  it('returns an attack citing every stage alert', () => {
    expect(world.attack?.['kibana.alert.attack_discovery.alert_ids']).toEqual([
      ids.alertId('exec'),
    ]);
  });

  it('returns alert ancestors naming each stage event and its index', () => {
    expect(world.alerts[0].source['kibana.alert.ancestors']).toEqual([
      {
        id: ids.eventId('start'),
        type: 'event',
        index: 'logs-endpoint.events.process-default',
        depth: 0,
      },
      {
        id: ids.eventId('beacon'),
        type: 'event',
        index: 'logs-endpoint.events.network-default',
        depth: 0,
      },
    ]);
  });

  it('returns raw events within the window around the attack timestamp', () => {
    const outside = world.events.filter(
      ({ source }) =>
        Math.abs(Date.parse(String(source['@timestamp'])) - FP_TP_BASE_TIME.getTime()) >
        FP_TP_RAW_EVENT_WINDOW_MS
    );
    expect(outside).toEqual([]);
  });

  it('returns raw events keyed by the seeded host id', () => {
    expect(world.events.map(({ source }) => (source.host as { id: string }).id)).toEqual([
      ids.hostId,
      ids.hostId,
    ]);
  });

  it('returns messages built from the event fields', () => {
    expect(world.events.map(({ source }) => source.message)).toEqual([
      'explorer.exe started powershell.exe',
      'powershell.exe connected to bad.example (203.0.113.1:443)',
    ]);
  });

  it('returns host and user entities with the employee workstation role by default', () => {
    expect(
      world.entities.map(({ id, source }) => [id, (source.entity as { sub_type: string }).sub_type])
    ).toEqual([
      [ids.hostEntityId, 'employee_workstation'],
      [ids.userEntityId, 'employee'],
    ]);
  });

  it('returns entities without a role for the unknown role', () => {
    const { entities } = buildChainWorld(DEFINITION, RUN_MARKER, { role: 'unknown' });
    expect(
      entities.some(({ source }) => 'asset' in source || 'sub_type' in (source.entity as object))
    ).toBe(false);
  });

  it('throws for a stage that cites no event', () => {
    expect(() =>
      buildChainWorld(
        { ...DEFINITION, stages: [{ ...DEFINITION.stages[0], eventKeys: ['missing'] }] },
        RUN_MARKER
      )
    ).toThrow('Chain "test-chain" stage "exec" cites no event');
  });
});

describe('chain mutations', () => {
  const world = buildChainWorld(DEFINITION, RUN_MARKER);

  it('returns the new parent and a matching message after withProcessParent', () => {
    const [event] = withProcessParent(world, 'powershell.exe', {
      name: 'CcmExec.exe',
      pid: 1,
    }).events;
    expect(event.source.message).toBe('CcmExec.exe started powershell.exe');
  });

  it('returns the new destination in the message after withNetworkDestination', () => {
    const [, event] = withNetworkDestination(world, 'bad.example', {
      domain: 'manage.microsoft.com',
      ip: '20.190.128.10',
      port: 443,
    }).events;
    expect(event.source.message).toBe(
      'powershell.exe connected to manage.microsoft.com (20.190.128.10:443)'
    );
  });

  it('returns a message without a parent after withoutProcessParent', () => {
    const [event] = withoutProcessParent(world, 'powershell.exe').events;
    expect(event.source.message).toBe('powershell.exe started');
  });

  it('returns the new command line and its args after withCommandLine', () => {
    const [event] = withCommandLine(
      world,
      ids.eventId('start'),
      'powershell.exe -File a.ps1'
    ).events;
    expect(event.source.process).toMatchObject({
      command_line: 'powershell.exe -File a.ps1',
      args: ['powershell.exe', '-File', 'a.ps1'],
      args_count: 3,
    });
  });

  it('returns the new file path and name after withFilePath', () => {
    const [event] = withFilePath(world, ids.eventId('start'), 'C:\\dir\\tool.exe').events;
    expect(event.source.file).toEqual({ path: 'C:\\dir\\tool.exe', name: 'tool.exe' });
  });

  it('returns the new executable on every event of the process after withProcessExecutable', () => {
    expect(
      withProcessExecutable(world, 'powershell.exe', 'C:\\other.exe').events.map(
        ({ source }) => (source.process as { executable: string }).executable
      )
    ).toEqual(['C:\\other.exe', 'C:\\other.exe']);
  });

  it.each([
    ['withProcessParent', () => withProcessParent(world, 'nope.exe', { name: 'a.exe', pid: 1 })],
    ['withoutProcessParent', () => withoutProcessParent(world, 'nope.exe')],
    ['withCommandLine', () => withCommandLine(world, 'nope', 'a.exe')],
    ['withFilePath', () => withFilePath(world, 'nope', 'C:\\a.exe')],
    ['withProcessExecutable', () => withProcessExecutable(world, 'nope.exe', 'C:\\a.exe')],
    [
      'withNetworkDestination',
      () => withNetworkDestination(world, 'nope.example', { domain: 'a', ip: '1.1.1.1', port: 1 }),
    ],
  ])('throws from %s when no raw event matches', (_name, rewrite) => {
    expect(rewrite).toThrow('No raw event matches');
  });

  it('returns the remaining events after withoutEventIds', () => {
    expect(withoutEventIds(world, [ids.eventId('start')]).events.map(({ id }) => id)).toEqual([
      ids.eventId('beacon'),
    ]);
  });

  it('returns no network events after withoutEventCategory', () => {
    expect(withoutEventCategory(world, 'network').events.map(({ id }) => id)).toEqual([
      ids.eventId('start'),
    ]);
  });
});
