/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { useIsMutating } from '@kbn/react-query';
import type { Dispatch, SetStateAction } from 'react';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { RULES_ADD_PATH } from '../../../../../../common/constants';
import type { RuleSignatureId } from '../../../../../../common/api/detection_engine';
import type { RuleResponse } from '../../../../../../common/api/detection_engine/model/rule_schema';
import { invariant } from '../../../../../../common/utils/invariant';
import { useFetchPrebuiltRulesStatusQuery } from '../../../../rule_management/api/hooks/prebuilt_rules/use_fetch_prebuilt_rules_status_query';
import { useInvalidatePrebuiltRulesStatusOnInit } from '../../../../rule_management/logic/prebuilt_rules/use_invalidate_prebuilt_rules_status_on_init';
import { PERFORM_ALL_RULES_INSTALLATION_KEY } from '../../../../rule_management/api/hooks/prebuilt_rules/use_perform_all_rules_install_mutation';
import {
  usePerformInstallAllRules,
  usePerformInstallSpecificRules,
} from '../../../../rule_management/logic/prebuilt_rules/use_perform_rule_install';
import { usePrebuiltRulesInstallReview } from '../../../../rule_management/logic/prebuilt_rules/use_prebuilt_rules_install_review';
import { useFindInstalledPrebuiltRuleByRuleId } from '../../../../rule_management/logic/use_find_installed_prebuilt_rule_by_rule_id';
import { useIsInitializingPrebuiltRulesPackage } from '../../../../rule_management/logic/prebuilt_rules/use_is_initializing_prebuilt_rules_package';
import { useRulePreviewFlyout } from '../use_rule_preview_flyout';
import { isUpgradeReviewRequestEnabled } from './add_prebuilt_rules_utils';
import * as i18n from './translations';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import { RULES_TABLE_INITIAL_PAGE_SIZE } from '../constants';
import type { PaginationOptions } from '../../../../rule_management/logic';
import type { PrebuiltRuleAssetsSortItem } from '../../../../../../common/api/detection_engine/prebuilt_rules/review_rule_installation/review_rule_installation_route.gen';

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
   * Is true while the `security_detection_engine` Fleet package is being
   * initialized (installed or upgraded) in the background.
   */
  isInitializingPrebuiltRulesPackage: boolean;
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
  const history = useHistory();
  const { ruleId: ruleIdFromUrl } = useParams<{ ruleId?: string }>();

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

  useInvalidatePrebuiltRulesStatusOnInit();
  const { data: prebuiltRulesStatus } = useFetchPrebuiltRulesStatusQuery();

  const isInitializingPrebuiltRulesPackage = useIsInitializingPrebuiltRulesPackage();
  const isInstallingAllRules =
    useIsMutating({
      mutationKey: PERFORM_ALL_RULES_INSTALLATION_KEY,
    }) > 0;

  const isUpgradeReviewEnabled = isUpgradeReviewRequestEnabled({
    canEditRules,
    isInitializingPrebuiltRulesPackage,
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

  // When deep-linked to a specific rule (e.g. from a chat recommendation link at
  // /rules/add_rules/<rule_id>), the target may not fall on the current page of the
  // catalog. Fetch it directly by `rule_id` so the preview flyout has data regardless of
  // pagination. Scoped to the flyout only — the table keeps rendering the paginated `rules`.
  const {
    data: deepLinkReviewResponse,
    isFetching: isFetchingDeepLinkRule,
    isFetched: isFetchedDeepLinkRule,
  } = usePrebuiltRulesInstallReview(
    {
      page: 1,
      perPage: 1,
      ruleIds: ruleIdFromUrl ? [ruleIdFromUrl] : undefined,
    },
    {
      // Only run when deep-linked and the target isn't already on the current page.
      enabled: Boolean(ruleIdFromUrl) && !rules.some((r) => r.rule_id === ruleIdFromUrl),
    }
  );
  const deepLinkInstallableRule = deepLinkReviewResponse?.rules?.[0];

  // If the deep-link target isn't in the installable catalog (most commonly because it was
  // already installed), fall back to fetching the installed alerting rule by `rule_id` so
  // the preview flyout can still open — just with disabled install actions.
  const shouldLookupInstalledFallback =
    Boolean(ruleIdFromUrl) &&
    isFetchedDeepLinkRule &&
    !isFetchingDeepLinkRule &&
    !deepLinkInstallableRule &&
    !rules.some((r) => r.rule_id === ruleIdFromUrl);
  const {
    rule: installedFallbackRule,
    isFetching: isFetchingInstalledFallback,
    isFetched: isFetchedInstalledFallback,
  } = useFindInstalledPrebuiltRuleByRuleId(ruleIdFromUrl, {
    enabled: shouldLookupInstalledFallback,
  });

  // Rules array passed to the preview flyout: the installable rules from the current page
  // plus the optional deep-link target — either an installable rule fetched by id, or an
  // already-installed fallback. The table itself still renders only `rules`.
  const flyoutRules = useMemo(() => {
    const deepLinkRule = deepLinkInstallableRule ?? installedFallbackRule;
    if (deepLinkRule && !rules.some((r) => r.rule_id === deepLinkRule.rule_id)) {
      return [...rules, deepLinkRule];
    }
    return rules;
  }, [rules, deepLinkInstallableRule, installedFallbackRule]);

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
      const isPreviewRuleAlreadyInstalled = installedFallbackRule?.rule_id === rule.rule_id;
      const isPreviewRuleLoading = loadingRules.includes(rule.rule_id);
      const canPreviewedRuleBeInstalled =
        canEditRules &&
        !isPreviewRuleAlreadyInstalled &&
        !(isPreviewRuleLoading || isRefetching || isInitializingPrebuiltRulesPackage);

      const installWithoutEnablingButton = (
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
      );
      const installAndEnableButton = (
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
      );

      return (
        <EuiFlexGroup>
          <EuiFlexItem>
            {isPreviewRuleAlreadyInstalled ? (
              <EuiToolTip content={i18n.RULE_ALREADY_INSTALLED_TOOLTIP}>
                {installWithoutEnablingButton}
              </EuiToolTip>
            ) : (
              installWithoutEnablingButton
            )}
          </EuiFlexItem>
          <EuiFlexItem>
            {isPreviewRuleAlreadyInstalled ? (
              <EuiToolTip content={i18n.RULE_ALREADY_INSTALLED_TOOLTIP}>
                {installAndEnableButton}
              </EuiToolTip>
            ) : (
              installAndEnableButton
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    },
    [
      installedFallbackRule,
      loadingRules,
      canEditRules,
      isRefetching,
      isInitializingPrebuiltRulesPackage,
      installOneRule,
    ]
  );

  // On close, drop the :ruleId path segment so the URL reflects "flyout
  // closed" — a subsequent click on the same chat link then re-navigates to
  // the same URL, which re-fires the auto-open effect with a fresh ref state.
  const closeRulePreviewAction = useCallback(() => {
    if (ruleIdFromUrl) {
      history.replace(RULES_ADD_PATH);
    }
  }, [history, ruleIdFromUrl]);

  const { rulePreviewFlyout, openRulePreview } = useRulePreviewFlyout({
    rules: flyoutRules,
    ruleActionsFactory,
    closeRulePreviewAction,
    flyoutProps: {
      id: PREBUILT_RULE_INSTALL_FLYOUT_ANCHOR,
      dataTestSubj: PREBUILT_RULE_INSTALL_FLYOUT_ANCHOR,
    },
  });

  // Auto-open the preview flyout when a rule_id is present in the URL path
  // (e.g. /rules/add_rules/<rule_id>). Wait for both queries to settle on
  // fresh data — otherwise a stale install-review cache could surface a rule
  // that was installed in this session, and we'd open the install flyout for
  // an already-installed rule with active install buttons.
  const autoOpenedRuleIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!ruleIdFromUrl) {
      autoOpenedRuleIdRef.current = null;
      return;
    }
    if (autoOpenedRuleIdRef.current === ruleIdFromUrl) return;
    if (!isFetched || isFetching) return;
    // When the target isn't on the current page, wait for the by-rule_id deep-link lookup
    // (and, if it found nothing, the installed-rule fallback) to settle before deciding.
    if (
      !rules.some((r) => r.rule_id === ruleIdFromUrl) &&
      (!isFetchedDeepLinkRule || isFetchingDeepLinkRule)
    ) {
      return;
    }
    if (
      shouldLookupInstalledFallback &&
      (!isFetchedInstalledFallback || isFetchingInstalledFallback)
    ) {
      return;
    }
    const found = flyoutRules.find((r) => r.rule_id === ruleIdFromUrl);
    if (!found) return;
    autoOpenedRuleIdRef.current = ruleIdFromUrl;
    openRulePreview(ruleIdFromUrl);
  }, [
    ruleIdFromUrl,
    isFetched,
    isFetching,
    rules,
    isFetchedDeepLinkRule,
    isFetchingDeepLinkRule,
    shouldLookupInstalledFallback,
    isFetchedInstalledFallback,
    isFetchingInstalledFallback,
    flyoutRules,
    openRulePreview,
  ]);

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
        isInitializingPrebuiltRulesPackage,
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
    isInitializingPrebuiltRulesPackage,
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
