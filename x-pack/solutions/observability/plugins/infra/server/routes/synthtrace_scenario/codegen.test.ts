/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateInfraScenario } from './codegen';
import { reconstructInfra } from './reconstruct';
import type { InfraCapturedSource } from './reconstruct';

const baseStart = Date.parse('2024-01-01T00:00:00.000Z');
const at = (offsetMs: number): string => new Date(baseStart + offsetMs).toISOString();

const makeMetrics = (): InfraCapturedSource[] => [
  {
    '@timestamp': at(0),
    'metricset.name': 'cpu',
    host: { name: 'host-a', os: { name: 'Ubuntu' }, architecture: 'x86_64' },
    cloud: { provider: 'gcp' },
    // `agent.name` mirrors the host name; it must be scrubbed alongside it.
    agent: { name: 'host-a' },
    system: { cpu: { total: { norm: { pct: 0.42 } }, cores: 8 } },
  },
  {
    '@timestamp': at(10000),
    'metricset.name': 'memory',
    host: { name: 'host-a' },
    system: { memory: { total: 2048, actual: { used: { pct: 0.5 } } } },
  },
  {
    '@timestamp': at(10000),
    'metricset.name': 'cpu',
    host: { name: 'host-b' },
    system: { cpu: { total: { norm: { pct: 0.91 } } } },
  },
  // Dataset-only document (Elastic Agent data stream, no metricset.name).
  {
    '@timestamp': at(20000),
    event: { dataset: 'system.load' },
    host: { name: 'host-a' },
    system: { load: { 1: 3, 5: 2.5, cores: 16 } },
  },
  // Unsupported metricset is ignored.
  {
    '@timestamp': at(0),
    'metricset.name': 'process',
    host: { name: 'host-a' },
    system: { process: { cpu: { total: { pct: 0.1 } } } },
  },
];

// Semconv (native OTel hostmetrics): the host lives under `resource.attributes` keyed by the
// literal dotted `host.name`, dimensions under `attributes.*`, and the metric value under
// `metrics.system.*` (one metric per document, no `metricset.name`).
const makeSemconvMetrics = (): InfraCapturedSource[] => [
  {
    '@timestamp': at(0),
    data_stream: { dataset: 'hostmetricsreceiver.otel', type: 'metrics', namespace: 'default' },
    resource: {
      attributes: { 'host.name': 'otel-host-a', 'os.type': 'linux', 'cloud.provider': 'gcp' },
    },
    attributes: { state: 'user' },
    metrics: {
      system: { cpu: { utilization: 0.21, load_average: { '15m': 1.5 } } },
    },
  },
  {
    '@timestamp': at(10000),
    data_stream: { dataset: 'hostmetricsreceiver.otel', type: 'metrics', namespace: 'default' },
    resource: { attributes: { 'host.name': 'otel-host-a' } },
    attributes: { state: 'used' },
    metrics: { system: { memory: { utilization: 0.66, usage: 11000000000 } } },
  },
  // Disk read IOPS/throughput: the Hosts view filters these on `attributes.direction` and reads the
  // non-prefixed `system.disk.*` field.
  {
    '@timestamp': at(10000),
    data_stream: { dataset: 'hostmetricsreceiver.otel', type: 'metrics', namespace: 'default' },
    resource: { attributes: { 'host.name': 'otel-host-a' } },
    attributes: { direction: 'read', device: 'sda' },
    metrics: { system: { disk: { operations: 1234, io: 567890 } } },
  },
];

// ECS-compatible OTel collector (EDOT): the metric value lands directly under `system.*` (no
// `metrics.` prefix), the inverse of the canonical native-OTel shape.
const makeUnprefixedSemconvMetrics = (): InfraCapturedSource[] => [
  {
    '@timestamp': at(0),
    data_stream: { dataset: 'hostmetricsreceiver.otel', type: 'metrics', namespace: 'default' },
    resource: { attributes: { 'host.name': 'otel-host-a' } },
    attributes: { state: 'idle' },
    system: { cpu: { utilization: 0.93 } },
  },
];

