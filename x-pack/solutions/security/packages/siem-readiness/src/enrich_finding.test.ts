/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { enrichFinding, enrichFindings } from './enrich_finding';
import type { EnrichmentContext } from './enrich_finding';
import type { ActionableFinding } from './types';
import type { RuleIndexEntry } from './reverse_map_types';

const createMockRule = (overrides: Partial<RuleIndexEntry> = {}): RuleIndexEntry => ({
  id: 'rule-1',
  name: 'Test Rule',
  tactics: [],
  enabled: true,
  ...overrides,
});

const createMockContext = (overrides: Partial<EnrichmentContext> = {}): EnrichmentContext => ({
  indexToRules: new Map(),
  pipelineToIndices: new Map(),
  categoryToIndices: new Map(),
  tacticTotals: new Map(),
  dimension: 'quality',
  indexToPlatform: new Map(),
  ...overrides,
});

const createMockFinding = (overrides: Partial<ActionableFinding> = {}): ActionableFinding => ({
  severity: 'WARNING',
  message: 'Test finding',
  resource: 'test-index',
  ...overrides,
});

describe('enrichFinding', () => {
  describe('Quality/Retention dimension (direct index lookup)', () => {
    it('should enrich finding with affected rules from direct index lookup', () => {
      const rule1 = createMockRule({ id: 'rule-1', name: 'Rule 1' });
      const rule2 = createMockRule({ id: 'rule-2', name: 'Rule 2' });

      const indexToRules = new Map([['logs-endpoint-default', [rule1, rule2]]]);

      const ctx = createMockContext({
        indexToRules,
        dimension: 'quality',
      });

      const finding = createMockFinding({ resource: 'logs-endpoint-default' });
      const result = enrichFinding(finding, ctx);

      expect(result.affectedRules).toHaveLength(2);
      expect(result.affectedRules?.[0].id).toBe('rule-1');
      expect(result.affectedRules?.[1].id).toBe('rule-2');
    });

    it('should aggregate tactics and compute counts', () => {
      const rule1 = createMockRule({
        id: 'rule-1',
        tactics: [
          { id: 'TA0001', name: 'Initial Access' },
          { id: 'TA0005', name: 'Defense Evasion' },
        ],
      });
      const rule2 = createMockRule({
        id: 'rule-2',
        tactics: [{ id: 'TA0001', name: 'Initial Access' }],
      });

      const indexToRules = new Map([['logs-test', [rule1, rule2]]]);
      const tacticTotals = new Map([
        ['TA0001', { id: 'TA0001', name: 'Initial Access', totalRules: 10 }],
        ['TA0005', { id: 'TA0005', name: 'Defense Evasion', totalRules: 8 }],
      ]);

      const ctx = createMockContext({
        indexToRules,
        tacticTotals,
        dimension: 'quality',
      });

      const finding = createMockFinding({ resource: 'logs-test' });
      const result = enrichFinding(finding, ctx);

      expect(result.affectedTactics).toHaveLength(2);

      const ta0001 = result.affectedTactics?.find((t) => t.id === 'TA0001');
      expect(ta0001?.affectedRulesCount).toBe(2);
      expect(ta0001?.totalRules).toBe(10);

      const ta0005 = result.affectedTactics?.find((t) => t.id === 'TA0005');
      expect(ta0005?.affectedRulesCount).toBe(1);
      expect(ta0005?.totalRules).toBe(8);
    });

    it('should return undefined for affectedRules when no rules match', () => {
      const ctx = createMockContext({ dimension: 'quality' });
      const finding = createMockFinding({ resource: 'unknown-index' });
      const result = enrichFinding(finding, ctx);

      expect(result.affectedRules).toBeUndefined();
      expect(result.affectedTactics).toBeUndefined();
    });

    it('should convert severity to uppercase', () => {
      const ctx = createMockContext({ dimension: 'quality' });
      const finding = createMockFinding({ severity: 'CRITICAL' });
      const result = enrichFinding(finding, ctx);

      expect(result.severity).toBe('CRITICAL');
    });

    it('should derive platform from indexToPlatform when resource matches directly', () => {
      const ctx = createMockContext({
        indexToPlatform: new Map([['logs-aws.cloudtrail-default', 'AWS account 123456']]),
        dimension: 'quality',
      });

      const finding = createMockFinding({ resource: 'logs-aws.cloudtrail-default' });
      const result = enrichFinding(finding, ctx);

      expect(result.affectedPlatform).toBe('AWS account 123456');
    });

    it('should resolve backing index name to data stream platform via two-step lookup', () => {
      const ctx = createMockContext({
        indexToPlatform: new Map([['logs-aws.cloudtrail-default', 'AWS account 789012']]),
        dimension: 'quality',
      });

      // finding.resource is a backing index, not the data stream name
      const finding = createMockFinding({
        resource: '.ds-logs-aws.cloudtrail-default-2026.01.01-000001',
      });
      const result = enrichFinding(finding, ctx);

      expect(result.affectedPlatform).toBe('AWS account 789012');
    });

    it('should return undefined for affectedPlatform when no indexToPlatform match exists', () => {
      const ctx = createMockContext({
        indexToPlatform: new Map([['logs-aws.cloudtrail-default', 'AWS account 123456']]),
        dimension: 'quality',
      });

      const finding = createMockFinding({ resource: 'logs-endpoint.events-default' });
      const result = enrichFinding(finding, ctx);

      expect(result.affectedPlatform).toBeUndefined();
    });
  });

  describe('Continuity dimension (pipeline -> indices -> rules)', () => {
    it('should find rules through pipeline to indices mapping', () => {
      const rule1 = createMockRule({ id: 'rule-1', name: 'Endpoint Rule' });
      const rule2 = createMockRule({ id: 'rule-2', name: 'AWS Rule' });

      const indexToRules = new Map([
        ['logs-endpoint-default', [rule1]],
        ['logs-aws-default', [rule2]],
      ]);

      const pipelineToIndices = new Map([
        ['endpoint-pipeline', ['logs-endpoint-default', 'logs-aws-default']],
      ]);

      const ctx = createMockContext({
        indexToRules,
        pipelineToIndices,
        dimension: 'continuity',
      });

      const finding = createMockFinding({ resource: 'endpoint-pipeline' });
      const result = enrichFinding(finding, ctx);

      expect(result.affectedRules).toHaveLength(2);
    });

    it('should return undefined when pipeline not found', () => {
      const ctx = createMockContext({ dimension: 'continuity' });
      const finding = createMockFinding({ resource: 'unknown-pipeline' });
      const result = enrichFinding(finding, ctx);

      expect(result.affectedRules).toBeUndefined();
    });

    it('should include Open ingest pipelines action', () => {
      const ctx = createMockContext({ dimension: 'continuity' });
      const finding = createMockFinding({ resource: 'test-pipeline' });
      const result = enrichFinding(finding, ctx);

      const pipelineAction = result.recommendedActions?.find(
        (a) => a.label === 'Open ingest pipelines'
      );
      expect(pipelineAction).toBeDefined();
      expect(pipelineAction?.href).toBe('/app/management/ingest/ingest_pipelines');
    });
  });

  describe('Coverage dimension (category -> indices -> rules)', () => {
    it('should find rules through category to indices mapping', () => {
      const rule1 = createMockRule({ id: 'rule-1', name: 'Endpoint Rule' });

      const indexToRules = new Map([['logs-endpoint-default', [rule1]]]);

      const categoryToIndices = new Map([['Endpoint', ['logs-endpoint-default']]]);

      const ctx = createMockContext({
        indexToRules,
        categoryToIndices,
        dimension: 'coverage',
      });

      const finding = createMockFinding({ resource: 'Endpoint' });
      const result = enrichFinding(finding, ctx);

      expect(result.affectedRules).toHaveLength(1);
      expect(result.affectedRules?.[0].name).toBe('Endpoint Rule');
    });

    it('should return empty rules for detection_rules literal', () => {
      const ctx = createMockContext({ dimension: 'coverage' });
      const finding = createMockFinding({ resource: 'detection_rules' });
      const result = enrichFinding(finding, ctx);

      expect(result.affectedRules).toBeUndefined();
    });

    it('should include View rule coverage action', () => {
      const ctx = createMockContext({ dimension: 'coverage' });
      const finding = createMockFinding({ resource: 'Endpoint' });
      const result = enrichFinding(finding, ctx);

      const coverageAction = result.recommendedActions?.find(
        (a) => a.label === 'View rule coverage'
      );
      expect(coverageAction).toBeDefined();
      expect(coverageAction?.href).toBe('/app/security/rules/coverage');
    });
  });

  describe('recommended actions', () => {
    it('should include View affected rules for index-keyed dimensions (quality, retention)', () => {
      for (const dimension of ['quality', 'retention'] as const) {
        const ctx = createMockContext({ dimension });
        const finding = createMockFinding({ resource: 'logs-test-default' });
        const result = enrichFinding(finding, ctx);

        const viewRulesAction = result.recommendedActions?.find(
          (a) => a.label === 'View affected rules'
        );
        expect(viewRulesAction).toBeDefined();
        expect(viewRulesAction?.href).toContain(encodeURIComponent('logs-test-default'));
      }
    });

    it('should NOT include View affected rules for continuity (resource is a pipeline name)', () => {
      const ctx = createMockContext({ dimension: 'continuity' });
      const finding = createMockFinding({ resource: 'logs-network@custom' });
      const result = enrichFinding(finding, ctx);

      const viewRulesAction = result.recommendedActions?.find(
        (a) => a.label === 'View affected rules'
      );
      expect(viewRulesAction).toBeUndefined();
    });

    it('should NOT include View affected rules for coverage (resource is a category name)', () => {
      const ctx = createMockContext({ dimension: 'coverage' });
      const finding = createMockFinding({ resource: 'Cloud' });
      const result = enrichFinding(finding, ctx);

      const viewRulesAction = result.recommendedActions?.find(
        (a) => a.label === 'View affected rules'
      );
      expect(viewRulesAction).toBeUndefined();
    });

    it('should always include Open case action with proper tags', () => {
      const ctx = createMockContext({ dimension: 'retention' });
      const finding = createMockFinding({
        resource: 'logs-endpoint.events-default',
        severity: 'WARNING',
      });
      const result = enrichFinding(finding, ctx);

      const caseAction = result.recommendedActions?.find((a) => a.label === 'Open case');
      expect(caseAction).toBeDefined();
      expect(caseAction?.href).toContain(
        'readiness:retention,warning,logs-endpoint-events-default'
      );
    });

    it('should include ILM policies action for retention dimension', () => {
      const ctx = createMockContext({ dimension: 'retention' });
      const finding = createMockFinding();
      const result = enrichFinding(finding, ctx);

      const ilmAction = result.recommendedActions?.find((a) => a.label === 'Open ILM policies');
      expect(ilmAction).toBeDefined();
    });

    it('should include Data Quality action for quality dimension', () => {
      const ctx = createMockContext({ dimension: 'quality' });
      const finding = createMockFinding();
      const result = enrichFinding(finding, ctx);

      const qualityAction = result.recommendedActions?.find((a) => a.label === 'Open Data Quality');
      expect(qualityAction).toBeDefined();
    });
  });

  describe('enrichFindings (batch)', () => {
    it('should enrich multiple findings', () => {
      const ctx = createMockContext({ dimension: 'quality' });
      const findings = [
        createMockFinding({ resource: 'index-1' }),
        createMockFinding({ resource: 'index-2' }),
      ];

      const results = enrichFindings(findings, ctx);

      expect(results).toHaveLength(2);
      expect(results[0].recommendedActions).toBeDefined();
      expect(results[1].recommendedActions).toBeDefined();
    });
  });

  describe('blastRadiusStatus — error signal propagation', () => {
    it('should set blastRadiusStatus to "unavailable" and omit affected* for continuity when pipelineMap failed', () => {
      const rule = createMockRule({ id: 'rule-1', name: 'Rule 1' });
      const ctx = createMockContext({
        dimension: 'continuity',
        pipelineToIndices: new Map([['my-pipeline', ['logs-test']]]),
        indexToRules: new Map([['logs-test', [rule]]]),
        errors: { pipelineMap: true, categoryMap: false, rulesPartial: false },
      });

      const finding = createMockFinding({ resource: 'my-pipeline' });
      const result = enrichFinding(finding, ctx);

      expect(result.blastRadiusStatus).toBe('unavailable');
      expect(result.affectedRules).toBeUndefined();
      expect(result.affectedTactics).toBeUndefined();
      expect(result.affectedPlatform).toBeUndefined();
      // Recommended actions are still included
      expect(result.recommendedActions).toBeDefined();
    });

    it('should set blastRadiusStatus to "unavailable" and omit affected* for coverage when categoryMap failed', () => {
      const rule = createMockRule({ id: 'rule-1', name: 'Rule 1' });
      const ctx = createMockContext({
        dimension: 'coverage',
        categoryToIndices: new Map([['Cloud', ['logs-aws']]]),
        indexToRules: new Map([['logs-aws', [rule]]]),
        errors: { pipelineMap: false, categoryMap: true, rulesPartial: false },
      });

      const finding = createMockFinding({ resource: 'Cloud' });
      const result = enrichFinding(finding, ctx);

      expect(result.blastRadiusStatus).toBe('unavailable');
      expect(result.affectedRules).toBeUndefined();
      expect(result.affectedTactics).toBeUndefined();
      expect(result.affectedPlatform).toBeUndefined();
    });

    it('should not set unavailable for quality/retention even when pipelineMap or categoryMap failed', () => {
      const rule = createMockRule({ id: 'rule-1', name: 'Rule 1' });
      const ctx = createMockContext({
        dimension: 'quality',
        indexToRules: new Map([['logs-test', [rule]]]),
        // pipelineMap/categoryMap failures are irrelevant for quality dimension
        errors: { pipelineMap: true, categoryMap: true, rulesPartial: false },
      });

      const finding = createMockFinding({ resource: 'logs-test' });
      const result = enrichFinding(finding, ctx);

      expect(result.blastRadiusStatus).toBe('healthy');
      expect(result.affectedRules).toHaveLength(1);
    });

    it('should set blastRadiusStatus to "partial" when rulesPartial is true', () => {
      const rule = createMockRule({ id: 'rule-1', name: 'Rule 1' });
      const ctx = createMockContext({
        dimension: 'quality',
        indexToRules: new Map([['logs-test', [rule]]]),
        errors: { pipelineMap: false, categoryMap: false, rulesPartial: true },
      });

      const finding = createMockFinding({ resource: 'logs-test' });
      const result = enrichFinding(finding, ctx);

      expect(result.blastRadiusStatus).toBe('partial');
      // affected* still populated from what did resolve
      expect(result.affectedRules).toHaveLength(1);
    });

    it('should set "partial" for continuity when rulesPartial is true but pipelineMap succeeded', () => {
      const rule = createMockRule({ id: 'rule-1', name: 'Rule 1' });
      const ctx = createMockContext({
        dimension: 'continuity',
        pipelineToIndices: new Map([['my-pipeline', ['logs-test']]]),
        indexToRules: new Map([['logs-test', [rule]]]),
        errors: { pipelineMap: false, categoryMap: false, rulesPartial: true },
      });

      const finding = createMockFinding({ resource: 'my-pipeline' });
      const result = enrichFinding(finding, ctx);

      expect(result.blastRadiusStatus).toBe('partial');
      expect(result.affectedRules).toHaveLength(1);
    });

    it('should set blastRadiusStatus to "healthy" when errors is omitted (backward compat)', () => {
      const ctx = createMockContext({ dimension: 'quality' });
      // No `errors` field in context — defaults to all-false
      const finding = createMockFinding({ resource: 'logs-test' });
      const result = enrichFinding(finding, ctx);

      expect(result.blastRadiusStatus).toBe('healthy');
    });

    it('should set blastRadiusStatus to "healthy" when all errors are false', () => {
      const ctx = createMockContext({
        dimension: 'quality',
        errors: { pipelineMap: false, categoryMap: false, rulesPartial: false },
      });

      const finding = createMockFinding({ resource: 'logs-test' });
      const result = enrichFinding(finding, ctx);

      expect(result.blastRadiusStatus).toBe('healthy');
    });
  });
});
