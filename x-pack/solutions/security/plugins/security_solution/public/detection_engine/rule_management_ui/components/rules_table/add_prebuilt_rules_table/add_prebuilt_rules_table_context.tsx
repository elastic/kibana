/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useIsMutating } from '@kbn/react-query';
import type { Dispatch, SetStateAction } from 'react';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { RuleSignatureId } from '../../../../../../common/api/detection_engine';
import type { RuleResponse } from '../../../../../../common/api/detection_engine/model/rule_schema';
import { invariant } from '../../../../../../common/utils/invariant';
import { useFetchPrebuiltRulesStatusQuery } from '../../../../rule_management/api/hooks/prebuilt_rules/use_fetch_prebuilt_rules_status_query';
import { PERFORM_ALL_RULES_INSTALLATION_KEY } from '../../../../rule_management/api/hooks/prebuilt_rules/use_perform_all_rules_install_mutation';
import {
  usePerformInstallAllRules,
  usePerformInstallSpecificRules,
} from '../../../../rule_management/logic/prebuilt_rules/use_perform_rule_install';
import { usePrebuiltRulesInstallReview } from '../../../../rule_management/logic/prebuilt_rules/use_prebuilt_rules_install_review';
import { useIsUpgradingSecurityPackages } from '../../../../rule_management/logic/use_upgrade_security_packages';
import { useRulePreviewFlyout } from '../use_rule_preview_flyout';
import { isUpgradeReviewRequestEnabled } from './add_prebuilt_rules_utils';
import * as i18n from './translations';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import { RULES_TABLE_INITIAL_PAGE_SIZE } from '../constants';
import type { PaginationOptions } from '../../../../rule_management/logic';
import type { PrebuiltRuleAssetsSortItem } from '../../../../../../common/api/detection_engine/prebuilt_rules/common/prebuilt_rule_assets_sort';

export interface AddPrebuiltRulesTableState {
  /**
   * Rules available to be installed after applying `filterOptions`
   */
  rules: RuleResponse[];
  /**
   * All unique tags for all rules
   */
  tags: string[];
  /**
   * Indicates whether there are rules (without filters applied) available to install.
   */
  hasRulesToInstall: boolean;
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
   * Is true when performing Install All Rules mutation
   */
  isInstallingAllRules: boolean;
  /**
   * Is true when any rule is currently being installed
   */
  isAnyRuleInstalling: boolean;
  /**
   * List of rule IDs that are currently being upgraded
   */
  loadingRules: RuleSignatureId[];
  /**
   * The timestamp for when the rules were successfully fetched
   */
  lastUpdated: number;
  /**
   * Rule rows selected in EUI InMemory Table
   */
  selectedRules: RuleResponse[];
  /**
   * Current pagination state
   */
  pagination: PaginationOptions;
  /**
   * Currently selected table sorting
   */
  sortingOptions: PrebuiltRuleAssetsSortItem | undefined;

  /**
   * Currently selected table filter
   */
  filterOptions: AddPrebuiltRulesTableFilterOptions;
}

export interface AddPrebuiltRulesTableFilterOptions {
  name: string;
  tags: string[];
}

export interface AddPrebuiltRulesTableActions {
  reFetchRules: () => void;
  installOneRule: (ruleId: RuleSignatureId, enable?: boolean) => void;
  installAllRules: () => void;
  installSelectedRules: (enable?: boolean) => void;
  setFilterOptions: Dispatch<SetStateAction<AddPrebuiltRulesTableFilterOptions>>;
  selectRules: (rules: RuleResponse[]) => void;
  setPagination: Dispatch<SetStateAction<{ page: number; perPage: number }>>;
  setSortingOptions: Dispatch<SetStateAction<PrebuiltRuleAssetsSortItem | undefined>>;
  openRulePreview: (ruleId: RuleSignatureId) => void;
}

export interface AddPrebuiltRulesContextType {
  state: AddPrebuiltRulesTableState;
  actions: AddPrebuiltRulesTableActions;
}

const AddPrebuiltRulesTableContext = createContext<AddPrebuiltRulesContextType | null>(null);

interface AddPrebuiltRulesTableContextProviderProps {
  children: React.ReactNode;
}

const PREBUILT_RULE_INSTALL_FLYOUT_ANCHOR = 'installPrebuiltRulePreview';

