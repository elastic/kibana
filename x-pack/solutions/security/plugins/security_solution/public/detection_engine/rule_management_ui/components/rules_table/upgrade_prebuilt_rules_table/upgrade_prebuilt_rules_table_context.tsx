/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiToolTip } from '@elastic/eui';
import type { Dispatch, SetStateAction } from 'react';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { PrebuiltRulesCustomizationDisabledReason } from '../../../../../../common/detection_engine/prebuilt_rules/prebuilt_rule_customization_status';
import type {
  FindRulesSortField,
  PrebuiltRulesFilter,
  RuleFieldsToUpgrade,
  RuleUpgradeSpecifier,
  SortOrder,
} from '../../../../../../common/api/detection_engine';
import { usePrebuiltRulesCustomizationStatus } from '../../../../rule_management/logic/prebuilt_rules/use_prebuilt_rules_customization_status';
import type { RuleUpgradeState } from '../../../../rule_management/model/prebuilt_rule_upgrade';
import { RuleUpgradeTab } from '../../../../rule_management/components/rule_details/three_way_diff';
import { PerFieldRuleDiffTab } from '../../../../rule_management/components/rule_details/per_field_rule_diff_tab';
import { useIsUpgradingSecurityPackages } from '../../../../rule_management/logic/use_upgrade_security_packages';
import type {
  RuleResponse,
  RuleSignatureId,
} from '../../../../../../common/api/detection_engine/model/rule_schema';
import { invariant } from '../../../../../../common/utils/invariant';
import { TabContentPadding } from '../../../../rule_management/components/rule_details/rule_details_flyout';
import { usePerformUpgradeRules } from '../../../../rule_management/logic/prebuilt_rules/use_perform_rule_upgrade';
import { usePrebuiltRulesUpgradeReview } from '../../../../rule_management/logic/prebuilt_rules/use_prebuilt_rules_upgrade_review';
import { RuleDiffTab } from '../../../../rule_management/components/rule_details/rule_diff_tab';
import { FieldUpgradeStateEnum } from '../../../../rule_management/model/prebuilt_rule_upgrade/field_upgrade_state_enum';
import { useRulePreviewFlyout } from '../use_rule_preview_flyout';
import { usePrebuiltRulesUpgradeState } from './use_prebuilt_rules_upgrade_state';
import { useOutdatedMlJobsUpgradeModal } from './use_ml_jobs_upgrade_modal';
import { useUpgradeWithConflictsModal } from './use_upgrade_with_conflicts_modal';
import { RuleTypeChangeCallout } from './rule_type_change_callout';
import { UpgradeFlyoutSubHeader } from './upgrade_flyout_subheader';
import * as ruleDetailsI18n from '../../../../rule_management/components/rule_details/translations';
import * as i18n from './translations';
import { CustomizationDisabledCallout } from './customization_disabled_callout';
import { RULES_TABLE_INITIAL_PAGE_SIZE } from '../constants';
import type { PaginationOptions } from '../../../../rule_management/logic';
import { usePrebuiltRulesStatus } from '../../../../rule_management/logic/prebuilt_rules/use_prebuilt_rules_status';

const REVIEW_PREBUILT_RULES_UPGRADE_REFRESH_INTERVAL = 5 * 60 * 1000;

export interface UpgradePrebuiltRulesSortingOptions {
  field:
    | 'current_rule.name'
    | 'current_rule.risk_score'
    | 'current_rule.severity'
    | 'current_rule.last_updated';
  order: SortOrder;
}

