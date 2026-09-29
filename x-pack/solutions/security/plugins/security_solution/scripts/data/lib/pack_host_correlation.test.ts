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
