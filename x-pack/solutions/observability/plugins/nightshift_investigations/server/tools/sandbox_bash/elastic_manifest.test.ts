/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { SandboxSession } from '@kbn/sandbox-plugin/server';
import { renderElasticManifest, writeElasticManifest } from './elastic_manifest';

const connector = (connectorId: string) => ({ kind: 'connector' as const, connectorId });

describe('renderElasticManifest', () => {
  it('tells the agent which connector id unlocks the credentials', () => {
    const content = renderElasticManifest(connector('elasticsearch-telemetry'));

    expect(content).toContain('`connector_id: "elasticsearch-telemetry"`');
    expect(content).toContain('`CONNECTOR_CONFIG_URL`');
    expect(content).toContain('`CONNECTOR_HEADER_AUTHORIZATION`');
    expect(content).toContain('never hard-code their values');
  });

  it('keeps CCS and remote cluster guidance on by default, without naming indices or remotes', () => {
    const content = renderElasticManifest(connector('elasticsearch-telemetry'));

    expect(content).toContain('## Remote clusters');
    expect(content).toContain('cross-cluster search (CCS)');
    expect(content).toContain('`<remote>:<index>`');
    expect(content).toContain('`GET /_remote/info`');
    expect(content).not.toContain('## Local indices');
    expect(content).not.toContain('`logs-*`, `metrics-*`, `traces-*`');
    expect(content).not.toContain('logging-');
  });

  it('uses operator-supplied remote guidance in place of the default', () => {
    const content = renderElasticManifest(connector('remote-telemetry'), {
      readableIndices: 'Read `logging-region:logs-service-*`; no local telemetry is available.',
    });

    expect(content).toContain('Read `logging-region:logs-service-*`');
    expect(content).not.toContain('cross-cluster search (CCS)');
  });

  it('renders local indices before remote clusters when local guidance is set', () => {
    const content = renderElasticManifest(connector('remote-telemetry'), {
      readableIndices: 'Read `logging-region:logs-*`.',
      localIndices: '- `traces-apm.rum-default`: browser traces',
    });

    expect(content).toContain('## Local indices');
    expect(content.indexOf('## Local indices')).toBeLessThan(content.indexOf('## Remote clusters'));
    expect(content).toContain('- `traces-apm.rum-default`: browser traces');
    expect(content.indexOf('Read `logging-region:logs-*`.')).toBeGreaterThan(
      content.indexOf('## Remote clusters')
    );
  });

  it('tells the agent to verify every reported figure with a query', () => {
    const content = renderElasticManifest(connector('elasticsearch-telemetry'));

    expect(content).toContain('not what the data contains');
    expect(content).toContain('must come from a query result in this session');
  });

  it('discovers data with index-level APIs and never recommends cluster-level listing', () => {
    const content = renderElasticManifest(connector('elasticsearch-telemetry'));

    expect(content).toContain('_resolve/index/');
    expect(content).toContain('_field_caps');
    expect(content).toContain('include_unmapped=true');
    expect(content).toContain('`Unknown column [x]` means no index in the `FROM` pattern');
    expect(content).not.toContain('_cat/indices');
    expect(content).not.toContain('_resolve/cluster');
  });

  it('bounds queries and keeps the ES|QL guidance', () => {
    const content = renderElasticManifest(connector('elasticsearch-telemetry'));

    expect(content).toContain('--max-time 120');
    expect(content).toContain('time range');
    expect(content).toContain("jq -n --arg q '<ES|QL>'");
    expect(content).toContain('there is no `python`');
    expect(content).toContain('Never hide a failure');
  });

  it('puts the examples in their own section, last, with placeholders instead of real names', () => {
    const content = renderElasticManifest(connector('elasticsearch-telemetry'));

    expect(content).toContain('## Examples');
    expect(content.indexOf('## Examples')).toBeGreaterThan(content.indexOf('## Query rules'));
    expect(content.indexOf('```bash')).toBeGreaterThan(content.indexOf('## Examples'));
    expect(content).toContain('"$CONNECTOR_CONFIG_URL/_query?format=txt"');
    expect(content).toContain('FROM $1:<index>');
    expect(content).not.toContain('logs-nginx');
    expect(content).not.toContain('2026-');
  });
});

describe('writeElasticManifest', () => {
  it('writes the manifest to /workspace/.connector-docs/elastic.md', async () => {
    const writeFiles = jest.fn().mockResolvedValue([{ bytes_written: 100, success: true }]);
    const session = { writeFiles } as unknown as SandboxSession;

    await writeElasticManifest({
      session,
      credentials: connector('elasticsearch-telemetry'),
      logger: loggingSystemMock.createLogger(),
    });

    expect(writeFiles).toHaveBeenCalledWith([
      { path: '/workspace/.connector-docs/elastic.md', content: expect.any(Buffer) },
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