export interface UpgradePrebuiltRulesTableState {
  /**
   * Rule upgrade state after applying `filterOptions`
   */
  ruleUpgradeStates: RuleUpgradeState[];
  /**
   * Currently selected table filter
   */
  filterOptions: PrebuiltRulesFilter;
  /**
   * All unique tags for all rules
   */
  tags: string[];
  /**
   * Indicates whether there are rules (without filters applied) to upgrade.
   */
  hasRulesToUpgrade: boolean;
  /**
   * Is true then there is no cached data and the query is currently fetching.
   */
  isLoading: boolean;
  /**
   * Is true whenever a request is in-flight, which includes initial loading as well as background refetches.
   */
  isFetching: boolean;
  /**
   * Will be true if the query has been fetched.
   */
  isFetched: boolean;
  /**
   * Is true whenever a background refetch is in-flight, which does not include initial loading
   */
  isRefetching: boolean;
  /**
   * Is true when installing security_detection_rules
   * package in background
   */
  isUpgradingSecurityPackages: boolean;
  /**
   * List of rule IDs that are currently being upgraded
   */
  loadingRules: RuleSignatureId[];
  /**
   * The timestamp for when the rules were successfully fetched
   */
  lastUpdated: number;
  /**
   * Current pagination state
   */
  pagination: PaginationOptions;
  /**
   * Currently selected table sorting
   */
  sortingOptions: UpgradePrebuiltRulesSortingOptions;
}

export const PREBUILT_RULE_UPDATE_FLYOUT_ANCHOR = 'updatePrebuiltRulePreview';

export interface UpgradePrebuiltRulesTableActions {
  reFetchRules: () => void;
  upgradeRules: (ruleIds: RuleSignatureId[]) => void;
  upgradeAllRules: () => void;
  setFilterOptions: Dispatch<SetStateAction<PrebuiltRulesFilter>>;
  setPagination: Dispatch<SetStateAction<{ page: number; perPage: number }>>;
  setSortingOptions: Dispatch<SetStateAction<UpgradePrebuiltRulesSortingOptions>>;
  openRulePreview: (ruleId: string) => void;
}

export interface UpgradePrebuiltRulesContextType {
  state: UpgradePrebuiltRulesTableState;
  actions: UpgradePrebuiltRulesTableActions;
}

const UpgradePrebuiltRulesTableContext = createContext<UpgradePrebuiltRulesContextType | null>(
  null
);

interface UpgradePrebuiltRulesTableContextProviderProps {
  children: React.ReactNode;
}

/**
 * Provides necessary data and actions for Rules Upgrade table.
 *
 * It periodically re-fetches prebuilt rules upgrade review data to detect possible cases of:
 *  - editing prebuilt rules (revision change)
 *  - releasing a new prebuilt rules package (version change)
 */
