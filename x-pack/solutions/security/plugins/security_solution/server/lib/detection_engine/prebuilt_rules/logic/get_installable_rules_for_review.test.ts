/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mocked } from 'vitest';

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { MlAuthz } from '../../../machine_learning/authz';
import type { IPrebuiltRuleAssetsClient } from './rule_assets/prebuilt_rule_assets_client';
import type { RuleSummary } from './rule_objects/prebuilt_rule_objects_client';
import { getInstallableRulesForReview } from './get_installable_rules_for_review';
import type { BasicRuleInfo } from './basic_rule_info';
import { convertPrebuiltRuleAssetToRuleResponse } from '../../rule_management/logic/detection_rules_client/converters/convert_prebuilt_rule_asset_to_rule_response';
import { narrowRuleResponseFields } from '../api/narrow_rule_response_fields';

vi.mock(
  '../../rule_management/logic/detection_rules_client/converters/convert_prebuilt_rule_asset_to_rule_response',
  () => {
    const mocked = { convertPrebuiltRuleAssetToRuleResponse: vi.fn() };
    return { ...mocked, default: mocked };
  }
);
vi.mock('../api/narrow_rule_response_fields', () => {
  const mocked = { narrowRuleResponseFields: vi.fn() };
  return { ...mocked, default: mocked };
});

const mockConvert = vi.mocked(convertPrebuiltRuleAssetToRuleResponse);
const mockNarrow = vi.mocked(narrowRuleResponseFields);

const permissiveMlAuthz: MlAuthz = {
  validateRuleType: async () => ({ valid: true, message: undefined }),
};

const version = (ruleId: string, type: BasicRuleInfo['type'] = 'query', v = 1) => ({
  rule_id: ruleId,
  version: v,
  type,
});

const createRuleAssetsClient = () =>
  ({
    fetchLatestAssets: vi.fn(),
    fetchLatestVersions: vi.fn(),
    fetchAssetsByVersion: vi.fn(),
    fetchTagsByVersion: vi.fn(),
    fetchDeprecatedRules: vi.fn(),
  } as unknown as Mocked<IPrebuiltRuleAssetsClient>);

describe('getInstallableRulesForReview', () => {
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    vi.clearAllMocks();
    // Passthrough conversion + projection so the test focuses on orchestration.
    mockConvert.mockImplementation((asset) => asset as never);
    mockNarrow.mockImplementation((rule) => rule);
  });

  it('excludes already-installed rules and returns the installable page', async () => {
    const ruleAssetsClient = createRuleAssetsClient();
    ruleAssetsClient.fetchLatestVersions.mockResolvedValue([
      version('rule-a'),
      version('rule-installed'),
      version('rule-c'),
    ]);
    ruleAssetsClient.fetchAssetsByVersion.mockResolvedValue({
      assets: [{ rule_id: 'rule-a' }, { rule_id: 'rule-c' }] as never,
      aggregations: { facet_tags: { buckets: [] } },
    });

    const installedRuleVersionsMap = new Map<string, RuleSummary>([
      ['rule-installed', { rule_id: 'rule-installed' } as RuleSummary],
    ]);

    const result = await getInstallableRulesForReview({
      ruleAssetsClient,
      logger,
      mlAuthz: permissiveMlAuthz,
      installedRuleVersionsMap,
      filter: 'security-rule.severity: (critical)',
      page: 1,
      perPage: 10,
      fields: ['severity'],
    });

    // Filter + sort are forwarded to the version lookup.
    expect(ruleAssetsClient.fetchLatestVersions).toHaveBeenCalledWith({
      filter: 'security-rule.severity: (critical)',
      sort: undefined,
    });

    // Only the two non-installed versions are paged.
    const fetchAssetsArgs = ruleAssetsClient.fetchAssetsByVersion.mock.calls[0];
    expect(fetchAssetsArgs[0]).toEqual([version('rule-a'), version('rule-c')]);
    expect(fetchAssetsArgs[1]).toEqual(
      expect.objectContaining({ page: 1, perPage: 10, fields: ['severity'] })
    );

    // total counts the installable versions, not the returned page length.
    expect(result.total).toBe(2);
    expect(result.rules).toEqual([{ rule_id: 'rule-a' }, { rule_id: 'rule-c' }]);
    expect(result.aggregations).toEqual({ facet_tags: { buckets: [] } });
  });

  it('excludes license-restricted rule types via mlAuthz', async () => {
    const ruleAssetsClient = createRuleAssetsClient();
    ruleAssetsClient.fetchLatestVersions.mockResolvedValue([
      version('rule-query', 'query'),
      version('rule-ml', 'machine_learning'),
    ]);
    ruleAssetsClient.fetchAssetsByVersion.mockResolvedValue({
      assets: [{ rule_id: 'rule-query' }] as never,
    });

    const restrictiveMlAuthz: MlAuthz = {
      validateRuleType: async (type) => ({
        valid: type !== 'machine_learning',
        message: undefined,
      }),
    };

    const result = await getInstallableRulesForReview({
      ruleAssetsClient,
      logger,
      mlAuthz: restrictiveMlAuthz,
      installedRuleVersionsMap: new Map(),
      page: 1,
      perPage: 10,
    });

    expect(ruleAssetsClient.fetchAssetsByVersion.mock.calls[0][0]).toEqual([
      version('rule-query', 'query'),
    ]);
    expect(result.total).toBe(1);
  });

  it('returns an empty page when no installable rules remain', async () => {
    const ruleAssetsClient = createRuleAssetsClient();
    ruleAssetsClient.fetchLatestVersions.mockResolvedValue([version('rule-installed')]);
    ruleAssetsClient.fetchAssetsByVersion.mockResolvedValue({ assets: [] });

    const result = await getInstallableRulesForReview({
      ruleAssetsClient,
      logger,
      mlAuthz: permissiveMlAuthz,
      installedRuleVersionsMap: new Map([
        ['rule-installed', { rule_id: 'rule-installed' } as RuleSummary],
      ]),
      page: 1,
      perPage: 10,
    });

    expect(result.total).toBe(0);
    expect(result.rules).toEqual([]);
    expect(ruleAssetsClient.fetchAssetsByVersion).toHaveBeenCalledWith([], expect.any(Object));
  });
});
