/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as tar from 'tar';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { load as loadYaml } from 'js-yaml';
import type { Output } from '@kbn/fleet-plugin/common/types';
import { generateAgentConfigTar } from './generate_agent_config';
import type { InstalledIntegration } from '../types';

// Mock the Fleet transformation function
jest.mock('@kbn/fleet-plugin/server/services/output_client', () => ({
  transformOutputToFullPolicyOutput: jest.fn((output: Output) => ({
    type: output.type,
    hosts: output.hosts,
    api_key: 'test-api-key',
  })),
}));

describe('generateAgentConfigTar', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'generate-agent-config-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const mockOutput: Output = {
    id: 'default',
    name: 'default',
    type: 'elasticsearch',
    hosts: ['https://elasticsearch.example.com:9200'],
    is_default: true,
    is_default_monitoring: true,
  };

  const mockIntegrations: InstalledIntegration[] = [
    {
      installSource: 'registry',
      pkgName: 'system',
      pkgVersion: '1.0.0',
      title: 'System',
      config: 'inputs:\n  - id: system\n    type: system/metrics',
      dataStreams: [{ type: 'logs', dataset: 'system.syslog' }],
      kibanaAssets: [],
    },
    {
      installSource: 'custom',
      pkgName: 'my_app',
      pkgVersion: '1.0.0',
      title: 'My App',
      config: 'inputs:\n  - id: my_app\n    type: filestream',
      dataStreams: [{ type: 'logs', dataset: 'my_app' }],
      kibanaAssets: [],
    },
  ];

  function extractTarContents(tarBuffer: Buffer): Map<string, string> {
    const contents = new Map<string, string>();
    tar
      .extract({
        sync: true,
        cwd: tempDir,
        onReadEntry: (readEntry) => {
          let data = '';
          readEntry.on('data', (buffer) => {
            data += buffer.toString();
          });
          readEntry.on('end', () => {
            contents.set(readEntry.path, data);
          });
        },
      })
      .write(tarBuffer);
    return contents;
  }

  it('generates tar archive with elastic-agent.yml and inputs.d directory', () => {
    const tarBuffer = generateAgentConfigTar(mockOutput, mockIntegrations);
    const contents = extractTarContents(tarBuffer);

    expect(contents.has('elastic-agent.yml')).toBe(true);
    expect(contents.has('inputs.d/')).toBe(true);
    expect(contents.has('inputs.d/system.yml')).toBe(true);
    expect(contents.has('inputs.d/my_app.yml')).toBe(true);
  });

  it('does NOT include _write_to_logs_streams when writeToLogsStreams is false', () => {
    const tarBuffer = generateAgentConfigTar(mockOutput, mockIntegrations, false);
    const contents = extractTarContents(tarBuffer);

    const agentConfig = contents.get('elastic-agent.yml')!;
    const parsed = loadYaml(agentConfig) as { outputs: { default: Record<string, unknown> } };

    expect(parsed.outputs.default._write_to_logs_streams).toBeUndefined();
  });

  it('does NOT include _write_to_logs_streams when writeToLogsStreams is undefined', () => {
    const tarBuffer = generateAgentConfigTar(mockOutput, mockIntegrations);
    const contents = extractTarContents(tarBuffer);

    const agentConfig = contents.get('elastic-agent.yml')!;
    const parsed = loadYaml(agentConfig) as { outputs: { default: Record<string, unknown> } };

    expect(parsed.outputs.default._write_to_logs_streams).toBeUndefined();
  });

  it('includes _write_to_logs_streams: true when writeToLogsStreams is true', () => {
    const tarBuffer = generateAgentConfigTar(mockOutput, mockIntegrations, true);
    const contents = extractTarContents(tarBuffer);

    const agentConfig = contents.get('elastic-agent.yml')!;
    const parsed = loadYaml(agentConfig) as { outputs: { default: Record<string, unknown> } };

    expect(parsed.outputs.default._write_to_logs_streams).toBe(true);
  });

  it('preserves other output configuration when adding wired streams', () => {
    const tarBuffer = generateAgentConfigTar(mockOutput, mockIntegrations, true);
    const contents = extractTarContents(tarBuffer);

    const agentConfig = contents.get('elastic-agent.yml')!;
    const parsed = loadYaml(agentConfig) as { outputs: { default: Record<string, unknown> } };

    expect(parsed.outputs.default.type).toBe('elasticsearch');
    expect(parsed.outputs.default.hosts).toEqual(['https://elasticsearch.example.com:9200']);
    expect(parsed.outputs.default.api_key).toBe('test-api-key');
    expect(parsed.outputs.default._write_to_logs_streams).toBe(true);
  });

  it('includes integration configs in inputs.d directory', () => {
    const tarBuffer = generateAgentConfigTar(mockOutput, mockIntegrations, false);
    const contents = extractTarContents(tarBuffer);

    const systemConfig = contents.get('inputs.d/system.yml');
    expect(systemConfig).toContain('system/metrics');

    const myAppConfig = contents.get('inputs.d/my_app.yml');
    expect(myAppConfig).toContain('filestream');
  });

  it('handles empty integrations list', () => {
    const tarBuffer = generateAgentConfigTar(mockOutput, [], true);
    const contents = extractTarContents(tarBuffer);

    expect(contents.has('elastic-agent.yml')).toBe(true);
    expect(contents.has('inputs.d/')).toBe(true);

    // Should only have agent config and directory, no integration files
    const files = Array.from(contents.keys());
    expect(files.filter((f) => f.startsWith('inputs.d/') && f !== 'inputs.d/')).toHaveLength(0);
  });
});
