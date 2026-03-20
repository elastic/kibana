/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { deduplicateAlerts } from './deduplicate_alerts';
import type { AlertWithId } from './deduplicate_alerts';

const logger = loggingSystemMock.createLogger();
const esClient = elasticsearchServiceMock.createElasticsearchClient();

const makeAlert = (id: string, source: Record<string, unknown>): AlertWithId => ({
  _id: id,
  _source: source,
});

describe('deduplicateAlerts', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns empty result for empty input', async () => {
    const result = await deduplicateAlerts({ alerts: [], esClient, logger });

    expect(result.leaders).toHaveLength(0);
    expect(result.clusters).toHaveLength(0);
    expect(result.stats.totalAlerts).toBe(0);
    expect(result.stats.duplicatesRemoved).toBe(0);
  });

  it('returns a single alert as its own cluster', async () => {
    const alerts = [
      makeAlert('alert-1', {
        kibana: { alert: { rule: { name: 'R1' }, risk_score: 50 } },
        host: { name: 'h1' },
      }),
    ];

    const result = await deduplicateAlerts({ alerts, esClient, logger });

    expect(result.leaders).toHaveLength(1);
    expect(result.clusters).toHaveLength(1);
    expect(result.leaders[0]._id).toBe('alert-1');
    expect(result.stats.duplicatesRemoved).toBe(0);
  });

  it('clusters identical alerts by hash and picks highest risk score as leader', async () => {
    const alerts = [
      makeAlert('alert-low', {
        kibana: { alert: { rule: { name: 'Same Rule' }, risk_score: 10 } },
        host: { name: 'same-host' },
        process: { name: 'cmd.exe' },
      }),
      makeAlert('alert-high', {
        kibana: { alert: { rule: { name: 'Same Rule' }, risk_score: 90 } },
        host: { name: 'same-host' },
        process: { name: 'cmd.exe' },
      }),
    ];

    const result = await deduplicateAlerts({ alerts, esClient, logger });

    expect(result.clusters).toHaveLength(1);
    expect(result.leaders).toHaveLength(1);
    expect(result.leaders[0]._id).toBe('alert-high');
    expect(result.stats.duplicatesRemoved).toBe(1);
  });

  it('keeps alerts from different rules as separate clusters', async () => {
    const alerts = [
      makeAlert('alert-1', {
        kibana: { alert: { rule: { name: 'Rule A' }, risk_score: 50 } },
        host: { name: 'host-a' },
        process: { name: 'alpha.exe' },
      }),
      makeAlert('alert-2', {
        kibana: { alert: { rule: { name: 'Rule B' }, risk_score: 50 } },
        host: { name: 'host-b' },
        process: { name: 'beta.exe' },
      }),
    ];

    const result = await deduplicateAlerts({ alerts, esClient, logger });

    expect(result.clusters).toHaveLength(2);
    expect(result.leaders).toHaveLength(2);
    expect(result.stats.duplicatesRemoved).toBe(0);
  });

  it('clusters similar alerts within the same rule-host group', async () => {
    const alerts = [
      makeAlert('alert-1', {
        kibana: { alert: { rule: { name: 'Rule X' }, risk_score: 30 } },
        host: { name: 'host-1' },
        process: { name: 'powershell.exe' },
        user: { name: 'admin' },
        source: { ip: '10.0.0.1' },
      }),
      makeAlert('alert-2', {
        kibana: { alert: { rule: { name: 'Rule X' }, risk_score: 80 } },
        host: { name: 'host-1' },
        process: { name: 'powershell.exe' },
        user: { name: 'admin' },
        source: { ip: '10.0.0.2' },
      }),
    ];

    const result = await deduplicateAlerts({
      alerts,
      esClient,
      logger,
      similarityThreshold: 0.5,
    });

    expect(result.clusters).toHaveLength(1);
    expect(result.leaders[0]._id).toBe('alert-2');
  });

  it('reports correct stats for multi-cluster scenario', async () => {
    const alerts = [
      makeAlert('a1', {
        kibana: { alert: { rule: { name: 'R1' }, risk_score: 50 } },
        host: { name: 'h1' },
      }),
      makeAlert('a2', {
        kibana: { alert: { rule: { name: 'R1' }, risk_score: 50 } },
        host: { name: 'h1' },
      }),
      makeAlert('a3', {
        kibana: { alert: { rule: { name: 'R2' }, risk_score: 50 } },
        host: { name: 'h2' },
        process: { name: 'unique.exe' },
      }),
    ];

    const result = await deduplicateAlerts({ alerts, esClient, logger, similarityThreshold: 0.5 });

    expect(result.stats.totalAlerts).toBe(3);
    expect(result.stats.uniqueClusters + result.stats.duplicatesRemoved).toBe(3);
  });

  it('logs deduplication info', async () => {
    const alerts = [
      makeAlert('a1', {
        kibana: { alert: { rule: { name: 'R' }, risk_score: 1 } },
        host: { name: 'h' },
      }),
    ];

    await deduplicateAlerts({ alerts, esClient, logger });

    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('deduplicateAlerts:'));
  });
});
