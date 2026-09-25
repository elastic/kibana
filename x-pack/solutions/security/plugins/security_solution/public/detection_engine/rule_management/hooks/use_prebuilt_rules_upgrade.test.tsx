/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import {
  RuleCustomizationStatus,
  type RuleResponse,
  type RuleUpgradeInfoForReview,
  ThreeWayDiffConflict,
  ThreeWayDiffOutcome,
  ThreeWayMergeOutcome,
} from '../../../../common/api/detection_engine';
import { TestProviders } from '../../../common/mock';
import { usePrebuiltRulesUpgrade } from './use_prebuilt_rules_upgrade';
import { usePerformUpgradeRules } from '../logic/prebuilt_rules/use_perform_rule_upgrade';
import { usePrebuiltRulesUpgradeReview } from '../logic/prebuilt_rules/use_prebuilt_rules_upgrade_review';
import { usePrebuiltRulesCustomizationStatus } from '../logic/prebuilt_rules/use_prebuilt_rules_customization_status';
import { useIsUpgradingSecurityPackages } from '../logic/use_upgrade_security_packages';
import { useOutdatedMlJobsUpgradeModal } from '../../rule_management_ui/components/rules_table/upgrade_prebuilt_rules_table/use_ml_jobs_upgrade_modal';
import { useUpgradeWithConflictsModal } from '../../rule_management_ui/components/rules_table/upgrade_prebuilt_rules_table/use_upgrade_with_conflicts_modal';
import { reviewRuleUpgrade } from '../api/api';

jest.mock('../api/api', () => ({ reviewRuleUpgrade: jest.fn() }));
jest.mock('../logic/prebuilt_rules/use_perform_rule_upgrade');
jest.mock('../logic/prebuilt_rules/use_prebuilt_rules_upgrade_review');
jest.mock('../logic/prebuilt_rules/use_prebuilt_rules_customization_status');
jest.mock('../logic/use_upgrade_security_packages');
jest.mock(
  '../../rule_management_ui/components/rules_table/upgrade_prebuilt_rules_table/use_ml_jobs_upgrade_modal'
);
jest.mock(
  '../../rule_management_ui/components/rules_table/upgrade_prebuilt_rules_table/use_upgrade_with_conflicts_modal'
);
jest.mock('../../../common/lib/kibana');

const mockUsePerformUpgradeRules = usePerformUpgradeRules as jest.Mock;
const mockUsePrebuiltRulesUpgradeReview = usePrebuiltRulesUpgradeReview as jest.Mock;
const mockUsePrebuiltRulesCustomizationStatus = usePrebuiltRulesCustomizationStatus as jest.Mock;
const mockUseIsUpgradingSecurityPackages = useIsUpgradingSecurityPackages as jest.Mock;
const mockUseOutdatedMlJobsUpgradeModal = useOutdatedMlJobsUpgradeModal as jest.Mock;
const mockUseUpgradeWithConflictsModal = useUpgradeWithConflictsModal as jest.Mock;
const mockReviewRuleUpgrade = reviewRuleUpgrade as jest.Mock;

