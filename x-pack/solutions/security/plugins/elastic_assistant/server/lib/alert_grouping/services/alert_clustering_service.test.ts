/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { AlertClusteringService } from './alert_clustering_service';
import { EntityExtractionService } from './entity_extraction_service';
import { DEFAULT_ENTITY_TYPE_CONFIGS } from '../types';
import type { GroupingConfig, ExtractedEntity } from '../types';

describe('AlertClusteringService', () => {
  let logger: MockedLogger;
  let entityService: EntityExtractionService;

  const baseConfig: GroupingConfig = {
    strategy: 'weighted',
    entityTypes: [],
    threshold: 0.7,
    hostPrimaryGrouping: true,
    temporalClustering: { enabled: true, gapThresholdMinutes: 60, minClusterSize: 3 },
    processTree: { enabled: true },
    crossHostCorrelation: { enabled: false },
  };

  const makeAlert = (
    id: string,
    host: string,
    timestamp: string,
    extra: Record<string, unknown> = {}
  ) => ({
    _id: id,
    _index: '.alerts-security.alerts-default',
    _source: {
      '@timestamp': timestamp,
      host: { name: host },
      ...extra,
    },
  });

  const makeEntities = (id: string): ExtractedEntity[] => [
    {
      type: 'observable-type-hostname',
      originalValue: 'host-1',
      normalizedValue: 'host-1',
      sourceAlertId: id,
      sourceField: 'host.name',
      confidence: 1.0,
      occurrenceCount: 1,
      alertIds: [id],
    },
  ];

  beforeEach(() => {
    logger = loggerMock.create();
    entityService = new EntityExtractionService({
      logger,
      entityTypeConfigs: DEFAULT_ENTITY_TYPE_CONFIGS,
    });
  });

  describe('clusterAlerts', () => {
    it('should group alerts by host', () => {
      const alerts = [
        makeAlert('a1', 'host-1', '2026-02-06T09:00:00Z'),
        makeAlert('a2', 'host-1', '2026-02-06T09:01:00Z'),
        makeAlert('a3', 'host-2', '2026-02-06T09:00:00Z'),
        makeAlert('a4', 'host-2', '2026-02-06T09:01:00Z'),
      ];
      const entities = new Map<string, ExtractedEntity[]>();
      alerts.forEach((a) => entities.set(a._id, makeEntities(a._id)));

      const service = new AlertClusteringService({
        logger,
        config: baseConfig,
        entityService,
      });

      const result = service.clusterAlerts(alerts, entities);

      expect(result.metrics.uniqueHosts).toBe(2);
      expect(result.clusters.length).toBe(2);

      const host1Cluster = result.clusters.find((c) => c.hostName === 'host-1');
      const host2Cluster = result.clusters.find((c) => c.hostName === 'host-2');

      expect(host1Cluster?.alertIds).toEqual(['a1', 'a2']);
      expect(host2Cluster?.alertIds).toEqual(['a3', 'a4']);
    });

    it('should split alerts by temporal gap', () => {
      const alerts = [
        makeAlert('a1', 'host-1', '2026-02-06T08:00:00Z'),
        makeAlert('a2', 'host-1', '2026-02-06T08:05:00Z'),
        makeAlert('a3', 'host-1', '2026-02-06T08:10:00Z'),
        // 2-hour gap
        makeAlert('a4', 'host-1', '2026-02-06T10:15:00Z'),
        makeAlert('a5', 'host-1', '2026-02-06T10:20:00Z'),
        makeAlert('a6', 'host-1', '2026-02-06T10:25:00Z'),
      ];
      const entities = new Map<string, ExtractedEntity[]>();
      alerts.forEach((a) => entities.set(a._id, makeEntities(a._id)));

      const service = new AlertClusteringService({
        logger,
        config: baseConfig,
        entityService,
      });

      const result = service.clusterAlerts(alerts, entities);

      // Should be split into 2 temporal clusters for host-1
      expect(result.clusters.length).toBe(2);
      expect(result.clusters[0].alertIds).toEqual(['a1', 'a2', 'a3']);
      expect(result.clusters[1].alertIds).toEqual(['a4', 'a5', 'a6']);
    });

    it('should merge small clusters with neighbors', () => {
      const alerts = [
        makeAlert('a1', 'host-1', '2026-02-06T08:00:00Z'),
        makeAlert('a2', 'host-1', '2026-02-06T08:05:00Z'),
        makeAlert('a3', 'host-1', '2026-02-06T08:10:00Z'),
        // 2-hour gap
        makeAlert('a4', 'host-1', '2026-02-06T10:15:00Z'), // Only 1 alert - below minClusterSize
        // 2-hour gap
        makeAlert('a5', 'host-1', '2026-02-06T12:20:00Z'),
        makeAlert('a6', 'host-1', '2026-02-06T12:25:00Z'),
        makeAlert('a7', 'host-1', '2026-02-06T12:30:00Z'),
      ];
      const entities = new Map<string, ExtractedEntity[]>();
      alerts.forEach((a) => entities.set(a._id, makeEntities(a._id)));

      const service = new AlertClusteringService({
        logger,
        config: baseConfig,
        entityService,
      });

      const result = service.clusterAlerts(alerts, entities);

      // The single alert (a4) should be merged with a neighbor cluster
      // minClusterSize is 3, so a4 alone would be merged
      expect(result.clusters.length).toBe(2);
      // Check total alert count is preserved
      const totalAlerts = result.clusters.reduce((sum, c) => sum + c.alertIds.length, 0);
      expect(totalAlerts).toBe(7);
    });

    it('should not split when temporal clustering is disabled', () => {
      const alerts = [
        makeAlert('a1', 'host-1', '2026-02-06T08:00:00Z'),
        makeAlert('a2', 'host-1', '2026-02-06T12:00:00Z'), // 4-hour gap
      ];
      const entities = new Map<string, ExtractedEntity[]>();
      alerts.forEach((a) => entities.set(a._id, makeEntities(a._id)));

      const service = new AlertClusteringService({
        logger,
        config: { ...baseConfig, temporalClustering: { enabled: false } },
        entityService,
      });

      const result = service.clusterAlerts(alerts, entities);

      expect(result.clusters.length).toBe(1);
      expect(result.clusters[0].alertIds).toEqual(['a1', 'a2']);
    });

    it('should return empty result for empty input', () => {
      const service = new AlertClusteringService({
        logger,
        config: baseConfig,
        entityService,
      });

      const result = service.clusterAlerts([], new Map());

      expect(result.clusters).toEqual([]);
      expect(result.crossHostLinks).toEqual([]);
      expect(result.metrics.totalAlerts).toBe(0);
    });

    it('should annotate clusters with MITRE tactics', () => {
      const alerts = [
        makeAlert('a1', 'host-1', '2026-02-06T09:00:00Z', {
          kibana: {
            alert: {
              rule: {
                threat: [{ tactic: { name: 'Execution' }, technique: [{ id: 'T1059' }] }],
              },
            },
          },
        }),
        makeAlert('a2', 'host-1', '2026-02-06T09:01:00Z', {
          kibana: {
            alert: {
              rule: {
                threat: [{ tactic: { name: 'Persistence' }, technique: [{ id: 'T1543' }] }],
              },
            },
          },
        }),
      ];
      const entities = new Map<string, ExtractedEntity[]>();
      alerts.forEach((a) => entities.set(a._id, makeEntities(a._id)));

      const service = new AlertClusteringService({
        logger,
        config: baseConfig,
        entityService,
      });

      const result = service.clusterAlerts(alerts, entities);

      expect(result.clusters.length).toBe(1);
      expect(result.clusters[0].tactics).toContain('Execution');
      expect(result.clusters[0].tactics).toContain('Persistence');
      expect(result.clusters[0].techniques).toContain('T1059');
      expect(result.clusters[0].techniques).toContain('T1543');
    });

    it('should not create cross-host links when correlation is disabled', () => {
      const alerts = [
        makeAlert('a1', 'host-1', '2026-02-06T09:00:00Z'),
        makeAlert('a2', 'host-2', '2026-02-06T09:00:00Z'),
      ];
      const entities = new Map<string, ExtractedEntity[]>();
      alerts.forEach((a) => entities.set(a._id, makeEntities(a._id)));

      const service = new AlertClusteringService({
        logger,
        config: { ...baseConfig, crossHostCorrelation: { enabled: false } },
        entityService,
      });

      const result = service.clusterAlerts(alerts, entities);

      expect(result.crossHostLinks).toEqual([]);
    });

    it('should not tactic-split clusters when disabled by default', () => {
      // Create a large cluster with many tactics - should NOT split because tacticSubGrouping is not enabled
      const alerts: Array<{ _id: string; _index: string; _source: Record<string, unknown> }> = [];
      for (let i = 0; i < 250; i++) {
        const tactic = [
          'Execution',
          'Persistence',
          'Privilege Escalation',
          'Defense Evasion',
          'Credential Access',
          'Discovery',
          'Lateral Movement',
          'Exfiltration',
        ][i % 8];
        alerts.push(
          makeAlert(`a${i}`, 'host-1', `2026-02-06T09:${String(i % 60).padStart(2, '0')}:00Z`, {
            kibana: {
              alert: {
                rule: {
                  threat: [{ tactic: { name: tactic }, technique: [{ id: `T100${i % 8}` }] }],
                },
              },
            },
          })
        );
      }
      const entities = new Map<string, ExtractedEntity[]>();
      alerts.forEach((a) => entities.set(a._id, makeEntities(a._id)));

      const service = new AlertClusteringService({
        logger,
        config: baseConfig, // tacticSubGrouping not enabled
        entityService,
      });

      const result = service.clusterAlerts(alerts, entities);

      // Should stay as 1 cluster because tactic sub-grouping is disabled by default
      expect(result.clusters.length).toBe(1);
      expect(result.clusters[0].alertIds.length).toBe(250);
    });
  });
});
