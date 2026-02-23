/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import {
  StaticAnalysisService,
  type CaseSimilarityInput,
} from './static_analysis_service';
import { ObservableTypeKey } from '../types';
import type { AlertCluster, ExtractedEntity } from '../types';

describe('StaticAnalysisService', () => {
  let logger: MockedLogger;
  let service: StaticAnalysisService;

  beforeEach(() => {
    logger = loggerMock.create();
    service = new StaticAnalysisService({ logger });
  });

  // ============================================================
  // Helper factories
  // ============================================================

  const makeEntity = (
    type: ObservableTypeKey,
    value: string,
    alertIds: string[] = ['alert-1']
  ): ExtractedEntity => ({
    type,
    originalValue: value,
    normalizedValue: value.toLowerCase(),
    sourceAlertId: alertIds[0],
    sourceField: 'test.field',
    confidence: 1.0,
    occurrenceCount: alertIds.length,
    alertIds,
  });

  const makeCluster = (overrides: Partial<AlertCluster> = {}): AlertCluster => ({
    id: 'cluster-1',
    hostName: 'host-1',
    alertIds: ['alert-1', 'alert-2', 'alert-3'],
    alertIndices: new Map([
      ['alert-1', '.alerts-security-1'],
      ['alert-2', '.alerts-security-1'],
      ['alert-3', '.alerts-security-1'],
    ]),
    earliestTimestamp: '2025-01-15T10:00:00Z',
    latestTimestamp: '2025-01-15T12:00:00Z',
    tactics: ['Execution', 'Defense Evasion'],
    techniques: ['T1059', 'T1036'],
    processTrees: [],
    entities: [
      makeEntity(ObservableTypeKey.Hostname, 'host-1'),
      makeEntity(ObservableTypeKey.IPv4, '10.0.0.1'),
    ],
    crossHostLinks: [],
    confidence: 0.85,
    description: 'Test cluster',
    alerts: [
      {
        _id: 'alert-1',
        _index: '.alerts-security-1',
        _source: {
          '@timestamp': '2025-01-15T10:00:00Z',
          'kibana.alert.rule.name': 'Suspicious Script Execution',
        },
      },
      {
        _id: 'alert-2',
        _index: '.alerts-security-1',
        _source: {
          '@timestamp': '2025-01-15T11:00:00Z',
          'kibana.alert.rule.name': 'Masquerading Detected',
        },
      },
      {
        _id: 'alert-3',
        _index: '.alerts-security-1',
        _source: {
          '@timestamp': '2025-01-15T12:00:00Z',
          'kibana.alert.rule.name': 'Suspicious Script Execution',
        },
      },
    ],
    ...overrides,
  });

  const makeSimilarityInput = (
    overrides: Partial<CaseSimilarityInput> = {}
  ): CaseSimilarityInput => ({
    caseId: 'case-1',
    caseTitle: 'Test Case',
    entities: [
      makeEntity(ObservableTypeKey.Hostname, 'host-1'),
      makeEntity(ObservableTypeKey.IPv4, '10.0.0.1'),
    ],
    techniques: ['T1059', 'T1036'],
    ruleNames: ['Suspicious Script Execution', 'Masquerading Detected'],
    earliestTimestamp: '2025-01-15T10:00:00Z',
    latestTimestamp: '2025-01-15T12:00:00Z',
    hostNames: ['host-1'],
    ...overrides,
  });

  // ============================================================
  // 1. Rule-Based Classification
  // ============================================================

  describe('classifyCluster', () => {
    it('should classify a cluster with Impact tactics as Ransomware / Destructive Attack', () => {
      const cluster = makeCluster({ tactics: ['Execution', 'Impact'] });
      const result = service.classifyCluster(cluster);

      expect(result.classification).toBe('Ransomware / Destructive Attack');
      expect(result.description).toContain('Destructive activity detected');
      expect(result.description).toContain('host-1');
    });

    it('should classify a cluster with Exfiltration as Data Exfiltration', () => {
      const cluster = makeCluster({ tactics: ['Collection', 'Exfiltration'] });
      const result = service.classifyCluster(cluster);

      expect(result.classification).toBe('Data Exfiltration');
      expect(result.description).toContain('exfiltration');
    });

    it('should classify a cluster with Lateral Movement', () => {
      const cluster = makeCluster({
        tactics: ['Execution', 'Lateral Movement', 'Discovery'],
      });
      const result = service.classifyCluster(cluster);

      expect(result.classification).toBe('Lateral Movement Campaign');
      expect(result.description).toContain('Lateral movement');
    });

    it('should classify Credential Access clusters', () => {
      const cluster = makeCluster({
        tactics: ['Credential Access', 'Discovery'],
      });
      const result = service.classifyCluster(cluster);

      expect(result.classification).toBe('Credential Theft');
    });

    it('should classify C2 clusters', () => {
      const cluster = makeCluster({
        tactics: ['Command and Control', 'Execution'],
      });
      const result = service.classifyCluster(cluster);

      expect(result.classification).toBe('Command and Control Activity');
    });

    it('should classify multi-tactic malware deployment (Execution + Persistence + Defense Evasion)', () => {
      const cluster = makeCluster({
        tactics: ['Execution', 'Persistence', 'Defense Evasion'],
      });
      const result = service.classifyCluster(cluster);

      expect(result.classification).toBe('Malware Deployment');
      expect(result.description).toContain('malware');
    });

    it('should classify Privilege Escalation', () => {
      const cluster = makeCluster({
        tactics: ['Privilege Escalation'],
      });
      const result = service.classifyCluster(cluster);

      expect(result.classification).toBe('Privilege Escalation Attempt');
    });

    it('should classify Discovery-only clusters', () => {
      const cluster = makeCluster({ tactics: ['Discovery'] });
      const result = service.classifyCluster(cluster);

      expect(result.classification).toBe('Reconnaissance & Discovery');
    });

    it('should fall back to dominant tactic when no rule matches', () => {
      const cluster = makeCluster({ tactics: ['Collection'] });
      const result = service.classifyCluster(cluster);

      expect(result.classification).toBe('Collection Activity');
    });

    it('should handle clusters with no tactics', () => {
      const cluster = makeCluster({ tactics: [], techniques: [] });
      const result = service.classifyCluster(cluster);

      expect(result.classification).toBe('Unclassified Alert Cluster');
      expect(result.description).toContain('No specific MITRE tactics');
    });

    it('should prioritize higher-severity classifications (Impact > Lateral Movement)', () => {
      const cluster = makeCluster({
        tactics: ['Impact', 'Lateral Movement', 'Execution'],
      });
      const result = service.classifyCluster(cluster);

      // Impact has priority 0, Lateral Movement has priority 2
      expect(result.classification).toBe('Ransomware / Destructive Attack');
    });
  });

  // ============================================================
  // 2. Static Attack Summary
  // ============================================================

  describe('generateAttackSummary', () => {
    it('should generate a structured summary with all fields', () => {
      const cluster = makeCluster();
      const alerts = cluster.alerts!;
      const summary = service.generateAttackSummary(cluster, alerts);

      expect(summary.title).toContain('host-1');
      expect(summary.title).toContain('3 alerts');
      expect(summary.classification).toBeDefined();
      expect(summary.severity).toBeDefined();
      expect(summary.killChain).toEqual(['Execution', 'Defense Evasion']);
      expect(summary.techniques).toEqual(['T1059', 'T1036']);
      expect(summary.topRules).toHaveLength(2);
      expect(summary.topRules[0].name).toBe('Suspicious Script Execution');
      expect(summary.topRules[0].count).toBe(2);
    });

    it('should derive critical severity for Impact tactics', () => {
      const cluster = makeCluster({ tactics: ['Impact', 'Execution'] });
      const summary = service.generateAttackSummary(cluster, cluster.alerts!);

      expect(summary.severity).toBe('critical');
    });

    it('should derive high severity for C2 tactics', () => {
      const cluster = makeCluster({ tactics: ['Command and Control'] });
      const summary = service.generateAttackSummary(cluster, cluster.alerts!);

      expect(summary.severity).toBe('high');
    });

    it('should derive medium severity for 3+ tactics', () => {
      const cluster = makeCluster({
        tactics: ['Execution', 'Discovery', 'Collection'],
      });
      const summary = service.generateAttackSummary(cluster, cluster.alerts!);

      expect(summary.severity).toBe('medium');
    });

    it('should derive low severity for single non-critical tactic', () => {
      const cluster = makeCluster({ tactics: ['Discovery'] });
      const summary = service.generateAttackSummary(cluster, cluster.alerts!);

      expect(summary.severity).toBe('low');
    });

    it('should include entity summary in the description', () => {
      const cluster = makeCluster();
      const summary = service.generateAttackSummary(cluster, cluster.alerts!);

      expect(summary.description).toContain('**Entities**');
      expect(summary.entitySummary).toHaveProperty('hostname');
      expect(summary.entitySummary).toHaveProperty('ipv4');
    });

    it('should include top rules in the description', () => {
      const cluster = makeCluster();
      const summary = service.generateAttackSummary(cluster, cluster.alerts!);

      expect(summary.description).toContain('**Top Detection Rules**');
      expect(summary.description).toContain('Suspicious Script Execution');
    });

    it('should include cross-host links when present', () => {
      const cluster = makeCluster({
        crossHostLinks: [
          {
            sourceHost: 'host-1',
            targetHost: 'host-2',
            linkType: 'lateral_movement_rule',
            confidence: 0.9,
            alertIds: ['alert-1'],
            description: 'SSH connection from host-1 to host-2',
          },
        ],
      });
      const summary = service.generateAttackSummary(cluster, cluster.alerts!);

      expect(summary.description).toContain('**Cross-Host Links**');
      expect(summary.description).toContain('host-1 ↔ host-2');
    });

    it('should include key processes when present', () => {
      const cluster = makeCluster({
        processTrees: [
          {
            name: 'python3',
            executable: '/usr/bin/python3',
            parentName: 'bash',
            parentExecutable: '/bin/bash',
            alertIds: ['alert-1', 'alert-2', 'alert-3'],
          },
        ],
      });
      const summary = service.generateAttackSummary(cluster, cluster.alerts!);

      expect(summary.description).toContain('**Key Processes**');
      expect(summary.description).toContain('/usr/bin/python3');
    });

    it('should handle empty alerts', () => {
      const cluster = makeCluster();
      const summary = service.generateAttackSummary(cluster, []);

      expect(summary.topRules).toHaveLength(0);
      expect(summary.title).toBeDefined();
    });
  });

  // ============================================================
  // 3. Deterministic Case Similarity
  // ============================================================

  describe('computeCaseSimilarity', () => {
    it('should return 1.0 for identical cases', () => {
      const input1 = makeSimilarityInput();
      const input2 = makeSimilarityInput({
        caseId: 'case-2',
        caseTitle: 'Test Case 2',
      });

      const result = service.computeCaseSimilarity(input1, input2);

      expect(result.similarity).toBeCloseTo(1.0, 1);
      expect(result.shouldMerge).toBe(true);
    });

    it('should return 0 for completely different cases', () => {
      const input1 = makeSimilarityInput();
      const input2 = makeSimilarityInput({
        caseId: 'case-2',
        caseTitle: 'Unrelated Case',
        entities: [makeEntity(ObservableTypeKey.IPv4, '192.168.1.1')],
        techniques: ['T1078', 'T1548'],
        ruleNames: ['Different Rule 1'],
        earliestTimestamp: '2025-06-01T10:00:00Z',
        latestTimestamp: '2025-06-01T12:00:00Z',
        hostNames: ['host-99'],
      });

      const result = service.computeCaseSimilarity(input1, input2);

      expect(result.similarity).toBeLessThan(0.3);
      expect(result.shouldMerge).toBe(false);
    });

    it('should weigh entity overlap at 40%', () => {
      // Same entities, different everything else
      const input1 = makeSimilarityInput();
      const input2 = makeSimilarityInput({
        caseId: 'case-2',
        caseTitle: 'Other Case',
        techniques: ['T9999'],
        ruleNames: ['Different Rule'],
        earliestTimestamp: '2025-06-01T10:00:00Z',
        latestTimestamp: '2025-06-01T12:00:00Z',
      });

      const result = service.computeCaseSimilarity(input1, input2);

      // Entity overlap = 1.0, technique = 0, rules = 0, temporal ≈ 0
      // Expected: 1.0 * 0.4 + 0 + 0 + ~0 ≈ 0.4
      expect(result.breakdown.entityOverlap).toBeCloseTo(1.0, 1);
      expect(result.similarity).toBeGreaterThanOrEqual(0.35);
      expect(result.similarity).toBeLessThanOrEqual(0.5);
    });

    it('should return overlapping ranges with temporal proximity of 1.0', () => {
      const input1 = makeSimilarityInput({
        earliestTimestamp: '2025-01-15T10:00:00Z',
        latestTimestamp: '2025-01-15T14:00:00Z',
      });
      const input2 = makeSimilarityInput({
        caseId: 'case-2',
        caseTitle: 'Case 2',
        earliestTimestamp: '2025-01-15T12:00:00Z',
        latestTimestamp: '2025-01-15T16:00:00Z',
      });

      const result = service.computeCaseSimilarity(input1, input2);

      expect(result.breakdown.temporalProximity).toBe(1.0);
    });

    it('should decay temporal proximity for distant time ranges', () => {
      const input1 = makeSimilarityInput({
        earliestTimestamp: '2025-01-15T10:00:00Z',
        latestTimestamp: '2025-01-15T12:00:00Z',
      });
      const input2 = makeSimilarityInput({
        caseId: 'case-2',
        caseTitle: 'Case 2',
        earliestTimestamp: '2025-01-17T10:00:00Z',
        latestTimestamp: '2025-01-17T12:00:00Z',
      });

      const result = service.computeCaseSimilarity(input1, input2);

      // 2 days apart → close to 0
      expect(result.breakdown.temporalProximity).toBeLessThan(0.1);
    });

    it('should respect custom merge threshold', () => {
      const input1 = makeSimilarityInput();
      const input2 = makeSimilarityInput({
        caseId: 'case-2',
        caseTitle: 'Partial Match',
        techniques: ['T9999'],
        ruleNames: ['Different Rule'],
      });

      // With low threshold = should merge
      const resultLow = service.computeCaseSimilarity(input1, input2, 0.3);
      expect(resultLow.shouldMerge).toBe(true);

      // With high threshold = should not merge
      const resultHigh = service.computeCaseSimilarity(input1, input2, 0.9);
      expect(resultHigh.shouldMerge).toBe(false);
    });

    it('should include descriptive reason for merge', () => {
      const input1 = makeSimilarityInput();
      const input2 = makeSimilarityInput({
        caseId: 'case-2',
        caseTitle: 'Very Similar Case',
      });

      const result = service.computeCaseSimilarity(input1, input2);

      expect(result.reason).toContain('should be merged');
      expect(result.reason).toContain('shared entities');
    });

    it('should include descriptive reason for non-merge', () => {
      const input1 = makeSimilarityInput();
      const input2 = makeSimilarityInput({
        caseId: 'case-2',
        caseTitle: 'Very Different',
        entities: [makeEntity(ObservableTypeKey.IPv4, '192.168.1.1')],
        techniques: ['T9999'],
        ruleNames: ['Different Rule'],
        earliestTimestamp: '2025-06-01T10:00:00Z',
        latestTimestamp: '2025-06-01T12:00:00Z',
      });

      const result = service.computeCaseSimilarity(input1, input2);

      expect(result.reason).toContain('distinct');
    });

    it('should handle empty entity sets', () => {
      const input1 = makeSimilarityInput({ entities: [] });
      const input2 = makeSimilarityInput({ caseId: 'case-2', entities: [] });

      const result = service.computeCaseSimilarity(input1, input2);

      expect(result.breakdown.entityOverlap).toBe(0);
    });
  });

  // ============================================================
  // 4. buildSimilarityInput
  // ============================================================

  describe('buildSimilarityInput', () => {
    it('should build input from cluster and alerts', () => {
      const cluster = makeCluster();
      const alerts = cluster.alerts!;

      const input = service.buildSimilarityInput('case-1', 'Test Case', cluster, alerts);

      expect(input.caseId).toBe('case-1');
      expect(input.caseTitle).toBe('Test Case');
      expect(input.entities).toEqual(cluster.entities);
      expect(input.techniques).toEqual(cluster.techniques);
      expect(input.ruleNames).toEqual([
        'Suspicious Script Execution',
        'Masquerading Detected',
      ]);
      expect(input.earliestTimestamp).toBe('2025-01-15T10:00:00Z');
      expect(input.latestTimestamp).toBe('2025-01-15T12:00:00Z');
      expect(input.hostNames).toEqual(['host-1']);
    });

    it('should deduplicate rule names', () => {
      const cluster = makeCluster();
      // alerts has "Suspicious Script Execution" twice
      const alerts = cluster.alerts!;

      const input = service.buildSimilarityInput('case-1', 'Test Case', cluster, alerts);

      // Should be deduplicated
      expect(input.ruleNames).toHaveLength(2);
    });
  });
});