export const AddPrebuiltRulesTableContextProvider = ({
  children,
}: AddPrebuiltRulesTableContextProviderProps) => {
  const [loadingRules, setLoadingRules] = useState<RuleSignatureId[]>([]);
  const [selectedRules, setSelectedRules] = useState<RuleResponse[]>([]);

  const canEditRules = useUserPrivileges().rulesPrivileges.rules.edit;

  const [pagination, setPagination] = useState({
    page: 1,
    perPage: RULES_TABLE_INITIAL_PAGE_SIZE,
  });

  const [filterOptions, setInternalFilterOptions] = useState<AddPrebuiltRulesTableFilterOptions>({
    name: '',
    tags: [],
  });

  const setFilterOptions = useCallback<
    Dispatch<SetStateAction<AddPrebuiltRulesTableFilterOptions>>
  >((action) => {
    setInternalFilterOptions(action);
    setPagination((prev) => ({
      // Reset pagination to the first page when filters are changed to avoid displaying the wrong page of rules
      ...prev,
      page: 1,
    }));
  }, []);

  const [sortingOptions, setSortingOptions] = useState<PrebuiltRuleAssetsSortItem | undefined>();

  const { data: prebuiltRulesStatus } = useFetchPrebuiltRulesStatusQuery();

  const isUpgradingSecurityPackages = useIsUpgradingSecurityPackages();
  const isInstallingAllRules =
    useIsMutating({
      mutationKey: PERFORM_ALL_RULES_INSTALLATION_KEY,
    }) > 0;

  const isUpgradeReviewEnabled = isUpgradeReviewRequestEnabled({
    canEditRules,
    isUpgradingSecurityPackages,
    prebuiltRulesStatus: prebuiltRulesStatus?.stats,
  });
  const {
    data: reviewResponse,
    refetch,
    dataUpdatedAt,
    isFetched,
    isFetching,
    isLoading,
    isRefetching,
  } = usePrebuiltRulesInstallReview(
    {
      page: pagination.page,
      perPage: pagination.perPage,
      filterOptions,
      sortingOptions,
    },
    {
      refetchInterval: 60000, // Refetch available rules for installation every minute
      keepPreviousData: true, // Use this option so that the state doesn't jump between "success" and "loading" on page change
      // Fetch rules to install only after background installation of security_detection_rules package is complete
      enabled: isUpgradeReviewEnabled,
    }
  );

  const rules = useMemo(() => reviewResponse?.rules ?? [], [reviewResponse]);

  const rulesMatchingFilterCount = reviewResponse?.total ?? 0;
  const installableRulesCount = reviewResponse?.stats.num_rules_to_install ?? 0;

  const tags = useMemo(() => reviewResponse?.stats?.tags ?? [], [reviewResponse]);

  const isAnyRuleInstalling = loadingRules.length > 0 || isInstallingAllRules;

  const { mutateAsync: installAllRulesRequest } = usePerformInstallAllRules();
  const { mutateAsync: installSpecificRulesRequest } = usePerformInstallSpecificRules();

  const installOneRule = useCallback(
    async (ruleId: RuleSignatureId, enable?: boolean) => {
      const rule = rules.find((r) => r.rule_id === ruleId);
      invariant(rule, `Rule with id ${ruleId} not found`);

      setLoadingRules((prev) => [...prev, ruleId]);
      try {
        await installSpecificRulesRequest({
          rules: [{ rule_id: ruleId, version: rule.version }],
          enable,
        });
      } catch {
        // Error is handled by the mutation's onError callback, so no need to do anything here
      } finally {
        setLoadingRules((prev) => prev.filter((id) => id !== ruleId));
      }
    },
    [installSpecificRulesRequest, rules]
  );

  const installSelectedRules = useCallback(
    async (enable?: boolean) => {
      const rulesToUpgrade = selectedRules.map((rule) => ({
        rule_id: rule.rule_id,
        version: rule.version,
      }));
      setLoadingRules((prev) => [...prev, ...rulesToUpgrade.map((r) => r.rule_id)]);
      try {
        await installSpecificRulesRequest({ rules: rulesToUpgrade, enable });
      } catch {
        // Error is handled by the mutation's onError callback, so no need to do anything here
      } finally {
        setLoadingRules((prev) =>
          prev.filter((id) => !rulesToUpgrade.some((r) => r.rule_id === id))
        );
        setSelectedRules([]);
      }
    },
    [installSpecificRulesRequest, selectedRules]
  );

  const installAllRules = useCallback(async () => {
    // Unselect all rules so that the table doesn't show the "bulk actions" bar
    setLoadingRules((prev) => [...prev, ...rules.map((r) => r.rule_id)]);
    try {
      await installAllRulesRequest();
    } catch {
      // Error is handled by the mutation's onError callback, so no need to do anything here
    } finally {
      setLoadingRules([]);
      setSelectedRules([]);
    }
  }, [installAllRulesRequest, rules]);

  const ruleActionsFactory = useCallback(
    (rule: RuleResponse, closeRulePreview: () => void) => {
      const isPreviewRuleLoading = loadingRules.includes(rule.rule_id);
      const canPreviewedRuleBeInstalled =
        canEditRules && !(isPreviewRuleLoading || isRefetching || isUpgradingSecurityPackages);

      return (
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiButton
              disabled={!canPreviewedRuleBeInstalled}
              onClick={() => {
                installOneRule(rule.rule_id);
                closeRulePreview();
              }}
              data-test-subj="installPrebuiltRuleFromFlyoutButton"
            >
              {i18n.INSTALL_WITHOUT_ENABLING_BUTTON_LABEL}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiButton
              disabled={!canPreviewedRuleBeInstalled}
              onClick={() => {
                installOneRule(rule.rule_id, true);
                closeRulePreview();
              }}
              fill
              data-test-subj="installAndEnablePrebuiltRuleFromFlyoutButton"
            >
              {i18n.INSTALL_AND_ENABLE_BUTTON_LABEL}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    },
    [loadingRules, canEditRules, isRefetching, isUpgradingSecurityPackages, installOneRule]
  );

  const { rulePreviewFlyout, openRulePreview } = useRulePreviewFlyout({
    rules,
    ruleActionsFactory,
    flyoutProps: {
      id: PREBUILT_RULE_INSTALL_FLYOUT_ANCHOR,
      dataTestSubj: PREBUILT_RULE_INSTALL_FLYOUT_ANCHOR,
    },
  });

  const actions = useMemo(
    () => ({
      setPagination,
      setSortingOptions,
      setFilterOptions,
      installAllRules,
      installOneRule,
      installSelectedRules,
      reFetchRules: refetch,
      selectRules: setSelectedRules,
      openRulePreview,
    }),
    [
      setPagination,
      setSortingOptions,
      installAllRules,
      installOneRule,
      installSelectedRules,
      refetch,
      openRulePreview,
      setFilterOptions,
    ]
  );

  const providerValue = useMemo<AddPrebuiltRulesContextType>(() => {
    return {
      state: {
        rules,
        filterOptions,
        tags,
        hasRulesToInstall: installableRulesCount > 0,
        isFetched,
        isLoading,
        isFetching,
        loadingRules,
        isRefetching,
        isUpgradingSecurityPackages,
        isInstallingAllRules,
        isAnyRuleInstalling,
        selectedRules,
        lastUpdated: dataUpdatedAt,
        pagination: {
          ...pagination,
          total: rulesMatchingFilterCount,
        },
        sortingOptions,
      },
      actions,
    };
  }, [
    rules,
    filterOptions,
    tags,
    rulesMatchingFilterCount,
    installableRulesCount,
    isFetched,
    isFetching,
    isLoading,
    loadingRules,
    isRefetching,
    isUpgradingSecurityPackages,
    isInstallingAllRules,
    isAnyRuleInstalling,
    selectedRules,
    dataUpdatedAt,
    pagination,
    sortingOptions,
    actions,
  ]);

  return (
    <AddPrebuiltRulesTableContext.Provider value={providerValue}>
      <>
        {children}
        {rulePreviewFlyout}
      </>
    </AddPrebuiltRulesTableContext.Provider>
  );
};

export const useAddPrebuiltRulesTableContext = (): AddPrebuiltRulesContextType => {
  const rulesTableContext = useContext(AddPrebuiltRulesTableContext);
  invariant(
    rulesTableContext,
    'useAddPrebuiltRulesTableContext should be used inside AddPrebuiltRulesTableContextProvider'
  );

  return rulesTableContext;
};
