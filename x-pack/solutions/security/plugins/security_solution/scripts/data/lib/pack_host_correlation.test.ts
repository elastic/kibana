/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildFleetAgentDoc,
  buildProcessDoc,
  PACK_HOST_CORRELATION_CONFIGS,
  resolveProcessAnchorMs,
} from './pack_host_correlation';

describe('aws-iam host correlation config', () => {
  const config = PACK_HOST_CORRELATION_CONFIGS['aws-iam'];

  it('pins the DC2 entity join host and the deterministic agent id', () => {
    expect(config.hostName).toBe('WIN-ANALYST01');
    expect(config.agentId).toBe('a1b2c3d4-5e6f-4a1b-9c2d-3e4f5a6b7c8d');
    expect(config.episodeId).toBe('aws-iam-win-analyst01');
  });

  it('pins the cmd.exe -> powershell.exe -> aws.exe process chain', () => {
    expect(config.processTree?.map((node) => node.name)).toEqual([
      'cmd.exe',
      'powershell.exe',
      'aws.exe',
    ]);
    expect(
      config.processTree?.every((node) => !/-enc|FromBase64|IEX/i.test(node.commandLine))
    ).toBe(true);
  });

  it('chains process parent/child pids, entity ids, and names', () => {
    const [cmd, powershell, aws] = config.processTree ?? [];
    expect(powershell.parent).toEqual({ pid: cmd.pid, entityId: cmd.entityId, name: cmd.name });
    expect(aws.parent).toEqual({
      pid: powershell.pid,
      entityId: powershell.entityId,
      name: powershell.name,
    });
  });
});

describe('okta host correlation config', () => {
  const config = PACK_HOST_CORRELATION_CONFIGS.okta;

  it('pins ADMIN-WS02 to the okta Fleet agent id', () => {
    expect(config.hostName).toBe('ADMIN-WS02');
    expect(config.agentId).toBe('d4e5f6a7-8b9c-4d1e-af3a-5b6c7d8e9f0a');
    expect(config.episodeId).toBe('okta-admin-ws02');
  });

  it('pins the explorer.exe -> powershell.exe -> curl.exe process chain with plain commands', () => {
    expect(config.processTree?.map((node) => node.name)).toEqual([
      'explorer.exe',
      'powershell.exe',
      'curl.exe',
    ]);
    expect(
      config.processTree?.every(
        (node) => !/-enc|FromBase64|IEX|DownloadString/i.test(node.commandLine)
      )
    ).toBe(true);
  });

  it('chains process parent/child pids, entity ids, and names', () => {
    const [explorer, powershell, curl] = config.processTree ?? [];
    expect(explorer.parent).toBeUndefined();
    expect(powershell.parent).toEqual({
      pid: explorer.pid,
      entityId: explorer.entityId,
      name: explorer.name,
    });
    expect(curl.parent).toEqual({
      pid: powershell.pid,
      entityId: powershell.entityId,
      name: powershell.name,
    });
  });

  it('gives every node a distinct entity id and pid', () => {
    const nodes = config.processTree ?? [];
    expect(new Set(nodes.map((node) => node.entityId)).size).toBe(nodes.length);
    expect(new Set(nodes.map((node) => node.pid)).size).toBe(nodes.length);
  });

  it('shapes child process docs with process.parent.name and the okta agent id', () => {
    const [, powershell, curl] = config.processTree ?? [];
    const anchorMs = 1_700_000_000_000;
    for (const node of [powershell, curl]) {
      expect(buildProcessDoc(config, node, anchorMs)).toMatchObject({
        agent: { id: config.agentId, type: 'endpoint' },
        host: { name: 'ADMIN-WS02' },
        process: { entity_id: node.entityId, parent: { name: node.parent?.name } },
      });
    }
  });
});

describe('resolveProcessAnchorMs', () => {
  const day = 24 * 60 * 60 * 1000;

  it('prefers three days before endMs when the window is long enough', () => {
    const endMs = Date.parse('2026-07-21T00:00:00.000Z');
    const startMs = endMs - 30 * day;
    expect(resolveProcessAnchorMs(startMs, endMs)).toBe(endMs - 3 * day);
  });

  it('clamps into the requested window when the window is shorter than three days', () => {
    const endMs = Date.parse('2026-07-21T00:00:00.000Z');
    const startMs = endMs - day;
    expect(resolveProcessAnchorMs(startMs, endMs)).toBe(startMs + Math.floor(day / 2));
    expect(resolveProcessAnchorMs(startMs, endMs)).toBeGreaterThanOrEqual(startMs);
    expect(resolveProcessAnchorMs(startMs, endMs)).toBeLessThan(endMs);
  });
});

describe('buildFleetAgentDoc', () => {
  const config = PACK_HOST_CORRELATION_CONFIGS['aws-iam'];

  it('shapes a .fleet-agents document Fleet can resolve by hostname', () => {
    const doc = buildFleetAgentDoc(config);
    expect(doc).toMatchObject({
      active: true,
      access_api_key_id: config.accessApiKeyId,
      agent: { id: config.agentId, version: config.agentVersion },
      local_metadata: {
        host: {
          hostname: config.hostName,
          name: config.hostName,
          id: config.host.hostId,
        },
      },
      policy_id: config.policyId,
      type: 'PERMANENT',
    });
  });
});

describe('buildProcessDoc', () => {
  const config = PACK_HOST_CORRELATION_CONFIGS['aws-iam'];
  const anchorMs = 1_700_000_000_000;

  it('shapes an endpoint.events.process document keyed to the seeded agent/host', () => {
    const [cmd] = config.processTree ?? [];
    const doc = buildProcessDoc(config, cmd, anchorMs);
    expect(doc).toMatchObject({
      '@timestamp': new Date(anchorMs + cmd.offsetMs).toISOString(),
      agent: { id: config.agentId, type: 'endpoint' },
      host: { name: config.hostName, id: config.host.hostId },
      process: { pid: cmd.pid, entity_id: cmd.entityId, name: cmd.name },
    });
  });

  it('includes the parent pid/entity_id/name for non-root process nodes', () => {
    const [cmd, powershell] = config.processTree ?? [];
    const doc = buildProcessDoc(config, powershell, anchorMs) as {
      process: Record<string, unknown>;
    };
    expect(doc.process.parent).toEqual({
      pid: cmd.pid,
      entity_id: cmd.entityId,
      name: cmd.name,
    });
  });
});
