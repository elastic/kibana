/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { enrichFinding } from './enrich_finding';
import type { EnrichmentContext, Dimension } from './enrich_finding';
import type { ActionableFinding } from './types';
import type {
  IndexToRulesMap,
  PipelineToIndicesMap,
  CategoryToIndicesMap,
  TacticTotals,
  RuleIndexEntry,
} from './reverse_map_types';

/**
 * Integration test for finding enrichment using a 3-rule fixture.
 *
 * Fixture:
 * 1. Index-pattern rule: index: ['logs-endpoint.*'], related_integrations: [{package: 'endpoint'}], tactics: [TA0001, TA0005]
 * 2. Data-view rule: dataViewId: 'security-dv' (resolves to 'logs-aws.*'), related_integrations: [{package: 'aws'}], tactics: [TA0001]
 * 3. Threat-match rule: index: ['logs-*'], threatIndex: ['threat-intel'], tactics: [TA0003]
 *
 * Pipelines:
 * 1. 'endpoint-pipeline' used by 'logs-endpoint.events-default'
 * 2. 'aws-pipeline' used by 'logs-aws.cloudtrail-default'
 *
 * Categories:
 * - 'Endpoint': ['logs-endpoint.events-default']
 * - 'Cloud': ['logs-aws.cloudtrail-default']
 */

