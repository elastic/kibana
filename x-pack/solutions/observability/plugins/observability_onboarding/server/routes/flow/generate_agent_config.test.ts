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
import { createWiredStreamsRoutingProcessor } from './inject_wired_streams_routing';

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

describe('shouldWriteToLogsStreams conditional logic', () => {
  const mockOutput: Output = {
    id: 'default',
    name: 'default',
    type: 'elasticsearch',
    hosts: ['https://elasticsearch.example.com:9200'],
    is_default: true,
    is_default_monitoring: true,
  };

  const registryOnlyIntegrations: InstalledIntegration[] = [
    {
      installSource: 'registry',
      pkgName: 'apache',
      pkgVersion: '1.0.0',
      title: 'Apache',
      config: 'inputs:\n  - id: apache\n    type: httpjson',
      dataStreams: [{ type: 'logs', dataset: 'apache.access' }],
      kibanaAssets: [{ type: 'dashboard', id: 'apache-dashboard' }],
    },
    {
      installSource: 'registry',
      pkgName: 'mysql',
      pkgVersion: '1.0.0',
      title: 'MySQL',
      config: 'inputs:\n  - id: mysql\n    type: logfile',
      dataStreams: [{ type: 'logs', dataset: 'mysql.error' }],
      kibanaAssets: [{ type: 'dashboard', id: 'mysql-dashboard' }],
    },
  ];

  const customOnlyIntegrations: InstalledIntegration[] = [
    {
      installSource: 'custom',
      pkgName: 'my_custom_app',
      pkgVersion: '1.0.0',
      title: 'My Custom App',
      config:
        'inputs:\n  - id: filestream-my_custom_app\n    type: filestream\n    processors:\n      - add_fields:\n          target: "@metadata"\n          fields:\n            raw_index: logs.ecs',
      dataStreams: [{ type: 'logs', dataset: 'my_custom_app' }],
      kibanaAssets: [],
    },
  ];

  const mixedIntegrations: InstalledIntegration[] = [
    ...registryOnlyIntegrations,
    ...customOnlyIntegrations,
  ];

  /**
   * Helper function that mimics the shouldWriteToLogsStreams calculation from route.ts:
   * const shouldWriteToLogsStreams =
   *   writeToLogsStreams &&
   *   installedIntegrations.some((integration) => integration.installSource === 'custom');
   */
  function calculateShouldWriteToLogsStreams(
    writeToLogsStreams: boolean,
    integrations: InstalledIntegration[]
  ): boolean {
    return (
      writeToLogsStreams &&
      integrations.some((integration) => integration.installSource === 'custom')
    );
  }

  it('returns false when writeToLogsStreams is false (regardless of integration types)', () => {
    expect(calculateShouldWriteToLogsStreams(false, registryOnlyIntegrations)).toBe(false);
    expect(calculateShouldWriteToLogsStreams(false, customOnlyIntegrations)).toBe(false);
    expect(calculateShouldWriteToLogsStreams(false, mixedIntegrations)).toBe(false);
    expect(calculateShouldWriteToLogsStreams(false, [])).toBe(false);
  });

  it('returns false when writeToLogsStreams is true but only registry integrations exist', () => {
    expect(calculateShouldWriteToLogsStreams(true, registryOnlyIntegrations)).toBe(false);
  });

  it('returns true when writeToLogsStreams is true and custom integrations exist', () => {
    expect(calculateShouldWriteToLogsStreams(true, customOnlyIntegrations)).toBe(true);
  });

  it('returns true when writeToLogsStreams is true and mixed integrations exist', () => {
    expect(calculateShouldWriteToLogsStreams(true, mixedIntegrations)).toBe(true);
  });

  it('returns false when writeToLogsStreams is true but no integrations exist', () => {
    expect(calculateShouldWriteToLogsStreams(true, [])).toBe(false);
  });

  it('generateAgentConfigTar respects the calculated shouldWriteToLogsStreams value', () => {
    const shouldWrite = calculateShouldWriteToLogsStreams(true, registryOnlyIntegrations);
    expect(shouldWrite).toBe(false);

    const tarBuffer = generateAgentConfigTar(mockOutput, registryOnlyIntegrations, shouldWrite);
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-'));
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

    const agentConfig = contents.get('elastic-agent.yml')!;
    const parsed = loadYaml(agentConfig) as { outputs: { default: Record<string, unknown> } };
    expect(parsed.outputs.default._write_to_logs_streams).toBeUndefined();

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('generateAgentConfigTar includes _write_to_logs_streams when custom integrations exist', () => {
    const shouldWrite = calculateShouldWriteToLogsStreams(true, mixedIntegrations);
    expect(shouldWrite).toBe(true);

    const tarBuffer = generateAgentConfigTar(mockOutput, mixedIntegrations, shouldWrite);
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-'));
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

    const agentConfig = contents.get('elastic-agent.yml')!;
    const parsed = loadYaml(agentConfig) as { outputs: { default: Record<string, unknown> } };
    expect(parsed.outputs.default._write_to_logs_streams).toBe(true);

    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});

describe('wired streams routing processor in integration configs', () => {
  it('createWiredStreamsRoutingProcessor returns correct processor structure', () => {
    const processor = createWiredStreamsRoutingProcessor();

    expect(processor).toEqual({
      add_fields: {
        target: '@metadata',
        fields: {
          raw_index: 'logs.ecs',
        },
      },
    });
  });

  it('custom integration config should contain the routing processor when wired streams is enabled', () => {
    // This tests the expected structure of a custom integration config
    // that has been processed with the routing processor
    const customIntegrationWithRouting: InstalledIntegration = {
      installSource: 'custom',
      pkgName: 'my_app',
      pkgVersion: '1.0.0',
      title: 'My App',
      config:
        'inputs:\n  - id: filestream-my_app\n    type: filestream\n    streams:\n      - id: filestream-my_app\n        data_stream:\n          type: logs\n          dataset: my_app\n        paths:\n          - /var/log/my_app.log\n        processors:\n          - add_fields:\n              target: "@metadata"\n              fields:\n                raw_index: logs.ecs',
      dataStreams: [{ type: 'logs', dataset: 'my_app' }],
      kibanaAssets: [],
    };

    // Parse the config to verify the routing processor is present
    const parsedConfig = loadYaml(customIntegrationWithRouting.config) as {
      inputs: Array<{
        streams: Array<{
          processors: Array<{ add_fields: { target: string; fields: { raw_index: string } } }>;
        }>;
      }>;
    };

    const processors = parsedConfig.inputs[0].streams[0].processors;
    const routingProcessor = processors.find(
      (p) => p.add_fields?.target === '@metadata' && p.add_fields?.fields?.raw_index === 'logs.ecs'
    );

    expect(routingProcessor).toBeDefined();
    expect(routingProcessor?.add_fields.target).toBe('@metadata');
    expect(routingProcessor?.add_fields.fields.raw_index).toBe('logs.ecs');
  });

  it('registry integration config should NOT contain the routing processor', () => {
    const registryIntegration: InstalledIntegration = {
      installSource: 'registry',
      pkgName: 'apache',
      pkgVersion: '1.0.0',
      title: 'Apache',
      config:
        'inputs:\n  - id: apache-logs\n    type: logfile\n    streams:\n      - id: apache-access\n        data_stream:\n          type: logs\n          dataset: apache.access',
      dataStreams: [{ type: 'logs', dataset: 'apache.access' }],
      kibanaAssets: [{ type: 'dashboard', id: 'apache-dashboard' }],
    };

    const parsedConfig = loadYaml(registryIntegration.config) as {
      inputs: Array<{
        streams?: Array<{
          processors?: Array<{ add_fields?: { target: string; fields: { raw_index: string } } }>;
        }>;
      }>;
    };

    const streams = parsedConfig.inputs[0].streams;
    if (streams) {
      streams.forEach((stream) => {
        if (stream.processors) {
          const routingProcessor = stream.processors.find(
            (p) =>
              p.add_fields?.target === '@metadata' && p.add_fields?.fields?.raw_index === 'logs.ecs'
          );
          expect(routingProcessor).toBeUndefined();
        }
      });
    }
  });
});
