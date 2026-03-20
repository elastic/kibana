/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { extractEntitiesFromAlerts } from './extract_entities';
import type { EntityExtractionConfig } from '../types';

const logger = loggingSystemMock.createLogger();

const makeAlert = (id: string, source: Record<string, unknown>) => ({
  _id: id,
  _source: source,
});

const defaultConfig: EntityExtractionConfig = {
  enabled: true,
  exclusionFilters: {
    user: ['SYSTEM', 'LOCAL SERVICE', 'NETWORK SERVICE'],
    hostname: ['localhost'],
  },
};

describe('extractEntitiesFromAlerts', () => {
  beforeEach(() => jest.clearAllMocks());

  it('extracts IP addresses and detects IPv4 vs IPv6', () => {
    const alerts = [
      makeAlert('a1', {
        source: { ip: '192.168.1.1' },
        destination: { ip: '2001:db8::1' },
      }),
    ];

    const result = extractEntitiesFromAlerts({ alerts, config: defaultConfig, logger });

    const ips = result.entities.filter((e) => e.typeKey === 'ipv4' || e.typeKey === 'ipv6');
    expect(ips).toHaveLength(2);
    expect(ips.find((e) => e.value === '192.168.1.1')?.typeKey).toBe('ipv4');
    expect(ips.find((e) => e.value === '2001:db8::1')?.typeKey).toBe('ipv6');
  });

  it('extracts hostnames', () => {
    const alerts = [makeAlert('a1', { host: { name: 'web-server-01' } })];

    const result = extractEntitiesFromAlerts({ alerts, config: defaultConfig, logger });

    const hostnames = result.entities.filter((e) => e.typeKey === 'hostname');
    expect(hostnames).toHaveLength(1);
    expect(hostnames[0].value).toBe('web-server-01');
  });

  it('filters out excluded values', () => {
    const alerts = [makeAlert('a1', { user: { name: 'SYSTEM' }, host: { name: 'localhost' } })];

    const result = extractEntitiesFromAlerts({ alerts, config: defaultConfig, logger });

    const users = result.entities.filter((e) => e.typeKey === 'user');
    const hosts = result.entities.filter((e) => e.typeKey === 'hostname');
    expect(users).toHaveLength(0);
    expect(hosts).toHaveLength(0);
  });

  it('extracts multiple entity types from a rich alert', () => {
    const alerts = [
      makeAlert('a1', {
        source: { ip: '10.0.0.1' },
        host: { name: 'workstation-5' },
        user: { name: 'jdoe' },
        process: { name: 'explorer.exe', executable: 'C:\\Windows\\explorer.exe' },
        file: { hash: { sha256: 'abc123def456' } },
        url: { full: 'https://evil.com/payload' },
        dns: { question: { name: 'malware.example.com' } },
        agent: { id: 'agent-007' },
        service: { name: 'my-service' },
      }),
    ];

    const result = extractEntitiesFromAlerts({ alerts, config: defaultConfig, logger });

    const typeKeys = new Set(result.entities.map((e) => e.typeKey));
    expect(typeKeys.has('ipv4')).toBe(true);
    expect(typeKeys.has('hostname')).toBe(true);
    expect(typeKeys.has('user')).toBe(true);
    expect(typeKeys.has('process')).toBe(true);
    expect(typeKeys.has('file_hash')).toBe(true);
    expect(typeKeys.has('url')).toBe(true);
    expect(typeKeys.has('domain')).toBe(true);
    expect(typeKeys.has('agent_id')).toBe(true);
    expect(typeKeys.has('service')).toBe(true);
  });

  it('deduplicates entities within the same alert', () => {
    const alerts = [
      makeAlert('a1', {
        source: { ip: '10.0.0.1' },
        client: { ip: '10.0.0.1' },
      }),
    ];

    const result = extractEntitiesFromAlerts({ alerts, config: defaultConfig, logger });

    const ips = result.entities.filter((e) => e.value === '10.0.0.1');
    expect(ips).toHaveLength(1);
  });

  it('preserves same entity across different alerts', () => {
    const alerts = [
      makeAlert('a1', { source: { ip: '10.0.0.1' } }),
      makeAlert('a2', { source: { ip: '10.0.0.1' } }),
    ];

    const result = extractEntitiesFromAlerts({ alerts, config: defaultConfig, logger });

    const ips = result.entities.filter((e) => e.value === '10.0.0.1');
    expect(ips).toHaveLength(2);
    expect(ips[0].alertId).toBe('a1');
    expect(ips[1].alertId).toBe('a2');
  });

  it('returns empty entities for alert with no mapped fields', () => {
    const alerts = [makeAlert('a1', { unmapped: { field: 'value' } })];

    const result = extractEntitiesFromAlerts({ alerts, config: defaultConfig, logger });

    expect(result.entities).toHaveLength(0);
    expect(result.stats.fieldsWithValues).toBe(0);
  });

  it('handles array values in fields', () => {
    const alerts = [makeAlert('a1', { host: { ip: ['10.0.0.1', '10.0.0.2'] } })];

    const result = extractEntitiesFromAlerts({ alerts, config: defaultConfig, logger });

    const ips = result.entities.filter((e) => e.typeKey === 'ipv4');
    expect(ips).toHaveLength(2);
  });

  it('reports correct stats', () => {
    const alerts = [
      makeAlert('a1', {
        source: { ip: '1.2.3.4' },
        user: { name: 'admin' },
      }),
    ];

    const result = extractEntitiesFromAlerts({ alerts, config: defaultConfig, logger });

    expect(result.stats.totalFields).toBeGreaterThan(0);
    expect(result.stats.fieldsWithValues).toBeGreaterThanOrEqual(2);
    expect(result.stats.entitiesExtracted).toBeGreaterThanOrEqual(2);
  });
});
