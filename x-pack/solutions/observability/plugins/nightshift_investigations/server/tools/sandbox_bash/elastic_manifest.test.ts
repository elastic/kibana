/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { SandboxSession } from '@kbn/sandbox-plugin/server';
import {
  findElasticSecretCredentials,
  renderElasticManifest,
  writeElasticManifest,
} from './elastic_manifest';

const connector = (connectorId: string) => ({ kind: 'connector' as const, connectorId });

describe('renderElasticManifest', () => {
  it('tells the agent which connector id unlocks the credentials', () => {
    const content = renderElasticManifest(connector('elasticsearch-telemetry'));

    expect(content).toContain('`connector_id: "elasticsearch-telemetry"`');
    expect(content).toContain('`CONNECTOR_CONFIG_URL`');
    expect(content).toContain('`CONNECTOR_HEADER_AUTHORIZATION`');
    expect(content).toContain('never hard-code their values');
  });

  it('documents the readable indices and a query example', () => {
    const content = renderElasticManifest(connector('elasticsearch-telemetry'));

    expect(content).toContain('`logs-*`, `metrics-*`, `traces-*`');
    expect(content).toContain('"$CONNECTOR_CONFIG_URL/_remote/info"');
    expect(content).toContain('"$CONNECTOR_CONFIG_URL/_query?format=txt"');
  });

  it('uses operator-supplied remote index guidance and bounds telemetry queries', () => {
    const content = renderElasticManifest(connector('remote-telemetry'), {
      readableIndices: 'Read `logging-region:logs-service-*`; no local telemetry is available.',
    });

    expect(content).toContain('Read `logging-region:logs-service-*`');
    expect(content).not.toContain('FROM *:logs-*');
    expect(content).toContain('--max-time 120');
    expect(content).toContain('@timestamp');
    expect(content).toContain('Name each remote explicitly');
    expect(content).toContain('never use wildcard remote names');
  });

  it('steers remote queries to a specific data stream instead of logs-*', () => {
    const content = renderElasticManifest(connector('remote-telemetry'));

    expect(content).toContain('/_resolve/index/<remote>:logs-*nginx*');
    expect(content).toContain('FROM $1:logs-nginx.error-*');
    expect(content).not.toContain('FROM $1:logs-* ');
  });

  it('tells the agent which secret keys unlock the credentials', () => {
    const content = renderElasticManifest({
      kind: 'secrets',
      urlKey: 'ELASTICSEARCH_ENDPOINT',
      apiKeyKey: 'ELASTICSEARCH_API_KEY',
    });

    expect(content).toContain('`secret_keys: ["ELASTICSEARCH_ENDPOINT", "ELASTICSEARCH_API_KEY"]`');
    expect(content).toContain('"$ELASTICSEARCH_ENDPOINT/_query?format=txt"');
    expect(content).toContain('Authorization: ApiKey $ELASTICSEARCH_API_KEY');
    expect(content).toContain('# secret_keys must be set on every one of these commands');
    expect(content).not.toContain('CONNECTOR_');
  });
});

describe('findElasticSecretCredentials', () => {
  it.each(['ELASTICSEARCH_URL', 'ELASTICSEARCH_ENDPOINT'])(
    'pairs %s with the API key secret',
    (urlKey) => {
      expect(
        findElasticSecretCredentials(['GITHUB_TOKEN', urlKey, 'ELASTICSEARCH_API_KEY'])
      ).toEqual({ kind: 'secrets', urlKey, apiKeyKey: 'ELASTICSEARCH_API_KEY' });
    }
  );

  it.each([[['ELASTICSEARCH_URL']], [['ELASTICSEARCH_API_KEY']], [[]]])(
    'returns nothing for the incomplete pair %j',
    (secretKeys) => {
      expect(findElasticSecretCredentials(secretKeys)).toBeUndefined();
    }
  );
});

describe('writeElasticManifest', () => {
  it('writes the manifest to /workspace/elastic.md', async () => {
    const writeFiles = jest.fn().mockResolvedValue([{ bytes_written: 100, success: true }]);
    const session = { writeFiles } as unknown as SandboxSession;

    await writeElasticManifest({
      session,
      credentials: connector('elasticsearch-telemetry'),
      logger: loggingSystemMock.createLogger(),
    });

    expect(writeFiles).toHaveBeenCalledWith([
      { path: '/workspace/elastic.md', content: expect.any(Buffer) },
    ]);
    const [files] = writeFiles.mock.calls[0];
    expect(files[0].content.toString('utf8')).toContain('# Elasticsearch telemetry');
  });
  it.each([{ results: [] }, { results: [{ bytes_written: 0, success: false }] }])(
    'rejects an unsuccessful per-file response %j',
    async ({ results }) => {
      const writeFiles = jest.fn().mockResolvedValue(results);
      const session = { writeFiles } as unknown as SandboxSession;
      await expect(
        writeElasticManifest({
          session,
          credentials: connector('telemetry'),
          logger: loggingSystemMock.createLogger(),
        })
      ).rejects.toThrow('Failed to write sandbox telemetry guidance');
    }
  );
});
