/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { MissingFieldsEntry, ReverseMapResult } from '@kbn/siem-readiness';
import { getQuality } from './get_quality';
import { fetchRuleFieldCaps } from '../fetchers';

jest.mock('../fetchers', () => ({ fetchRuleFieldCaps: jest.fn() }));

const mockFetchRuleFieldCaps = fetchRuleFieldCaps as jest.Mock;

const esClient = {
  search: jest.fn(),
} as unknown as ElasticsearchClient;
const logger = { error: jest.fn(), warn: jest.fn(), info: jest.fn() } as unknown as Logger;

// Rules reverse map is built once per request by the shared context and passed into getQuality.
// The default is an empty map with no resolution errors; individual tests override as needed.
const makeReverseMap = (overrides: Partial<ReverseMapResult> = {}): ReverseMapResult => ({
  indexToRules: new Map(),
  pipelineToIndices: new Map(),
  categoryToIndices: new Map(),
  tacticTotals: new Map(),
  mlRules: [],
  ruleRequiredFields: new Map(),
  ruleQueryIndices: new Map(),
  ruleNames: new Map(),
  errors: { pipelineMap: false, categoryMap: false, rulesPartial: false },
  ...overrides,
});

const makeSearchHit = (indexName: string, incompatibleFieldCount = 0) => ({
  _source: {
    indexName,
    incompatibleFieldCount,
    batchId: 'b1',
    isCheckAll: false,
    checkedAt: Date.now(),
    docsCount: 100,
    totalFieldCount: 50,
    ecsFieldCount: 48,
    customFieldCount: 2,
    sameFamilyFieldCount: 0,
    sameFamilyFields: [],
    sameFamilyFieldItems: [],
    incompatibleFieldMappingItems: [],
    incompatibleFieldValueItems: [],
    unallowedMappingFields: [],
    unallowedValueFields: [],
    sizeInBytes: 1024,
    markdownComments: [],
    ecsVersion: '8.11.0',
    error: null,
  },
});

const mockSearchResponse = (hits: ReturnType<typeof makeSearchHit>[]) => {
  (esClient.search as jest.Mock).mockResolvedValueOnce({
    hits: { hits },
  });
};