export const UpgradePrebuiltRulesTableContextProvider = ({
  children,
}: UpgradePrebuiltRulesTableContextProviderProps) => {
  const { isRulesCustomizationEnabled, customizationDisabledReason } =
    usePrebuiltRulesCustomizationStatus();

  // Use the data from the prebuilt rules status API to determine if there are
  // rules to upgrade because it returns information about all rules without filters
  const { data: prebuiltRulesStatusResponse } = usePrebuiltRulesStatus();
  const hasRulesToUpgrade =
    (prebuiltRulesStatusResponse?.stats.num_prebuilt_rules_to_upgrade ?? 0) > 0;
  const tags = prebuiltRulesStatusResponse?.aggregated_fields?.upgradeable_rules.tags;

  const [loadingRules, setLoadingRules] = useState<RuleSignatureId[]>([]);
  const [filterOptions, setFilterOptions] = useState<PrebuiltRulesFilter>({});
  const isUpgradingSecurityPackages = useIsUpgradingSecurityPackages();
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: RULES_TABLE_INITIAL_PAGE_SIZE,
  });
  const [sortingOptions, setSortingOptions] = useState<UpgradePrebuiltRulesSortingOptions>({
    field: 'current_rule.last_updated',
    order: 'asc',
  });

  const findRulesSortField = useMemo<FindRulesSortField>(
    () =>
      ((
        {
          'current_rule.name': 'name',
          'current_rule.risk_score': 'risk_score',
          'current_rule.severity': 'severity',
          'current_rule.last_updated': 'updated_at',
        } as const
      )[sortingOptions.field]),
    [sortingOptions.field]
  );

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
      sort: {
        field: findRulesSortField,
        order: sortingOptions.order,
      },
      filter: filterOptions,
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

  const upgradeRulesToResolved = useCallback(
    async (ruleIds: RuleSignatureId[]) => {
      const conflictRuleIdsSet = new Set(
        ruleIds.filter(
          (ruleId) =>
            rulesUpgradeState[ruleId].diff.num_fields_with_conflicts > 0 &&
            rulesUpgradeState[ruleId].hasUnresolvedConflicts
        )
      );
      const upgradingRuleIds = ruleIds.filter((ruleId) => !conflictRuleIdsSet.has(ruleId));
      const ruleUpgradeSpecifiers: RuleUpgradeSpecifier[] = upgradingRuleIds.map((ruleId) => ({
        rule_id: ruleId,
        version: rulesUpgradeState[ruleId].target_rule.version,
        revision: rulesUpgradeState[ruleId].revision,
        fields: constructRuleFieldsToUpgrade(rulesUpgradeState[ruleId]),
      }));

      setLoadingRules((prev) => [...prev, ...upgradingRuleIds]);

      try {
        // Handle MLJobs modal
        if (!(await confirmLegacyMLJobs())) {
          return;
        }

        if (conflictRuleIdsSet.size > 0 && !(await confirmConflictsUpgrade())) {
          return;
        }

        await upgradeRulesRequest({
          mode: 'SPECIFIC_RULES',
          pick_version: 'MERGED',
          rules: ruleUpgradeSpecifiers,
        });
      } catch {
        // Error is handled by the mutation's onError callback, so no need to do anything here
      } finally {
        const upgradedRuleIdsSet = new Set(upgradingRuleIds);

        setLoadingRules((prev) => prev.filter((id) => !upgradedRuleIdsSet.has(id)));
      }
    },
    [confirmLegacyMLJobs, confirmConflictsUpgrade, rulesUpgradeState, upgradeRulesRequest]
  );

  const upgradeRulesToTarget = useCallback(
    async (ruleIds: RuleSignatureId[]) => {
      const ruleUpgradeSpecifiers: RuleUpgradeSpecifier[] = ruleIds.map((ruleId) => ({
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

        setLoadingRules((prev) => prev.filter((id) => !upgradedRuleIdsSet.has(id)));
      }
    },
    [confirmLegacyMLJobs, rulesUpgradeState, upgradeRulesRequest]
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

      const dryRunResults = await upgradeRulesRequest({
        mode: 'ALL_RULES',
        pick_version: isRulesCustomizationEnabled ? 'MERGED' : 'TARGET',
        filter: filterOptions,
        dry_run: true,
        on_conflict: 'SKIP',
      });

      const hasConflicts = dryRunResults.results.skipped.some(
        (skippedRule) => skippedRule.reason === 'CONFLICT'
      );

      if (hasConflicts && !(await confirmConflictsUpgrade())) {
        return;
      }

      await upgradeRulesRequest({
        mode: 'ALL_RULES',
        pick_version: isRulesCustomizationEnabled ? 'MERGED' : 'TARGET',
        filter: filterOptions,
        on_conflict: 'SKIP',
      });
    } catch {
      // Error is handled by the mutation's onError callback, so no need to do anything here
    } finally {
      setLoadingRules([]);
    }
  }, [
    upgradeableRules,
    confirmLegacyMLJobs,
    upgradeRulesRequest,
    isRulesCustomizationEnabled,
    filterOptions,
    confirmConflictsUpgrade,
  ]);

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

      const hasRuleTypeChange = ruleUpgradeState.diff.fields.type?.has_update ?? false;
      return (
        <EuiButton
          disabled={
            loadingRules.includes(rule.rule_id) ||
            isRefetching ||
            isUpgradingSecurityPackages ||
            (ruleUpgradeState.hasUnresolvedConflicts && !hasRuleTypeChange) ||
            isEditingRule
          }
          onClick={() => {
            if (hasRuleTypeChange || isRulesCustomizationEnabled === false) {
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
      loadingRules,
      isRefetching,
      isUpgradingSecurityPackages,
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

      const hasRuleTypeChange = ruleUpgradeState.diff.fields.type?.has_update ?? false;
      const hasCustomizations =
        ruleUpgradeState.current_rule.rule_source.type === 'external' &&
        ruleUpgradeState.current_rule.rule_source.is_customized;

      let headerCallout = null;
      if (
        hasCustomizations &&
        customizationDisabledReason === PrebuiltRulesCustomizationDisabledReason.License
      ) {
        headerCallout = <CustomizationDisabledCallout />;
      } else if (hasRuleTypeChange && isRulesCustomizationEnabled) {
        headerCallout = <RuleTypeChangeCallout hasCustomizations={hasCustomizations} />;
      }

      let updateTabContent = (
        <PerFieldRuleDiffTab header={headerCallout} ruleDiff={ruleUpgradeState.diff} />
      );

      // Show the resolver tab only if rule customization is enabled and there
      // is no rule type change. In case of rule type change users can't resolve
      // conflicts, only accept the target rule.
      if (isRulesCustomizationEnabled && !hasRuleTypeChange) {
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
            />
          </div>
        ),
      };

      return [updatesTab, jsonViewTab];
    },
    [
      rulesUpgradeState,
      customizationDisabledReason,
      isRulesCustomizationEnabled,
      setRuleFieldResolvedValue,
    ]
  );
  const { rulePreviewFlyout, openRulePreview } = useRulePreviewFlyout({
    rules: ruleUpgradeStates.map(({ target_rule: targetRule }) => targetRule),
    subHeaderFactory,
    ruleActionsFactory,
    extraTabsFactory,
    flyoutProps: {
      id: PREBUILT_RULE_UPDATE_FLYOUT_ANCHOR,
      dataTestSubj: PREBUILT_RULE_UPDATE_FLYOUT_ANCHOR,
    },
  });

  const actions = useMemo<UpgradePrebuiltRulesTableActions>(
    () => ({
      reFetchRules: refetch,
      upgradeRules,
      upgradeAllRules,
      setFilterOptions,
      openRulePreview,
      setPagination,
      setSortingOptions,
    }),
    [refetch, upgradeRules, upgradeAllRules, openRulePreview]
  );

  const providerValue = useMemo<UpgradePrebuiltRulesContextType>(
    () => ({
      state: {
        ruleUpgradeStates,
        hasRulesToUpgrade,
        filterOptions,
        tags: tags ?? [],
        isFetched,
        isLoading: isLoading || areMlJobsLoading,
        isFetching,
        isRefetching,
        isUpgradingSecurityPackages,
        loadingRules,
        lastUpdated: dataUpdatedAt,
        pagination: {
          ...pagination,
          total: upgradeReviewResponse?.total ?? 0,
        },
        sortingOptions,
      },
      actions,
    }),
    [
      ruleUpgradeStates,
      hasRulesToUpgrade,
      filterOptions,
      tags,
      isFetched,
      isLoading,
      areMlJobsLoading,
      isFetching,
      isRefetching,
      isUpgradingSecurityPackages,
      loadingRules,
      dataUpdatedAt,
      pagination,
      upgradeReviewResponse?.total,
      sortingOptions,
      actions,
    ]
  );

  return (
    <UpgradePrebuiltRulesTableContext.Provider value={providerValue}>
      <>
        {confirmLegacyMlJobsUpgradeModal}
        {upgradeConflictsModal}
        {children}
        {rulePreviewFlyout}
      </>
    </UpgradePrebuiltRulesTableContext.Provider>
  );
};

export const useUpgradePrebuiltRulesTableContext = (): UpgradePrebuiltRulesContextType => {
  const rulesTableContext = useContext(UpgradePrebuiltRulesTableContext);
  invariant(
    rulesTableContext,
    'useUpgradePrebuiltRulesTableContext should be used inside UpgradePrebuiltRulesTableContextProvider'
  );

  return rulesTableContext;
};

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