describe('infra capture', () => {
  describe('reconstructInfra', () => {
    it('groups supported host metrics and preserves numeric values', () => {
      const result = reconstructInfra(makeMetrics());

      expect(result.hosts.map((host) => host.name).sort()).toEqual(['host-a', 'host-b']);
      // cpu(host-a) + memory(host-a) + cpu(host-b) + load(host-a) = 4 samples; process is dropped.
      expect(result.samples).toHaveLength(4);

      // Every numeric leaf is captured verbatim, not just a hardcoded subset.
      const cpuSample = result.samples.find((sample) => sample.method === 'cpu');
      expect(cpuSample?.schema).toBe('ecs');
      expect(cpuSample?.fields).toEqual({
        'system.cpu.total.norm.pct': 0.42,
        'system.cpu.cores': 8,
      });

      // `system.load.*` leaves are folded back into the nested object the `load()` builder expects.
      const loadSample = result.samples.find((sample) => sample.method === 'load');
      expect(loadSample).toBeDefined();
      expect(loadSample?.fields).toEqual({ 'system.load': { 1: 3, 5: 2.5, cores: 16 } });
    });

    it('anonymizes host names when scrubbing', () => {
      const result = reconstructInfra(makeMetrics(), { scrub: true });
      expect(result.hosts.map((host) => host.name).sort()).toEqual(['host-1', 'host-2']);
    });

    it('captures host-constant metadata (OS, cloud, architecture) verbatim', () => {
      const result = reconstructInfra(makeMetrics());
      const hostA = result.hosts.find((host) => host.name === 'host-a');
      expect(hostA?.metadata).toMatchObject({
        'host.os.name': 'Ubuntu',
        'host.architecture': 'x86_64',
        'cloud.provider': 'gcp',
        'agent.name': 'host-a',
      });
    });

    it('scrubs name-derived metadata so only the name changes', () => {
      const result = reconstructInfra(makeMetrics(), { scrub: true });
      const host1 = result.hosts.find((host) => host.name === 'host-1');
      // `agent.name` mirrored the raw host name, so it follows the scrubbed name...
      expect(host1?.metadata['agent.name']).toBe('host-1');
      // ...while non-identifying metadata is preserved verbatim.
      expect(host1?.metadata['host.os.name']).toBe('Ubuntu');
      expect(host1?.metadata['cloud.provider']).toBe('gcp');
    });

    it('captures native OTel host metrics: resolves host, translates fields, keeps dimensions', () => {
      const result = reconstructInfra(makeSemconvMetrics());

      // Host resolved from `resource.attributes["host.name"]` (a literal dotted key).
      expect(result.hosts.map((host) => host.name)).toEqual(['otel-host-a']);
      expect(result.samples).toHaveLength(3);

      const cpuSample = result.samples.find((sample) => sample.method === 'cpu');
      expect(cpuSample?.schema).toBe('semconv');
      // The `metrics.system.*` value is preserved AND mirrored to the non-prefixed `system.*` alias
      // the Hosts view reads (synthtrace targets have no OTel field aliases).
      expect(cpuSample?.fields['metrics.system.cpu.utilization']).toBe(0.21);
      expect(cpuSample?.fields['system.cpu.utilization']).toBe(0.21);
      // Load average (bundled in the cpu doc) feeds the Normalized Load KPI.
      expect(cpuSample?.fields['system.cpu.load_average.15m']).toBe(1.5);
      // Dimensions from `attributes.*` are kept for the semconv aggregations, emitted BOTH as the
      // top-level alias and the literal `attributes.*` path.
      expect(cpuSample?.fields.state).toBe('user');
      expect(cpuSample?.fields['attributes.state']).toBe('user');
      expect(cpuSample?.fields['data_stream.dataset']).toBe('hostmetricsreceiver.otel');

      const memorySample = result.samples.find((sample) => sample.method === 'memory');
      expect(memorySample?.fields['system.memory.utilization']).toBe(0.66);
      expect(memorySample?.fields['system.memory.usage']).toBe(11000000000);

      // Disk: the non-prefixed `system.disk.*` field (read by the Disk IOPS/throughput formulas) and
      // the `attributes.direction` dimension those formulas filter on are both emitted.
      const diskSample = result.samples.find((sample) => sample.method === 'disk');
      expect(diskSample?.fields['system.disk.operations']).toBe(1234);
      expect(diskSample?.fields['metrics.system.disk.operations']).toBe(1234);
      expect(diskSample?.fields['system.disk.io']).toBe(567890);
      expect(diskSample?.fields.direction).toBe('read');
      expect(diskSample?.fields['attributes.direction']).toBe('read');
      // `device` is the one dimension whose top-level alias differs (`device.keyword`); the literal
      // `attributes.device` path is emitted alongside it. Both come from generic dimension
      // collection, not a hardcoded list.
      expect(diskSample?.fields['device.keyword']).toBe('sda');
      expect(diskSample?.fields['attributes.device']).toBe('sda');

      // OTel `resource.attributes.*` metadata is mirrored to the ECS-compatible field names the
      // Hosts view reads (which are field aliases on real OTel indices, absent from `_source`).
      const [host] = result.hosts;
      expect(host.metadata).toMatchObject({
        'resource.attributes.os.type': 'linux',
        'host.os.name': 'linux',
        'cloud.provider': 'gcp',
      });
    });

    it('mirrors a non-prefixed `system.*` OTel value to the `metrics.system.*` form the Hosts view reads', () => {
      // Regression: EDOT/ECS-compatible collectors land the value under `system.cpu.utilization`
      // with no `metrics.` prefix. The CPU snapshot reads `metrics.system.cpu.utilization`; without
      // mirroring, its `1 - sum(idle)` saw null and rendered a misleading 100%.
      const result = reconstructInfra(makeUnprefixedSemconvMetrics());
      const cpuSample = result.samples.find((sample) => sample.method === 'cpu');
      expect(cpuSample?.schema).toBe('semconv');
      expect(cpuSample?.fields['system.cpu.utilization']).toBe(0.93);
      expect(cpuSample?.fields['metrics.system.cpu.utilization']).toBe(0.93);
      expect(cpuSample?.fields.state).toBe('idle');
      expect(cpuSample?.fields['attributes.state']).toBe('idle');
    });

    it('throws when there are no supported host metric documents', () => {
      expect(() =>
        reconstructInfra([{ '@timestamp': at(0), 'metricset.name': 'process', host: { name: 'h' } }])
      ).toThrow(/No host metric documents/);
    });
  });

  describe('generateInfraScenario', () => {
    it('emits a runnable infra scenario module anchored to an absolute start', () => {
      const code = generateInfraScenario(reconstructInfra(makeMetrics()), {
        description: 'Captured infra',
      });

      expect(code).toContain("import { infra } from '@kbn/synthtrace-client';");
      expect(code).toContain('const scenario: Scenario<InfraDocument> = async ({ from }) => {');
      expect(code).toContain('clients: { infraEsClient }');
      // Data-driven emission: a `captured` JSON literal parsed at runtime + a fixed builder loop,
      // no per-event `const` and no giant object-literal AST.
      expect(code).toContain('const captured = JSON.parse(');
      expect(code).toContain('infra.host(hostNames.get(id)).overrides(hostMeta.get(id))');
      // Builders are invoked with no typed args; every captured field is applied via `.overrides`.
      expect(code).toContain('host.cpu().overrides(fields)');
      expect(code).toContain('host.load().overrides(fields)');
      expect(code).toContain('.timestamp(ts)');
      expect(code).toContain('"schema":"ecs"');
      expect(code).toContain('yield* rootEvents;');
      expect(code).toMatch(/const start = \d+;/);
      expect(code).toContain('const isFirstWorkerBucket = range.from.getTime() === from;');
      // Host-only scenarios don't need a service environment.
      expect(code).not.toContain('getSynthtraceEnvironment');
      expect(code).not.toContain('range.to.getTime()');
      // The captured method names are present (inside the JSON literal) so the loop can dispatch
      // to the right builder.
      expect(code).toContain('"method":"cpu"');
      expect(code).toContain('"method":"load"');
    });

    it('emits semconv host metrics via the semconvHost builder', () => {
      const code = generateInfraScenario(reconstructInfra(makeSemconvMetrics()), {
        description: 'Captured semconv infra',
      });

      expect(code).toContain('infra.semconvHost(hostNames.get(id)).overrides(hostMeta.get(id))');
      expect(code).toContain('.metricset(fields).timestamp(ts)');
      expect(code).toContain('"schema":"semconv"');
    });
  });
});
