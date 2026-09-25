/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiButton, EuiToolTip } from '@elastic/eui';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { RuleUpgradeEventTypes } from '../../../common/lib/telemetry/events/rule_upgrade/types';
import type { ReviewPrebuiltRuleUpgradeFilter } from '../../../../common/api/detection_engine/prebuilt_rules/common/review_prebuilt_rules_upgrade_filter';
import { isRuleCustomized } from '../../../../common/detection_engine/rule_management/utils';
import {
  FieldUpgradeStateEnum,
  type RuleUpgradeCustomizationCounts,
  type RuleUpgradeState,
} from '../model/prebuilt_rule_upgrade';
import { PerFieldRuleDiffTab } from '../components/rule_details/per_field_rule_diff_tab';
import { useIsInitializingPrebuiltRulesPackage } from '../logic/prebuilt_rules/use_is_initializing_prebuilt_rules_package';
import { usePrebuiltRulesCustomizationStatus } from '../logic/prebuilt_rules/use_prebuilt_rules_customization_status';
import { usePerformUpgradeRules } from '../logic/prebuilt_rules/use_perform_rule_upgrade';
import { usePrebuiltRulesUpgradeReview } from '../logic/prebuilt_rules/use_prebuilt_rules_upgrade_review';
import { reviewRuleUpgrade } from '../api/api';
import {
  type FindRulesSortField,
  type RuleFieldsToUpgrade,
  type RuleResponse,
  type RuleSignatureId,
  type RuleUpgradeSpecifier,
  type PerformRuleUpgradeRequestBody,
  type UpgradeConflictSkipReason,
  RuleCustomizationStatus,
  ThreeWayDiffConflict,
  SkipRuleUpgradeReasonEnum,
  UpgradeConflictResolutionEnum,
} from '../../../../common/api/detection_engine';
import { usePrebuiltRulesUpgradeState } from '../../rule_management_ui/components/rules_table/upgrade_prebuilt_rules_table/use_prebuilt_rules_upgrade_state';
import { useOutdatedMlJobsUpgradeModal } from '../../rule_management_ui/components/rules_table/upgrade_prebuilt_rules_table/use_ml_jobs_upgrade_modal';
import {
  ConfirmRulesUpgrade,
  useUpgradeWithConflictsModal,
} from '../../rule_management_ui/components/rules_table/upgrade_prebuilt_rules_table/use_upgrade_with_conflicts_modal';
import * as ruleDetailsI18n from '../components/rule_details/translations';
import * as i18n from '../../rule_management_ui/components/rules_table/upgrade_prebuilt_rules_table/translations';
import { UpgradeFlyoutSubHeader } from '../../rule_management_ui/components/rules_table/upgrade_prebuilt_rules_table/upgrade_flyout_subheader';
import { CustomizationDisabledCallout } from '../../rule_management_ui/components/rules_table/upgrade_prebuilt_rules_table/customization_disabled_callout';
import { RuleUpgradeTab } from '../components/rule_details/three_way_diff';
import { RuleTypeChangeCallout } from '../../rule_management_ui/components/rules_table/upgrade_prebuilt_rules_table/rule_type_change_callout';
import { RuleDiffTab } from '../components/rule_details/rule_diff_tab';
import type { RulePreviewFlyoutCloseReason } from '../../rule_management_ui/components/rules_table/use_rule_preview_flyout';
import { useRulePreviewFlyout } from '../../rule_management_ui/components/rules_table/use_rule_preview_flyout';
import type { UpgradePrebuiltRulesSortingOptions } from '../../rule_management_ui/components/rules_table/upgrade_prebuilt_rules_table/upgrade_prebuilt_rules_table_context';
import { RULES_TABLE_INITIAL_PAGE_SIZE } from '../../rule_management_ui/components/rules_table/constants';
import type { RulesConflictStats } from '../../rule_management_ui/components/rules_table/upgrade_prebuilt_rules_table/use_upgrade_with_conflicts_modal/conflicts_description';
import { useKibana } from '../../../common/lib/kibana';
import { TabContentPadding } from '../components/rule_details/rule_details_flyout';

const REVIEW_PREBUILT_RULES_UPGRADE_REFRESH_INTERVAL = 5 * 60 * 1000;
const RULE_UPGRADE_FLYOUT_BUTTON_EVENT_VERSION = 2;
const RULE_UPGRADE_FLYOUT_OPEN_EVENT_VERSION = 2;