describe('usePrebuiltRulesUpgrade', () => {
  const mutateAsync = jest.fn().mockResolvedValue({});
  const confirmLegacyMLJobs = jest.fn().mockResolvedValue(true);

  beforeEach(() => {
    jest.clearAllMocks();

    mutateAsync.mockResolvedValue({});
    confirmLegacyMLJobs.mockResolvedValue(true);

    mockUsePerformUpgradeRules.mockReturnValue({ mutateAsync });
    mockUsePrebuiltRulesCustomizationStatus.mockReturnValue({
      isRulesCustomizationEnabled: true,
    });
    mockUseIsUpgradingSecurityPackages.mockReturnValue(false);
    mockUseOutdatedMlJobsUpgradeModal.mockReturnValue({
      modal: null,
      confirmLegacyMLJobs,
      isLoading: false,
    });
    mockUseUpgradeWithConflictsModal.mockReturnValue({
      modal: null,
      confirmConflictsUpgrade: jest.fn(),
    });

    mockUsePrebuiltRulesUpgradeReview.mockReturnValue(buildReviewResult());
    mockReviewRuleUpgrade.mockResolvedValue(buildReviewResult().data);
  });

  it('exposes upgradeRulesToTarget as a function on the returned object', () => {
    const { result } = renderHook(() => usePrebuiltRulesUpgrade({ filter: {} }), {
      wrapper: TestProviders,
    });

    expect(typeof result.current.upgradeRulesToTarget).toBe('function');
  });

  it('issues exactly one SPECIFIC_RULES/TARGET _perform request', async () => {
    mockUsePrebuiltRulesUpgradeReview.mockReturnValue(
      buildReviewResult([
        createRuleUpgradeInfoMock({ rule_id: 'rule-a', revision: 1, targetVersion: 3 }),
        createRuleUpgradeInfoMock({ rule_id: 'rule-b', revision: 2, targetVersion: 5 }),
      ])
    );

    const { result } = renderHook(() => usePrebuiltRulesUpgrade({ filter: {} }), {
      wrapper: TestProviders,
    });

    await act(async () => {
      await result.current.upgradeRulesToTarget(['rule-a', 'rule-b']);
    });

    expect(mutateAsync).toHaveBeenCalledTimes(1);
    expect(mutateAsync).toHaveBeenCalledWith({
      mode: 'SPECIFIC_RULES',
      pick_version: 'TARGET',
      rules: [
        { rule_id: 'rule-a', version: 3, revision: 1 },
        { rule_id: 'rule-b', version: 5, revision: 2 },
      ],
    });
  });

  it('carries no fields, dry_run, or on_conflict key on any specifier or request body', async () => {
    mockUsePrebuiltRulesUpgradeReview.mockReturnValue(
      buildReviewResult([
        createRuleUpgradeInfoMock({ rule_id: 'rule-a', revision: 1, targetVersion: 3 }),
      ])
    );

    const { result } = renderHook(() => usePrebuiltRulesUpgrade({ filter: {} }), {
      wrapper: TestProviders,
    });

    await act(async () => {
      await result.current.upgradeRulesToTarget(['rule-a']);
    });

    const requestArg = mutateAsync.mock.calls[0][0];
    expect(Object.keys(requestArg)).not.toContain('dry_run');
    expect(Object.keys(requestArg)).not.toContain('on_conflict');
    for (const specifier of requestArg.rules) {
      expect(Object.keys(specifier)).not.toContain('fields');
    }
  });

  it('drops a stale rule id and still upgrades the remaining ids without throwing', async () => {
    mockUsePrebuiltRulesUpgradeReview.mockReturnValue(
      buildReviewResult([
        createRuleUpgradeInfoMock({ rule_id: 'rule-a', revision: 1, targetVersion: 3 }),
      ])
    );

    const { result } = renderHook(() => usePrebuiltRulesUpgrade({ filter: {} }), {
      wrapper: TestProviders,
    });

    await act(async () => {
      await result.current.upgradeRulesToTarget(['rule-a', 'ghost-rule']);
    });

    expect(mutateAsync).toHaveBeenCalledTimes(1);
    expect(mutateAsync.mock.calls[0][0].rules).toHaveLength(1);
    expect(mutateAsync.mock.calls[0][0].rules[0]).toEqual({
      rule_id: 'rule-a',
      version: 3,
      revision: 1,
    });
  });

  it('drops a stale rule id via the default upgradeRules path when customization is enabled', async () => {
    mockUsePrebuiltRulesCustomizationStatus.mockReturnValue({
      isRulesCustomizationEnabled: true,
    });
    mockUsePrebuiltRulesUpgradeReview.mockReturnValue(
      buildReviewResult([
        createRuleUpgradeInfoMock({ rule_id: 'rule-a', revision: 1, targetVersion: 3 }),
      ])
    );
    // upgradeRules (customization enabled) routes through the dry-run mutation path,
    // which issues a dry_run request first and then the real request.
    mutateAsync.mockImplementation(async (params) =>
      params.dry_run ? { results: { skipped: [], updated: [] } } : {}
    );

    const { result } = renderHook(() => usePrebuiltRulesUpgrade({ filter: {} }), {
      wrapper: TestProviders,
    });

    await act(async () => {
      await result.current.upgradeRules(['rule-a', 'ghost-rule']);
    });

    // The dry-run request itself carries the specifier list built from the stale-id
    // filter under test — proving the filter applies on this path without needing to
    // follow the conflict-check indirection through to the final non-dry-run request.
    expect(mutateAsync.mock.calls[0][0].rules).toHaveLength(1);
    expect(mutateAsync.mock.calls[0][0].rules[0]).toEqual(
      expect.objectContaining({ rule_id: 'rule-a', revision: 1 })
    );
  });

  describe('upgradeAllRulesToTarget', () => {
    it('issues one ALL_RULES/TARGET request with an empty filter when no filters are supplied', async () => {
      const { result } = renderHook(() => usePrebuiltRulesUpgrade({ filter: {} }), {
        wrapper: TestProviders,
      });

      await act(async () => {
        await result.current.upgradeAllRulesToTarget();
      });

      expect(mutateAsync).toHaveBeenCalledTimes(1);
      expect(mutateAsync).toHaveBeenCalledWith({
        mode: 'ALL_RULES',
        pick_version: 'TARGET',
        filter: {},
      });
    });

    it('scopes the request to the active filter', async () => {
      const { result } = renderHook(
        () =>
          usePrebuiltRulesUpgrade({
            filter: {
              name: 'windows',
              tags: ['tag-a'],
              customization_status: RuleCustomizationStatus.CUSTOMIZED,
            },
          }),
        { wrapper: TestProviders }
      );

      await act(async () => {
        await result.current.upgradeAllRulesToTarget();
      });

      expect(mutateAsync).toHaveBeenCalledWith({
        mode: 'ALL_RULES',
        pick_version: 'TARGET',
        filter: {
          name: 'windows',
          tags: ['tag-a'],
          customization_status: RuleCustomizationStatus.CUSTOMIZED,
        },
      });
    });

    it('produces an identical request whether rules customization is enabled or disabled', async () => {
      mockUsePrebuiltRulesCustomizationStatus.mockReturnValue({
        isRulesCustomizationEnabled: true,
      });
      const { result: enabledResult } = renderHook(() => usePrebuiltRulesUpgrade({ filter: {} }), {
        wrapper: TestProviders,
      });
      await act(async () => {
        await enabledResult.current.upgradeAllRulesToTarget();
      });
      const enabledArg = mutateAsync.mock.calls[0][0];

      mutateAsync.mockClear();
      mockUsePrebuiltRulesCustomizationStatus.mockReturnValue({
        isRulesCustomizationEnabled: false,
      });
      const { result: disabledResult } = renderHook(() => usePrebuiltRulesUpgrade({ filter: {} }), {
        wrapper: TestProviders,
      });
      await act(async () => {
        await disabledResult.current.upgradeAllRulesToTarget();
      });
      const disabledArg = mutateAsync.mock.calls[0][0];

      expect(enabledArg).toEqual(disabledArg);
    });

    it('carries no dry_run or on_conflict key', async () => {
      const { result } = renderHook(() => usePrebuiltRulesUpgrade({ filter: {} }), {
        wrapper: TestProviders,
      });

      await act(async () => {
        await result.current.upgradeAllRulesToTarget();
      });

      const requestArg = mutateAsync.mock.calls[0][0];
      expect(Object.keys(requestArg)).not.toContain('dry_run');
      expect(Object.keys(requestArg)).not.toContain('on_conflict');
      expect(mutateAsync).not.toHaveBeenCalledWith(expect.objectContaining({ dry_run: true }));
    });

    it('scopes to the selected rule ids instead of firing an unscoped ALL_RULES request when filter.rule_ids is set', async () => {
      mockUsePrebuiltRulesUpgradeReview.mockReturnValue(
        buildReviewResult([
          createRuleUpgradeInfoMock({ rule_id: 'rule-a', revision: 1, targetVersion: 3 }),
          createRuleUpgradeInfoMock({ rule_id: 'rule-b', revision: 2, targetVersion: 5 }),
        ])
      );

      const { result } = renderHook(
        () =>
          usePrebuiltRulesUpgrade({
            filter: { rule_ids: ['rule-a', 'rule-b'] },
          }),
        { wrapper: TestProviders }
      );

      await act(async () => {
        await result.current.upgradeAllRulesToTarget();
      });

      expect(mutateAsync).toHaveBeenCalledTimes(1);
      expect(mutateAsync).toHaveBeenCalledWith({
        mode: 'SPECIFIC_RULES',
        pick_version: 'TARGET',
        rules: [
          { rule_id: 'rule-a', version: 3, revision: 1 },
          { rule_id: 'rule-b', version: 5, revision: 2 },
        ],
      });
    });

    it('does not call onUpgrade when the legacy-ML-jobs confirmation is cancelled', async () => {
      confirmLegacyMLJobs.mockResolvedValueOnce(false);
      const onUpgrade = jest.fn();

      const { result } = renderHook(() => usePrebuiltRulesUpgrade({ filter: {}, onUpgrade }), {
        wrapper: TestProviders,
      });

      await act(async () => {
        await result.current.upgradeAllRulesToTarget();
      });

      expect(mutateAsync).not.toHaveBeenCalled();
      expect(onUpgrade).not.toHaveBeenCalled();
    });

    it('does not affect the pre-existing upgradeAllRules MERGED primary path', async () => {
      mockUsePrebuiltRulesCustomizationStatus.mockReturnValue({
        isRulesCustomizationEnabled: true,
      });
      const { result } = renderHook(() => usePrebuiltRulesUpgrade({ filter: {} }), {
        wrapper: TestProviders,
      });

      await act(async () => {
        await result.current.upgradeAllRules();
      });

      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          dry_run: true,
          pick_version: 'MERGED',
        })
      );
    });

    it('resolves even when mutateAsync rejects, clearing loadingRules', async () => {
      mutateAsync.mockRejectedValueOnce(new Error('boom'));

      const { result } = renderHook(() => usePrebuiltRulesUpgrade({ filter: {} }), {
        wrapper: TestProviders,
      });

      await act(async () => {
        await result.current.upgradeAllRulesToTarget();
      });

      expect(result.current.loadingRules).toEqual([]);
    });
  });

  describe('customization counts', () => {
    it('getSelectedRulesCustomizationCounts counts customized rules among the selected ids', () => {
      mockUsePrebuiltRulesUpgradeReview.mockReturnValue(
        buildReviewResult([
          createRuleUpgradeInfoMock({
            rule_id: 'rule-a',
            revision: 1,
            targetVersion: 1,
            currentRuleOverrides: {
              rule_source: {
                type: 'external',
                is_customized: true,
              },
            },
          }),
          createRuleUpgradeInfoMock({ rule_id: 'rule-b', revision: 1, targetVersion: 1 }),
          createRuleUpgradeInfoMock({ rule_id: 'rule-c', revision: 1, targetVersion: 1 }),
        ])
      );

      const { result } = renderHook(() => usePrebuiltRulesUpgrade({ filter: {} }), {
        wrapper: TestProviders,
      });

      expect(
        result.current.getSelectedRulesCustomizationCounts(['rule-a', 'rule-b', 'rule-c'])
      ).toEqual({ total: 3, customizedCount: 1, ruleTypeChangeCount: 0 });
    });

    it('excludes stale ids from the selected total rather than counting them as non-customized', () => {
      mockUsePrebuiltRulesUpgradeReview.mockReturnValue(
        buildReviewResult([
          createRuleUpgradeInfoMock({
            rule_id: 'rule-a',
            revision: 1,
            targetVersion: 1,
            currentRuleOverrides: {
              rule_source: {
                type: 'external',
                is_customized: true,
              },
            },
          }),
        ])
      );

      const { result } = renderHook(() => usePrebuiltRulesUpgrade({ filter: {} }), {
        wrapper: TestProviders,
      });

      expect(result.current.getSelectedRulesCustomizationCounts(['rule-a', 'ghost-rule'])).toEqual({
        total: 1,
        customizedCount: 1,
        ruleTypeChangeCount: 0,
      });
    });

    it('issues no network request when calling getSelectedRulesCustomizationCounts', () => {
      mockUsePrebuiltRulesUpgradeReview.mockReturnValue(
        buildReviewResult([
          createRuleUpgradeInfoMock({ rule_id: 'rule-a', revision: 1, targetVersion: 1 }),
        ])
      );

      const { result } = renderHook(() => usePrebuiltRulesUpgrade({ filter: {} }), {
        wrapper: TestProviders,
      });

      const callCountBefore = mockUsePrebuiltRulesUpgradeReview.mock.calls.length;
      result.current.getSelectedRulesCustomizationCounts(['rule-a']);

      expect(mockUsePrebuiltRulesUpgradeReview.mock.calls.length).toBe(callCountBefore);
      expect(mutateAsync).not.toHaveBeenCalled();
    });

    it('counts selected rules whose Elastic version changes the rule type', () => {
      mockUsePrebuiltRulesUpgradeReview.mockReturnValue(
        buildReviewResult([
          createRuleUpgradeInfoMock({
            rule_id: 'rule-a',
            revision: 1,
            targetVersion: 1,
            currentRuleOverrides: { type: 'query' },
            targetRuleOverrides: { type: 'esql' },
            diffOverrides: {
              num_fields_with_updates: 1,
              fields: {
                type: {
                  base_version: 'query',
                  current_version: 'query',
                  target_version: 'esql',
                  merged_version: 'esql',
                  diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
                  merge_outcome: ThreeWayMergeOutcome.Target,
                  has_base_version: true,
                  has_update: true,
                  conflict: ThreeWayDiffConflict.NONE,
                },
              },
            },
          }),
          createRuleUpgradeInfoMock({ rule_id: 'rule-b', revision: 1, targetVersion: 1 }),
        ])
      );

      const { result } = renderHook(() => usePrebuiltRulesUpgrade({ filter: {} }), {
        wrapper: TestProviders,
      });

      expect(result.current.getSelectedRulesCustomizationCounts(['rule-a', 'rule-b'])).toEqual({
        total: 2,
        customizedCount: 0,
        ruleTypeChangeCount: 1,
      });
    });

    it('counts a type reset to the target (CustomizedValueNoUpdate) as a rule type change even though has_update is false', () => {
      mockUsePrebuiltRulesUpgradeReview.mockReturnValue(
        buildReviewResult([
          createRuleUpgradeInfoMock({
            rule_id: 'rule-a',
            revision: 2,
            targetVersion: 2,
            currentRuleOverrides: {
              type: 'esql',
              rule_source: {
                type: 'external',
                is_customized: true,
              },
            },
            targetRuleOverrides: { type: 'query' },
            diffOverrides: {
              fields: {
                type: {
                  base_version: 'query',
                  current_version: 'esql',
                  target_version: 'query',
                  merged_version: 'query',
                  diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
                  merge_outcome: ThreeWayMergeOutcome.Target,
                  has_base_version: true,
                  has_update: false,
                  conflict: ThreeWayDiffConflict.NONE,
                },
              },
            },
          }),
        ])
      );

      const { result } = renderHook(() => usePrebuiltRulesUpgrade({ filter: {} }), {
        wrapper: TestProviders,
      });

      expect(result.current.getSelectedRulesCustomizationCounts(['rule-a'])).toEqual({
        total: 1,
        customizedCount: 1,
        ruleTypeChangeCount: 1,
      });
    });

    it('fetchAllRulesCustomizationCounts re-fetches the review and counts customized rules in the filtered set', async () => {
      const refetch = jest.fn().mockResolvedValue({
        isSuccess: true,
        data: buildReviewResult([], { total: 7 }).data,
      });
      mockUsePrebuiltRulesUpgradeReview.mockReturnValue({
        ...buildReviewResult([], { total: 5 }),
        refetch,
      });
      mockReviewRuleUpgrade.mockResolvedValue(buildReviewResult([], { total: 3 }).data);

      const { result } = renderHook(
        () => usePrebuiltRulesUpgrade({ filter: { tags: ['tag-a'] } }),
        { wrapper: TestProviders }
      );

      await expect(result.current.fetchAllRulesCustomizationCounts()).resolves.toEqual({
        total: 7,
        customizedCount: 3,
        ruleTypeChangeCount: undefined,
      });
      expect(refetch).toHaveBeenCalledTimes(1);
      expect(mockReviewRuleUpgrade).toHaveBeenCalledWith({
        signal: undefined,
        request: {
          page: 1,
          per_page: 0,
          filter: { tags: ['tag-a'], customization_status: RuleCustomizationStatus.CUSTOMIZED },
        },
      });
    });

    it('fetchAllRulesCustomizationCounts reports no customized rules without a request when filtered by not customized rules', async () => {
      const refetch = jest.fn().mockResolvedValue({
        isSuccess: true,
        data: buildReviewResult([], { total: 42 }).data,
      });
      mockUsePrebuiltRulesUpgradeReview.mockReturnValue({ ...buildReviewResult(), refetch });

      const { result } = renderHook(
        () =>
          usePrebuiltRulesUpgrade({
            filter: { customization_status: RuleCustomizationStatus.NOT_CUSTOMIZED },
          }),
        { wrapper: TestProviders }
      );

      await expect(result.current.fetchAllRulesCustomizationCounts()).resolves.toEqual({
        total: 42,
        customizedCount: 0,
        ruleTypeChangeCount: undefined,
      });
      expect(mockReviewRuleUpgrade).not.toHaveBeenCalled();
    });

    it('fetchAllRulesCustomizationCounts counts customized rules from the fresh response when filtered by rule ids', async () => {
      const customizedRule = createRuleUpgradeInfoMock({
        rule_id: 'rule-a',
        revision: 1,
        targetVersion: 1,
        currentRuleOverrides: {
          rule_source: {
            type: 'external',
            is_customized: true,
          },
        },
      });
      const notCustomizedRule = createRuleUpgradeInfoMock({
        rule_id: 'rule-b',
        revision: 1,
        targetVersion: 1,
      });
      const refetch = jest.fn().mockResolvedValue({
        isSuccess: true,
        data: buildReviewResult([customizedRule, notCustomizedRule]).data,
      });
      mockUsePrebuiltRulesUpgradeReview.mockReturnValue({ ...buildReviewResult(), refetch });

      const { result } = renderHook(
        () => usePrebuiltRulesUpgrade({ filter: { rule_ids: ['rule-a', 'rule-b'] } }),
        { wrapper: TestProviders }
      );

      await expect(result.current.fetchAllRulesCustomizationCounts()).resolves.toEqual({
        total: 2,
        customizedCount: 1,
        ruleTypeChangeCount: undefined,
      });
      expect(mockReviewRuleUpgrade).not.toHaveBeenCalled();
    });

    it('fetchAllRulesCustomizationCounts resolves to null when counting customized rules fails', async () => {
      const refetch = jest.fn().mockResolvedValue({
        isSuccess: true,
        data: buildReviewResult([], { total: 5 }).data,
      });
      mockUsePrebuiltRulesUpgradeReview.mockReturnValue({ ...buildReviewResult(), refetch });
      mockReviewRuleUpgrade.mockRejectedValue(new Error('boom'));

      const { result } = renderHook(() => usePrebuiltRulesUpgrade({ filter: {} }), {
        wrapper: TestProviders,
      });

      await expect(result.current.fetchAllRulesCustomizationCounts()).resolves.toBeNull();
    });

    it('fetchAllRulesCustomizationCounts resolves to null when the re-fetch fails even though cached data is retained', async () => {
      const cached = buildReviewResult([], { total: 5 });
      const refetch = jest.fn().mockResolvedValue({
        isSuccess: false,
        isError: true,
        error: new Error('boom'),
        data: cached.data,
      });
      mockUsePrebuiltRulesUpgradeReview.mockReturnValue({ ...cached, refetch });

      const { result } = renderHook(() => usePrebuiltRulesUpgrade({ filter: {} }), {
        wrapper: TestProviders,
      });

      await expect(result.current.fetchAllRulesCustomizationCounts()).resolves.toBeNull();
    });

    it('fetchAllRulesCustomizationCounts resolves to null when the re-fetch yields no data', async () => {
      const refetch = jest.fn().mockResolvedValue({ isSuccess: true, data: undefined });
      mockUsePrebuiltRulesUpgradeReview.mockReturnValue({ ...buildReviewResult([]), refetch });

      const { result } = renderHook(() => usePrebuiltRulesUpgrade({ filter: {} }), {
        wrapper: TestProviders,
      });

      await expect(result.current.fetchAllRulesCustomizationCounts()).resolves.toBeNull();
    });

    it('counts a non-external rule toward total but not toward customizedCount', () => {
      mockUsePrebuiltRulesUpgradeReview.mockReturnValue(
        buildReviewResult([
          createRuleUpgradeInfoMock({
            rule_id: 'rule-a',
            revision: 1,
            targetVersion: 1,
            currentRuleOverrides: { rule_source: { type: 'internal' } },
          }),
        ])
      );

      const { result } = renderHook(() => usePrebuiltRulesUpgrade({ filter: {} }), {
        wrapper: TestProviders,
      });

      expect(result.current.getSelectedRulesCustomizationCounts(['rule-a'])).toEqual({
        total: 1,
        customizedCount: 0,
        ruleTypeChangeCount: 0,
      });
    });

    it('getSelectedRulesCustomizationCounts returns total, customizedCount and ruleTypeChangeCount', () => {
      mockUsePrebuiltRulesUpgradeReview.mockReturnValue(
        buildReviewResult(
          [createRuleUpgradeInfoMock({ rule_id: 'rule-a', revision: 1, targetVersion: 1 })],
          { total: 1 }
        )
      );

      const { result } = renderHook(() => usePrebuiltRulesUpgrade({ filter: {} }), {
        wrapper: TestProviders,
      });

      expect(
        Object.keys(result.current.getSelectedRulesCustomizationCounts(['rule-a'])).sort()
      ).toEqual(['customizedCount', 'ruleTypeChangeCount', 'total']);
    });
  });
});

