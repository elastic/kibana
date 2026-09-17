/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';
import { loadEpisode, readNdjson, stampEpisodeCloudAccountIds } from './episodes';

describe('episodes fixtures', () => {
  const createdFiles: string[] = [];

  const createNdjsonFile = (lines: string[]): string => {
    const tmpRoot = path.join(
      process.cwd(),
      'target',
      'security_solution_data_generator_episode_tests'
    );
    fs.mkdirSync(tmpRoot, { recursive: true });
    const filePath = path.join(
      tmpRoot,
      `episode-${Date.now()}-${Math.random().toString(16).slice(2)}.ndjson`
    );
    fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
    createdFiles.push(filePath);
    return filePath;
  };

  afterEach(() => {
    for (const file of createdFiles) {
      fs.rmSync(file, { force: true });
    }
    createdFiles.length = 0;
  });

  it('throws file:line on JSON parse error', async () => {
    const filePath = createNdjsonFile([
      JSON.stringify({ ok: true }),
      // Invalid JSON (missing closing brace)
      '{"ok":',
    ]);

    await expect(readNdjson(filePath)).rejects.toThrow(`${filePath}:2`);
  });

  it('throws file:line when NDJSON line is not an object', async () => {
    const filePath = createNdjsonFile([JSON.stringify(['not-an-object'])]);

    await expect(readNdjson(filePath)).rejects.toThrow(`${filePath}:1`);
  });

  it('validates endpoint-like fixtures and fails with file:line', async () => {
    const dataPath = createNdjsonFile([
      JSON.stringify({
        '@timestamp': '2023-01-01T00:00:00.000Z',
        event: {
          kind: 'event',
          module: 'endpoint',
          dataset: 'endpoint.events.process',
          created: '2023-01-01T00:00:00.000Z',
        },
        data_stream: { type: 'logs', dataset: 'endpoint.events.process', namespace: 'default' },
      }),
    ]);

    // This is endpoint-like but has the wrong event.kind for an alerts fixture
    const alertsPath = createNdjsonFile([
      JSON.stringify({
        '@timestamp': '2023-01-01T00:00:01.000Z',
        event: {
          kind: 'event',
          module: 'endpoint',
          dataset: 'endpoint.alerts',
          created: '2023-01-01T00:00:01.000Z',
        },
        data_stream: { type: 'logs', dataset: 'endpoint.alerts', namespace: 'default' },
      }),
    ]);

    await expect(loadEpisode({ episodeId: 'epX', dataPath, alertsPath })).rejects.toThrow(
      `${alertsPath}:1`
    );
  });

  it('can skip fixture validation', async () => {
    const dataPath = createNdjsonFile([
      JSON.stringify({
        '@timestamp': '2023-01-01T00:00:00.000Z',
        event: {
          kind: 'event',
          module: 'endpoint',
          dataset: 'endpoint.events.process',
          created: '2023-01-01T00:00:00.000Z',
        },
        data_stream: { type: 'logs', dataset: 'endpoint.events.process', namespace: 'default' },
      }),
    ]);

    // Same "wrong kind" doc as above, but we will disable validation
    const alertsPath = createNdjsonFile([
      JSON.stringify({
        '@timestamp': '2023-01-01T00:00:01.000Z',
        event: {
          kind: 'event',
          module: 'endpoint',
          dataset: 'endpoint.alerts',
          created: '2023-01-01T00:00:01.000Z',
        },
        data_stream: { type: 'logs', dataset: 'endpoint.alerts', namespace: 'default' },
      }),
    ]);

    await expect(
      loadEpisode({ episodeId: 'epX', dataPath, alertsPath }, { validateFixtures: false })
    ).resolves.toMatchObject({ episodeId: 'epX' });
  });
});

describe('stampEpisodeCloudAccountIds', () => {
  it('stamps cloud.account.id onto ep1 docs', () => {
    const doc: Record<string, unknown> = { host: { name: 'h' } };
    stampEpisodeCloudAccountIds(doc, 'ep1');
    expect(doc.cloud).toEqual({ account: { id: '123456789012' } });
  });

  it('leaves docs from other episodes untouched', () => {
    const doc: Record<string, unknown> = { host: { name: 'h' } };
    stampEpisodeCloudAccountIds(doc, 'ep2');
    expect(doc.cloud).toBeUndefined();
  });

  it('preserves existing cloud fields and other host/user fields', () => {
    const doc: Record<string, unknown> = {
      host: { name: 'WIN-ANALYST01' },
      user: { name: 'dev-user' },
      cloud: { provider: 'aws', region: 'us-east-1' },
    };
    stampEpisodeCloudAccountIds(doc, 'ep1');
    expect(doc.cloud).toEqual({
      provider: 'aws',
      region: 'us-east-1',
      account: { id: '123456789012' },
    });
    expect(doc.host).toEqual({ name: 'WIN-ANALYST01' });
    expect(doc.user).toEqual({ name: 'dev-user' });
  });

  it('does not clobber an existing cloud.account when re-stamped', () => {
    const doc: Record<string, unknown> = {
      cloud: { account: { id: 'preexisting' }, provider: 'aws' },
    };
    stampEpisodeCloudAccountIds(doc, 'ep1');
    expect(doc.cloud).toEqual({ provider: 'aws', account: { id: '123456789012' } });
  });
});