describe('enrichFinding integration', () => {
  const rule1: RuleIndexEntry = {
    id: 'rule-1',
    name: 'Endpoint Process Rule',
    tactics: [
      { id: 'TA0001', name: 'Initial Access' },
      { id: 'TA0005', name: 'Defense Evasion' },
    ],
    enabled: true,
  };

  const rule2: RuleIndexEntry = {
    id: 'rule-2',
    name: 'AWS CloudTrail Rule',
    tactics: [{ id: 'TA0001', name: 'Initial Access' }],
    enabled: true,
  };

  const rule3: RuleIndexEntry = {
    id: 'rule-3',
    name: 'Threat Intel Match',
    tactics: [{ id: 'TA0003', name: 'Persistence' }],
    enabled: true,
  };

  const indexToRules: IndexToRulesMap = new Map([
    ['logs-endpoint.events-default', [rule1]],
    ['logs-aws.cloudtrail-default', [rule2]],
    ['logs-all-default', [rule3]],
    ['threat-intel', [rule3]],
  ]);

  const pipelineToIndices: PipelineToIndicesMap = new Map([
    ['endpoint-pipeline', ['logs-endpoint.events-default']],
    ['aws-pipeline', ['logs-aws.cloudtrail-default']],
  ]);

  const categoryToIndices: CategoryToIndicesMap = new Map([
    ['Endpoint', ['logs-endpoint.events-default']],
    ['Cloud', ['logs-aws.cloudtrail-default']],
  ]);

  const tacticTotals: TacticTotals = new Map([
    ['TA0001', { id: 'TA0001', name: 'Initial Access', totalRules: 10 }],
    ['TA0003', { id: 'TA0003', name: 'Persistence', totalRules: 5 }],
    ['TA0005', { id: 'TA0005', name: 'Defense Evasion', totalRules: 8 }],
  ]);

  // Platform derived from data (ECS fields) — not from rule metadata
  const indexToPlatform = new Map<string, string>([
    ['logs-endpoint.events-default', 'Windows Endpoints'],
    ['logs-aws.cloudtrail-default', 'AWS account 123456789012'],
  ]);

  const createContext = (dimension: Dimension): EnrichmentContext => ({
    indexToRules,
    pipelineToIndices,
    categoryToIndices,
    tacticTotals,
    indexToPlatform,
    dimension,
  });

  const createFinding = (
    resource: string,
    severity: 'CRITICAL' | 'WARNING' = 'WARNING'
  ): ActionableFinding => ({
    severity,
    message: `Finding for ${resource}`,
    resource,
  });

  describe('Quality dimension', () => {
    it('should enrich finding for logs-endpoint.events-default with Rule 1', () => {
      const ctx = createContext('quality');
      const finding = createFinding('logs-endpoint.events-default');
      const result = enrichFinding(finding, ctx);

      expect(result.affectedRules).toHaveLength(1);
      expect(result.affectedRules?.[0].name).toBe('Endpoint Process Rule');

      expect(result.affectedTactics).toHaveLength(2);
      expect(result.affectedTactics?.find((t) => t.id === 'TA0001')?.affectedRulesCount).toBe(1);
      expect(result.affectedTactics?.find((t) => t.id === 'TA0005')?.affectedRulesCount).toBe(1);

      expect(result.affectedPlatform).toBe('Windows Endpoints');
    });
  });

  describe('Retention dimension', () => {
    it('should enrich finding for logs-aws.cloudtrail-default with Rule 2', () => {
      const ctx = createContext('retention');
      const finding = createFinding('logs-aws.cloudtrail-default');
      const result = enrichFinding(finding, ctx);

      expect(result.affectedRules).toHaveLength(1);
      expect(result.affectedRules?.[0].name).toBe('AWS CloudTrail Rule');

      expect(result.affectedTactics).toHaveLength(1);
      expect(result.affectedTactics?.[0].id).toBe('TA0001');
      expect(result.affectedTactics?.[0].totalRules).toBe(10);

      expect(result.affectedPlatform).toBe('AWS account 123456789012');
    });
  });

  describe('Continuity dimension', () => {
    it('should find Rule 1 via endpoint-pipeline to logs-endpoint.events-default lookup', () => {
      const ctx = createContext('continuity');
      const finding = createFinding('endpoint-pipeline', 'CRITICAL');
      const result = enrichFinding(finding, ctx);

      expect(result.affectedRules).toHaveLength(1);
      expect(result.affectedRules?.[0].name).toBe('Endpoint Process Rule');

      expect(result.affectedTactics).toHaveLength(2);
      expect(result.affectedPlatform).toBe('Windows Endpoints');
    });

    it('should find Rule 2 via aws-pipeline to logs-aws.cloudtrail-default lookup', () => {
      const ctx = createContext('continuity');
      const finding = createFinding('aws-pipeline');
      const result = enrichFinding(finding, ctx);

      expect(result.affectedRules).toHaveLength(1);
      expect(result.affectedRules?.[0].name).toBe('AWS CloudTrail Rule');

      expect(result.affectedTactics).toHaveLength(1);
      expect(result.affectedPlatform).toBe('AWS account 123456789012');
    });
  });

  describe('Coverage dimension', () => {
    it('should find Rule 1 via Endpoint category to logs-endpoint.events-default lookup', () => {
      const ctx = createContext('coverage');
      const finding = createFinding('Endpoint');
      const result = enrichFinding(finding, ctx);

      expect(result.affectedRules).toHaveLength(1);
      expect(result.affectedRules?.[0].name).toBe('Endpoint Process Rule');

      expect(result.affectedTactics).toHaveLength(2);
      expect(result.affectedPlatform).toBe('Windows Endpoints');
    });

    it('should return no rules for detection_rules literal', () => {
      const ctx = createContext('coverage');
      const finding = createFinding('detection_rules');
      const result = enrichFinding(finding, ctx);

      expect(result.affectedRules).toBeUndefined();
      expect(result.affectedTactics).toBeUndefined();
      expect(result.affectedPlatform).toBeUndefined();
    });

    it('should find Rule 2 via Cloud category to logs-aws.cloudtrail-default lookup', () => {
      const ctx = createContext('coverage');
      const finding = createFinding('Cloud');
      const result = enrichFinding(finding, ctx);

      expect(result.affectedRules).toHaveLength(1);
      expect(result.affectedRules?.[0].name).toBe('AWS CloudTrail Rule');

      expect(result.affectedPlatform).toBe('AWS account 123456789012');
    });
  });

  describe('Cross-dimension consistency', () => {
    it('should produce consistent blast radius for the same underlying index', () => {
      const qualityCtx = createContext('quality');
      const retentionCtx = createContext('retention');

      const qualityFinding = createFinding('logs-endpoint.events-default');
      const retentionFinding = createFinding('logs-endpoint.events-default');

      const qualityResult = enrichFinding(qualityFinding, qualityCtx);
      const retentionResult = enrichFinding(retentionFinding, retentionCtx);

      expect(qualityResult.affectedRules).toEqual(retentionResult.affectedRules);
      expect(qualityResult.affectedTactics).toEqual(retentionResult.affectedTactics);
      expect(qualityResult.affectedPlatform).toBe(retentionResult.affectedPlatform);
    });
  });
});