export const PREBUILT_RULE_UPDATE_FLYOUT_ANCHOR = 'updatePrebuiltRulePreview';

export interface UsePrebuiltRulesUpgradeParams {
  pagination?: {
    page: number;
    perPage: number;
  };
  sort?: { order: UpgradePrebuiltRulesSortingOptions['order']; field: FindRulesSortField };
  filter: ReviewPrebuiltRuleUpgradeFilter;
  onUpgrade?: () => void;
}

export function usePrebuiltRulesUpgrade({
  pagination = { page: 1, perPage: RULES_TABLE_INITIAL_PAGE_SIZE },
  sort,
  filter,
  onUpgrade,
}: UsePrebuiltRulesUpgradeParams) {
  const { isRulesCustomizationEnabled } = usePrebuiltRulesCustomizationStatus();
  const isInitializingPrebuiltRulesPackage = useIsInitializingPrebuiltRulesPackage();
  const [loadingRules, setLoadingRules] = useState<RuleSignatureId[]>([]);
  const { telemetry } = useKibana().services;
  const canEditRules = useUserPrivileges().rulesPrivileges.rules.edit;

  const {
    data: upgradeReviewResponse,
    refetch,
    dataUpdatedAt,
    isFetched,
    isLoading,
    isFetching,
    isRefetching,
  } = usePrebuiltRulesUpgradeReview(
    {
      page: pagination.page,
      per_page: pagination.perPage,
      sort,
      filter,
    },
    {
      refetchInterval: REVIEW_PREBUILT_RULES_UPGRADE_REFRESH_INTERVAL,
      keepPreviousData: true, // Use this option so that the state doesn't jump between "success" and "loading" on page change
    }
  );

  const upgradeableRules = useMemo(
    () => upgradeReviewResponse?.rules ?? [],
    [upgradeReviewResponse]
  );

  const { rulesUpgradeState, setRuleFieldResolvedValue } =
    usePrebuiltRulesUpgradeState(upgradeableRules);
  const ruleUpgradeStates = useMemo(() => Object.values(rulesUpgradeState), [rulesUpgradeState]);

  const {
    modal: confirmLegacyMlJobsUpgradeModal,
    confirmLegacyMLJobs,
    isLoading: areMlJobsLoading,
  } = useOutdatedMlJobsUpgradeModal();
  const { modal: upgradeConflictsModal, confirmConflictsUpgrade } = useUpgradeWithConflictsModal();

  const { mutateAsync: upgradeRulesRequest } = usePerformUpgradeRules();
  const upgradeRulesWithDryRun = useRulesUpgradeWithDryRun(confirmConflictsUpgrade);

  const upgradeRulesToResolved = useCallback(
    async (ruleIds: RuleSignatureId[]) => {
      const ruleUpgradeSpecifiers: RuleUpgradeSpecifier[] = ruleIds
        .filter((ruleId) => rulesUpgradeState[ruleId] !== undefined)
        .map((ruleId) => ({
          rule_id: ruleId,
          version: rulesUpgradeState[ruleId].target_rule.version,
          revision: rulesUpgradeState[ruleId].revision,
          fields: constructRuleFieldsToUpgrade(rulesUpgradeState[ruleId]),
        }));

      setLoadingRules((prev) => [...prev, ...ruleIds]);

      try {
        // Handle MLJobs modal
        if (!(await confirmLegacyMLJobs())) {
          return;
        }

        await upgradeRulesWithDryRun({
          mode: 'SPECIFIC_RULES',
          pick_version: 'MERGED',
          rules: ruleUpgradeSpecifiers,
        });
      } catch {
        // Error is handled by the mutation's onError callback, so no need to do anything here
      } finally {
        const upgradedRuleIdsSet = new Set(ruleIds);

        if (onUpgrade) {
          onUpgrade();
        }

        setLoadingRules((prev) => prev.filter((id) => !upgradedRuleIdsSet.has(id)));
      }
    },
    [rulesUpgradeState, confirmLegacyMLJobs, upgradeRulesWithDryRun, onUpgrade]
  );

  const upgradeRulesToTarget = useCallback(
    async (ruleIds: RuleSignatureId[]) => {
      const ruleUpgradeSpecifiers: RuleUpgradeSpecifier[] = ruleIds
        .filter((ruleId) => rulesUpgradeState[ruleId] !== undefined)
        .map((ruleId) => ({
          rule_id: ruleId,
          version: rulesUpgradeState[ruleId].target_rule.version,
          revision: rulesUpgradeState[ruleId].revision,
        }));

      setLoadingRules((prev) => [...prev, ...ruleIds]);

      try {
        // Handle MLJobs modal
        if (!(await confirmLegacyMLJobs())) {
          return;
        }

        await upgradeRulesRequest({
          mode: 'SPECIFIC_RULES',
          pick_version: 'TARGET',
          rules: ruleUpgradeSpecifiers,
        });
      } catch {
        // Error is handled by the mutation's onError callback, so no need to do anything here
      } finally {
        const upgradedRuleIdsSet = new Set(ruleIds);

        if (onUpgrade) {
          onUpgrade();
        }

        setLoadingRules((prev) => prev.filter((id) => !upgradedRuleIdsSet.has(id)));
      }
    },
    [confirmLegacyMLJobs, onUpgrade, rulesUpgradeState, upgradeRulesRequest]
  );

  const upgradeRules = useCallback(
    async (ruleIds: RuleSignatureId[]) => {
      if (isRulesCustomizationEnabled) {
        await upgradeRulesToResolved(ruleIds);
      } else {
        await upgradeRulesToTarget(ruleIds);
      }
    },
    [isRulesCustomizationEnabled, upgradeRulesToResolved, upgradeRulesToTarget]
  );

  const upgradeAllRules = useCallback(async () => {
    setLoadingRules((prev) => [...prev, ...upgradeableRules.map((rule) => rule.rule_id)]);

    try {
      // Handle MLJobs modal
      if (!(await confirmLegacyMLJobs())) {
        return;
      }

      if (isRulesCustomizationEnabled) {
        await upgradeRulesWithDryRun({
          mode: 'ALL_RULES',
          pick_version: 'MERGED',
          filter,
        });
      } else {
        // Upgrading prebuilt rules to TARGET version will erase any rule customizations.
        // It's unnecessary to run a dry run request since we don't expect skipped rules.
        await upgradeRulesRequest({
          mode: 'ALL_RULES',
          pick_version: 'TARGET',
          filter,
        });
      }
    } catch {
      // Error is handled by the mutation's onError callback, so no need to do anything here
    } finally {
      setLoadingRules([]);
    }
  }, [
    upgradeableRules,
    upgradeRulesWithDryRun,
    upgradeRulesRequest,
    confirmLegacyMLJobs,
    isRulesCustomizationEnabled,
    filter,
  ]);

  const upgradeAllRulesToTarget = useCallback(async () => {
    if (filter.rule_ids?.length) {
      await upgradeRulesToTarget(upgradeableRules.map((rule) => rule.rule_id));
      return;
    }

    setLoadingRules((prev) => [...prev, ...upgradeableRules.map((rule) => rule.rule_id)]);

    try {
      // Handle MLJobs modal
      if (!(await confirmLegacyMLJobs())) {
        return;
      }

      await upgradeRulesRequest({
        mode: 'ALL_RULES',
        pick_version: 'TARGET',
        filter,
      });

      if (onUpgrade) {
        onUpgrade();
      }
    } catch {
      // Error is handled by the mutation's onError callback, so no need to do anything here
    } finally {
      setLoadingRules([]);
    }
  }, [
    confirmLegacyMLJobs,
    filter,
    onUpgrade,
    upgradeableRules,
    upgradeRulesRequest,
    upgradeRulesToTarget,
  ]);

  const getSelectedRulesCustomizationCounts = useCallback(
    (ruleIds: RuleSignatureId[]): RuleUpgradeCustomizationCounts => {
      const selectedRuleUpgradeStates = ruleIds
        .map((ruleId) => rulesUpgradeState[ruleId])
        .filter((state): state is RuleUpgradeState => state !== undefined);

      return {
        total: selectedRuleUpgradeStates.length,
        customizedCount: selectedRuleUpgradeStates.filter((state) =>
          isRuleCustomized(state.current_rule)
        ).length,
        ruleTypeChangeCount: selectedRuleUpgradeStates.filter(hasRuleTypeChange).length,
      };
    },
    [rulesUpgradeState]
  );

  /**
   * Re-fetches the upgrade review and counts the customized rules in the filtered set so that the
   * "Update all" confirmation reflects customizations made since the cached review loaded.
   */
  const fetchAllRulesCustomizationCounts =
    useCallback(async (): Promise<RuleUpgradeCustomizationCounts | null> => {
      try {
        const [result, customizedCount] = await Promise.all([
          refetch(),
          fetchCustomizedRulesCount(filter),
        ]);

        // A failed refetch keeps the previously cached `data`, so the status has to be checked
        // explicitly or stale counts would be mistaken for fresh ones.
        if (!result.isSuccess || !result.data) {
          return null;
        }

        return {
          total: result.data.total,
          customizedCount:
            customizedCount ??
            result.data.rules.filter((rule) => isRuleCustomized(rule.current_rule)).length,
          // Rule type changes are a current-vs-target diff, not a stored attribute, so they cannot
          // be counted for the whole filtered set without a dry run.
          ruleTypeChangeCount: undefined,
        };
      } catch {
        return null;
      }
    }, [filter, refetch]);

  const subHeaderFactory = useCallback(
    (rule: RuleResponse) =>
      rulesUpgradeState[rule.rule_id] ? (
        <UpgradeFlyoutSubHeader ruleUpgradeState={rulesUpgradeState[rule.rule_id]} />
      ) : null,
    [rulesUpgradeState]
  );
  const ruleActionsFactory = useCallback(
    (rule: RuleResponse, closeRulePreview: () => void, isEditingRule: boolean) => {
      const ruleUpgradeState = rulesUpgradeState[rule.rule_id];
      if (!ruleUpgradeState) {
        return null;
      }

      const isRuleTypeChanging = hasRuleTypeChange(ruleUpgradeState);
      return (
        <EuiButton
          disabled={
            !canEditRules ||
            loadingRules.includes(rule.rule_id) ||
            isRefetching ||
            isInitializingPrebuiltRulesPackage ||
            (ruleUpgradeState.hasUnresolvedConflicts && !isRuleTypeChanging) ||
            isEditingRule
          }
          onClick={() => {
            if (isRuleTypeChanging || isRulesCustomizationEnabled === false) {
              // If there is a rule type change, we can't resolve conflicts, only accept the target rule
              upgradeRulesToTarget([rule.rule_id]);
            } else {
              upgradeRulesToResolved([rule.rule_id]);
            }
            closeRulePreview();
          }}
          fill
          data-test-subj="updatePrebuiltRuleFromFlyoutButton"
        >
          {i18n.UPDATE_BUTTON_LABEL}
        </EuiButton>
      );
    },
    [
      rulesUpgradeState,
      canEditRules,
      loadingRules,
      isRefetching,
      isInitializingPrebuiltRulesPackage,
      isRulesCustomizationEnabled,
      upgradeRulesToTarget,
      upgradeRulesToResolved,
    ]
  );
  const extraTabsFactory = useCallback(
    (rule: RuleResponse) => {
      const ruleUpgradeState = rulesUpgradeState[rule.rule_id];

      if (!ruleUpgradeState) {
        return [];
      }

      const isRuleTypeChanging = hasRuleTypeChange(ruleUpgradeState);
      const hasCustomizations =
        ruleUpgradeState.current_rule.rule_source.type === 'external' &&
        ruleUpgradeState.current_rule.rule_source.is_customized;

      let headerCallout = null;
      if (hasCustomizations && !isRulesCustomizationEnabled) {
        headerCallout = <CustomizationDisabledCallout />;
      } else if (isRuleTypeChanging && isRulesCustomizationEnabled) {
        headerCallout = <RuleTypeChangeCallout hasCustomizations={hasCustomizations} />;
      }

      let updateTabContent = (
        <PerFieldRuleDiffTab
          header={headerCallout}
          ruleDiff={ruleUpgradeState.diff}
          leftDiffSideLabel={i18n.CURRENT_RULE_VERSION}
          rightDiffSideLabel={i18n.ELASTIC_UPDATE_VERSION}
          leftDiffSideDescription={i18n.CURRENT_VERSION_DESCRIPTION}
          rightDiffSideDescription={i18n.UPDATED_VERSION_DESCRIPTION}
        />
      );

      // Show the resolver tab only if rule customization is enabled and there
      // is no rule type change. In case of rule type change users can't resolve
      // conflicts, only accept the target rule.
      if (isRulesCustomizationEnabled && !isRuleTypeChanging) {
        updateTabContent = (
          <RuleUpgradeTab
            ruleUpgradeState={ruleUpgradeState}
            setRuleFieldResolvedValue={setRuleFieldResolvedValue}
          />
        );
      }

      const updatesTab = {
        id: 'updates',
        name: (
          <EuiToolTip position="top" content={i18n.UPDATE_FLYOUT_PER_FIELD_TOOLTIP_DESCRIPTION}>
            <>{ruleDetailsI18n.UPDATES_TAB_LABEL}</>
          </EuiToolTip>
        ),
        content: <TabContentPadding>{updateTabContent}</TabContentPadding>,
      };

      const jsonViewTab = {
        id: 'jsonViewUpdates',
        name: (
          <EuiToolTip position="top" content={i18n.UPDATE_FLYOUT_JSON_VIEW_TOOLTIP_DESCRIPTION}>
            <>{ruleDetailsI18n.JSON_VIEW_UPDATES_TAB_LABEL}</>
          </EuiToolTip>
        ),
        content: (
          <div>
            <RuleDiffTab
              oldRule={ruleUpgradeState.current_rule}
              newRule={ruleUpgradeState.target_rule}
              leftDiffSideLabel={i18n.CURRENT_RULE_VERSION}
              rightDiffSideLabel={i18n.ELASTIC_UPDATE_VERSION}
              leftDiffSideDescription={i18n.CURRENT_VERSION_DESCRIPTION}
              rightDiffSideDescription={i18n.UPDATED_VERSION_DESCRIPTION}
            />
          </div>
        ),
      };

      return [updatesTab, jsonViewTab];
    },
    [rulesUpgradeState, isRulesCustomizationEnabled, setRuleFieldResolvedValue]
  );
  const closeRulePreviewAction = (rule: RuleResponse, reason: RulePreviewFlyoutCloseReason) => {
    const ruleUpgradeState = rulesUpgradeState[rule.rule_id];
    const hasBaseVersion = ruleUpgradeState.has_base_version === true;
    if (reason === 'dismiss') {
      telemetry.reportEvent(RuleUpgradeEventTypes.RuleUpgradeFlyoutButtonClick, {
        type: 'dismiss',
        hasBaseVersion,
        eventVersion: RULE_UPGRADE_FLYOUT_BUTTON_EVENT_VERSION,
      });
    } else {
      telemetry.reportEvent(RuleUpgradeEventTypes.RuleUpgradeFlyoutButtonClick, {
        type: 'update',
        hasBaseVersion,
        eventVersion: RULE_UPGRADE_FLYOUT_BUTTON_EVENT_VERSION,
      });
    }
  };
  const { rulePreviewFlyout, openRulePreview: openRulePreviewDefault } = useRulePreviewFlyout({
    rules: ruleUpgradeStates.map(({ target_rule: targetRule }) => targetRule),
    subHeaderFactory,
    ruleActionsFactory,
    extraTabsFactory,
    flyoutProps: {
      id: PREBUILT_RULE_UPDATE_FLYOUT_ANCHOR,
      dataTestSubj: PREBUILT_RULE_UPDATE_FLYOUT_ANCHOR,
    },
    closeRulePreviewAction,
  });

  const openRulePreview = useCallback(
    (ruleId: string) => {
      openRulePreviewDefault(ruleId);
      const ruleUpgradeState = rulesUpgradeState[ruleId];
      const hasBaseVersion = ruleUpgradeState.has_base_version === true;

      telemetry.reportEvent(RuleUpgradeEventTypes.RuleUpgradeFlyoutOpen, {
        hasBaseVersion,
        eventVersion: RULE_UPGRADE_FLYOUT_OPEN_EVENT_VERSION,
      });
    },
    [openRulePreviewDefault, rulesUpgradeState, telemetry]
  );

  return {
    ruleUpgradeStates,
    upgradeReviewResponse,
    isFetched,
    isLoading: isLoading || areMlJobsLoading,
    isFetching,
    isRefetching,
    isInitializingPrebuiltRulesPackage,
    loadingRules,
    lastUpdated: dataUpdatedAt,
    rulePreviewFlyout,
    confirmLegacyMlJobsUpgradeModal,
    upgradeConflictsModal,
    openRulePreview,
    reFetchRules: refetch,
    upgradeRules,
    upgradeAllRules,
    upgradeRulesToTarget,
    upgradeAllRulesToTarget,
    getSelectedRulesCustomizationCounts,
    fetchAllRulesCustomizationCounts,
  };
}