describe('getQuality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: no unmapped rule-required fields, so ECS-only assertions hold.
    mockFetchRuleFieldCaps.mockResolvedValue({ entries: [], partial: false });
  });

  describe('status', () => {
    it('returns noData when there are no quality results and no missing fields', async () => {
      mockSearchResponse([]);
      const result = await getQuality({ esClient, logger, reverseMapResult: makeReverseMap() });
      expect(result.status).toBe('noData');
    });

    it('returns healthy when all checked indices are compatible', async () => {
      mockSearchResponse([makeSearchHit('logs-endpoint.events-default', 0)]);
      const result = await getQuality({ esClient, logger, reverseMapResult: makeReverseMap() });
      expect(result.status).toBe('healthy');
    });

    it('returns actionsRequired when any index has incompatible fields', async () => {
      mockSearchResponse([
        makeSearchHit('logs-endpoint.events-default', 0),
        makeSearchHit('logs-cloud.asset-default', 3),
      ]);
      const result = await getQuality({ esClient, logger, reverseMapResult: makeReverseMap() });
      expect(result.status).toBe('actionsRequired');
    });

    it('returns actionsRequired when only missing rule-required fields exist (no quality results)', async () => {
      mockSearchResponse([]);
      mockFetchRuleFieldCaps.mockResolvedValueOnce({
        entries: [
          { ruleId: 'r1', ruleName: 'Rule 1', fields: [{ name: 'user.name', status: 'missing' }] },
        ],
        partial: false,
      });
      const result = await getQuality({ esClient, logger, reverseMapResult: makeReverseMap() });
      expect(result.status).toBe('actionsRequired');
    });
  });

  describe('items', () => {
    it('deduplicates results by indexName, keeping the first (most recent) occurrence', async () => {
      mockSearchResponse([
        makeSearchHit('logs-endpoint.events-default', 5),
        makeSearchHit('logs-endpoint.events-default', 0), // duplicate — should be dropped
        makeSearchHit('logs-cloud.asset-default', 0),
      ]);
      const result = await getQuality({ esClient, logger, reverseMapResult: makeReverseMap() });
      expect(result.items).toHaveLength(2);
      expect(result.items[0].indexName).toBe('logs-endpoint.events-default');
      expect(result.items[0].incompatibleFieldCount).toBe(5); // keeps first hit
    });
  });

  describe('actionableFindings', () => {
    it('emits one finding per incompatible index', async () => {
      mockSearchResponse([
        makeSearchHit('logs-endpoint.events-default', 3),
        makeSearchHit('logs-cloud.asset-default', 0),
        makeSearchHit('logs-identity.auth-default', 7),
      ]);
      const result = await getQuality({ esClient, logger, reverseMapResult: makeReverseMap() });
      expect(result.actionableFindings).toHaveLength(2);
      const resources = result.actionableFindings.map((f) => f.resource);
      expect(resources).toContain('logs-endpoint.events-default');
      expect(resources).toContain('logs-identity.auth-default');
    });

    it('finding message includes indexName and incompatible count', async () => {
      mockSearchResponse([makeSearchHit('logs-endpoint.events-default', 4)]);
      const result = await getQuality({ esClient, logger, reverseMapResult: makeReverseMap() });
      expect(result.actionableFindings[0].message).toContain('logs-endpoint.events-default');
      expect(result.actionableFindings[0].message).toContain('4');
    });

    it('returns no findings when esClient throws (graceful degradation)', async () => {
      (esClient.search as jest.Mock).mockRejectedValueOnce(new Error('ES unavailable'));
      const result = await getQuality({ esClient, logger, reverseMapResult: makeReverseMap() });
      expect(result.status).toBe('noData');
      expect(result.actionableFindings).toHaveLength(0);
    });
  });

  describe('rule required-field coverage (missingFieldsByRule)', () => {
    const missingFieldsFixture: MissingFieldsEntry[] = [
      {
        ruleId: 'rule-1',
        ruleName: 'Suspicious Login',
        fields: [
          { name: 'user.name', status: 'missing' },
          { name: 'source.ip', status: 'missing' },
        ],
      },
      {
        ruleId: 'rule-2',
        ruleName: 'Malware Detected',
        fields: [{ name: 'process.hash.sha256', status: 'missing' }],
      },
    ];

    it('returns missingFieldsByRule verbatim from fetchRuleFieldCaps', async () => {
      mockSearchResponse([]);
      mockFetchRuleFieldCaps.mockResolvedValueOnce({ entries: missingFieldsFixture, partial: false });
      const result = await getQuality({ esClient, logger, reverseMapResult: makeReverseMap() });
      expect(result.missingFieldsByRule).toEqual(missingFieldsFixture);
    });

    it('emits one WARNING missing_field finding per unmapped field, naming the rule and field', async () => {
      mockSearchResponse([]);
      mockFetchRuleFieldCaps.mockResolvedValueOnce({ entries: missingFieldsFixture, partial: false });
      const result = await getQuality({ esClient, logger, reverseMapResult: makeReverseMap() });

      const missingFindings = result.actionableFindings.filter((f) => f.type === 'missing_field');
      expect(missingFindings).toHaveLength(3); // 2 + 1 (rule, field) pairs
      expect(missingFindings.every((f) => f.severity === 'WARNING')).toBe(true);
      expect(missingFindings.map((f) => f.resource)).toEqual(
        expect.arrayContaining(['user.name', 'source.ip', 'process.hash.sha256'])
      );

      const userNameFinding = missingFindings.find((f) => f.resource === 'user.name');
      expect(userNameFinding?.message).toContain('Suspicious Login');
      expect(userNameFinding?.message).toContain('user.name');
      expect(userNameFinding?.message).toContain('not mapped in any of its queried indices');
    });

    it('emits a partial-gap finding with the affected indices in the message', async () => {
      mockSearchResponse([]);
      mockFetchRuleFieldCaps.mockResolvedValueOnce({
        entries: [
          {
            ruleId: 'rule-3',
            ruleName: 'Cross Source Rule',
            fields: [
              { name: 'user.name', status: 'partial', unmappedIn: ['logs-aws.cloudtrail-default'] },
            ],
          },
        ],
        partial: false,
      });
      const result = await getQuality({ esClient, logger, reverseMapResult: makeReverseMap() });

      const partialFinding = result.actionableFindings.find((f) => f.resource === 'user.name');
      expect(partialFinding?.type).toBe('missing_field');
      expect(partialFinding?.message).toContain('Cross Source Rule');
      expect(partialFinding?.message).toContain('unmapped in some queried indices');
      expect(partialFinding?.message).toContain('logs-aws.cloudtrail-default');
      expect(partialFinding?.message).toContain('may match only partially');
    });

    it('includes both incompatible-field and missing-field counts in the summary', async () => {
      mockSearchResponse([makeSearchHit('logs-endpoint.events-default', 3)]);
      mockFetchRuleFieldCaps.mockResolvedValueOnce({ entries: missingFieldsFixture, partial: false });
      const result = await getQuality({ esClient, logger, reverseMapResult: makeReverseMap() });

      expect(result.status).toBe('actionsRequired');
      expect(result.summary).toContain('incompatible ECS field mappings');
      expect(result.summary).toContain('rule(s) have required fields not fully mapped');
    });

    it('adds an incomplete-list caveat to the summary when rulesPartial is true', async () => {
      mockSearchResponse([]);
      mockFetchRuleFieldCaps.mockResolvedValueOnce({ entries: [], partial: false });
      const result = await getQuality({
        esClient,
        logger,
        reverseMapResult: makeReverseMap({
          errors: { pipelineMap: false, categoryMap: false, rulesPartial: true },
        }),
      });
      expect(result.rulesPartial).toBe(true);
      expect(result.summary).toContain('may be incomplete');
    });

    it('sets rulesPartial and adds the caveat when fieldCaps reports partial', async () => {
      mockSearchResponse([]);
      mockFetchRuleFieldCaps.mockResolvedValueOnce({ entries: [], partial: true });
      const result = await getQuality({ esClient, logger, reverseMapResult: makeReverseMap() });
      expect(result.rulesPartial).toBe(true);
      expect(result.summary).toContain('may be incomplete');
    });

    it('stays healthy and emits no missing_field findings when nothing is unmapped', async () => {
      mockSearchResponse([makeSearchHit('logs-endpoint.events-default', 0)]);
      mockFetchRuleFieldCaps.mockResolvedValueOnce({ entries: [], partial: false });
      const result = await getQuality({ esClient, logger, reverseMapResult: makeReverseMap() });
      expect(result.status).toBe('healthy');
      expect(result.missingFieldsByRule).toHaveLength(0);
      expect(result.actionableFindings.some((f) => f.type === 'missing_field')).toBe(false);
    });
  });
});