function buildReviewResult(
  rules: RuleUpgradeInfoForReview[] = [],
  overrides: { total?: number } = {}
) {
  return {
    data: {
      page: 1,
      per_page: 20,
      total: overrides.total ?? rules.length,
      stats: {
        num_rules_to_upgrade_total: rules.length,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      rules,
    },
    refetch: jest.fn(),
    dataUpdatedAt: 0,
    isFetched: true,
    isLoading: false,
    isFetching: false,
    isRefetching: false,
  };
}

function createRuleUpgradeInfoMock({
  rule_id: ruleId,
  revision,
  targetVersion,
  currentRuleOverrides,
  targetRuleOverrides,
  diffOverrides,
}: {
  rule_id: string;
  revision: number;
  targetVersion: number;
  currentRuleOverrides?: Partial<RuleResponse>;
  targetRuleOverrides?: Partial<RuleResponse>;
  // `fields` is a per-rule-type union, so a cross-type change (e.g. query -> esql) is only
  // representable loosely here.
  diffOverrides?: Partial<Omit<RuleUpgradeInfoForReview['diff'], 'fields'>> & {
    fields?: Record<string, unknown>;
  };
}): RuleUpgradeInfoForReview {
  return {
    id: `${ruleId}-so-id`,
    rule_id: ruleId,
    version: targetVersion,
    revision,
    current_rule: createRuleResponseMock({ revision, ...currentRuleOverrides }),
    target_rule: createRuleResponseMock({ version: targetVersion, ...targetRuleOverrides }),
    diff: {
      num_fields_with_updates: 0,
      num_fields_with_conflicts: 0,
      num_fields_with_non_solvable_conflicts: 0,
      fields: {},
      ...diffOverrides,
    } as RuleUpgradeInfoForReview['diff'],
    has_base_version: true,
  };
}

function createRuleResponseMock(rewrites?: Partial<RuleResponse>): RuleResponse {
  return {
    version: 1,
    revision: 1,
    rule_source: { type: 'external', is_customized: false },
    ...rewrites,
  } as RuleResponse;
}