/**
 * Upgrading to the target version always applies the target rule type, so the type changes
 * whenever it differs from the current one. `diff.fields.type.has_update` is not usable here
 * because it is false for `CustomizedValueNoUpdate` (BASE=A, CURRENT=B, TARGET=A) although the
 * upgrade resets the type, matching `hasRuleTypeChanged` on the server.
 */
function hasRuleTypeChange(ruleUpgradeState: RuleUpgradeState): boolean {
  return ruleUpgradeState.current_rule.type !== ruleUpgradeState.target_rule.type;
}

/**
 * Counts the customized rules matching the filter via an upgrade review request that returns no
 * rules. Returns `undefined` for a rule ids scoped filter since the review ignores the other
 * filter criteria then, so the count has to be derived from the returned rules instead.
 */
async function fetchCustomizedRulesCount(
  filter: ReviewPrebuiltRuleUpgradeFilter
): Promise<number | undefined> {
  if (filter.rule_ids?.length) {
    return undefined;
  }

  if (filter.customization_status === RuleCustomizationStatus.NOT_CUSTOMIZED) {
    return 0;
  }

  const { total } = await reviewRuleUpgrade({
    signal: undefined,
    request: {
      page: 1,
      per_page: 0,
      filter: { ...filter, customization_status: RuleCustomizationStatus.CUSTOMIZED },
    },
  });

  return total;
}

/**
 * Upgrades rules in two steps
 * - first fires a dry run request to check for rule upgrade conflicts. If there are conflicts
 *   it calls `confirmConflictsUpgrade()` and await its result.
 * - second it either fires a request to upgrade rules or exits depending on user's choice
 */
function useRulesUpgradeWithDryRun(
  confirmConflictsUpgrade: (
    conflictsStats: RulesConflictStats
  ) => Promise<ConfirmRulesUpgrade | boolean>
) {
  const { mutateAsync: upgradeRulesRequest } = usePerformUpgradeRules();

  return useCallback(
    async (requestParams: PerformRuleUpgradeRequestBody) => {
      const dryRunResults = await upgradeRulesRequest({
        ...requestParams,
        dry_run: true,
        on_conflict: UpgradeConflictResolutionEnum.SKIP,
      });

      const rulesWithSolvableConflicts = dryRunResults.results.skipped.filter(
        (x): x is UpgradeConflictSkipReason =>
          x.reason === SkipRuleUpgradeReasonEnum.CONFLICT &&
          x.conflict === ThreeWayDiffConflict.SOLVABLE
      );
      const numOfRulesWithSolvableConflicts = rulesWithSolvableConflicts.length;
      const numOfRulesWithRuleTypeChange = rulesWithSolvableConflicts.filter(
        (x) => x.rule_type_change !== undefined
      ).length;
      const numOfRulesWithNonSolvableConflicts = dryRunResults.results.skipped.filter(
        (x) =>
          x.reason === SkipRuleUpgradeReasonEnum.CONFLICT &&
          x.conflict === ThreeWayDiffConflict.NON_SOLVABLE
      ).length;

      if (numOfRulesWithSolvableConflicts === 0 && numOfRulesWithNonSolvableConflicts === 0) {
        // There are no rule with conflicts
        await upgradeRulesRequest({
          ...requestParams,
          on_conflict: UpgradeConflictResolutionEnum.SKIP,
        });
      } else {
        const result = await confirmConflictsUpgrade({
          numOfRulesWithoutConflicts: dryRunResults.results.updated.length,
          numOfRulesWithSolvableConflicts,
          numOfRulesWithNonSolvableConflicts,
          numOfRulesWithRuleTypeChange,
        });

        if (!result) {
          return;
        }

        await upgradeRulesRequest({
          ...requestParams,
          on_conflict:
            result === ConfirmRulesUpgrade.WithSolvableConflicts
              ? UpgradeConflictResolutionEnum.UPGRADE_SOLVABLE
              : UpgradeConflictResolutionEnum.SKIP,
        });
      }
    },
    [upgradeRulesRequest, confirmConflictsUpgrade]
  );
}

function constructRuleFieldsToUpgrade(ruleUpgradeState: RuleUpgradeState): RuleFieldsToUpgrade {
  const ruleFieldsToUpgrade: Record<string, unknown> = {};

  for (const [fieldName, fieldUpgradeState] of Object.entries(
    ruleUpgradeState.fieldsUpgradeState
  )) {
    if (fieldUpgradeState.state === FieldUpgradeStateEnum.Accepted) {
      ruleFieldsToUpgrade[fieldName] = {
        pick_version: 'RESOLVED',
        resolved_value: fieldUpgradeState.resolvedValue,
      };
    }
  }

  return ruleFieldsToUpgrade;
}
