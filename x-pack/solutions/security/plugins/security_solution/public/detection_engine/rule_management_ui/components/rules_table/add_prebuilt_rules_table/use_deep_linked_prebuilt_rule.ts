/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse } from '../../../../../../common/api/detection_engine/model/rule_schema';
import { usePrebuiltRulesInstallReview } from '../../../../rule_management/logic/prebuilt_rules/use_prebuilt_rules_install_review';
import { useFindInstalledPrebuiltRuleByRuleId } from '../../../../rule_management/logic/use_find_installed_prebuilt_rule_by_rule_id';

export interface UseDeepLinkedPrebuiltRuleParams {
  /** The `rule_id` to resolve, taken from the `/rules/add_rules/:ruleId` deep link. */
  ruleId: string | undefined;
  /** Installable rules already loaded on the current table page — used to skip fetching when
   *  the target is already in hand. */
  currentPageRules: RuleResponse[];
}

export interface UseDeepLinkedPrebuiltRuleResult {
  /**
   * The deep-link target rule to surface in the preview flyout: the installable rule fetched by
   * `rule_id`, or an already-installed fallback. `undefined` when nothing needs resolving — no
   * `ruleId`, the rule is already on the current page, or it was not found anywhere.
   */
  rule: RuleResponse | undefined;
  /** `true` when `rule` resolved from the installed-rules fallback, i.e. it is already installed
   *  and install actions should be disabled. */
  isAlreadyInstalled: boolean;
  /** `true` once every applicable lookup has settled on fresh data, so a consumer can decide
   *  whether to open the flyout without acting on a stale cache. */
  isResolved: boolean;
}

/**
 * Resolves a single prebuilt rule by `rule_id` for the Add Elastic Rules deep link
 * (`/rules/add_rules/:ruleId`), so the preview flyout has data regardless of which catalog page
 * is showing.
 *
 * Resolution is tiered:
 * 1. If the rule is already on the current table page, do nothing (the caller already has it).
 * 2. Otherwise fetch it by `rule_id` from the installable catalog.
 * 3. If it isn't installable (most commonly because it was already installed), fall back to the
 *    installed alerting rule so the flyout can still open — with install actions disabled.
 */
export const useDeepLinkedPrebuiltRule = ({
  ruleId,
  currentPageRules,
}: UseDeepLinkedPrebuiltRuleParams): UseDeepLinkedPrebuiltRuleResult => {
  const isOnCurrentPage =
    ruleId != null && currentPageRules.some((rule) => rule.rule_id === ruleId);

  // Step 2: fetch the rule by `rule_id` from the installable catalog. The target may not fall on
  // the current page, so this is scoped to a single rule and kept separate from the table query.
  const {
    data: deepLinkReviewResponse,
    isFetching: isFetchingInstallable,
    isFetched: isFetchedInstallable,
  } = usePrebuiltRulesInstallReview(
    {
      page: 1,
      perPage: 1,
      ruleIds: ruleId ? [ruleId] : undefined,
    },
    {
      enabled: Boolean(ruleId) && !isOnCurrentPage,
    }
  );
  const installableRule = deepLinkReviewResponse?.rules?.[0];

  // Step 3: fall back to the installed alerting rule when the catalog lookup settled empty.
  const shouldLookupInstalledFallback =
    Boolean(ruleId) &&
    !isOnCurrentPage &&
    isFetchedInstallable &&
    !isFetchingInstallable &&
    !installableRule;
  const {
    rule: installedFallbackRule,
    isFetching: isFetchingInstalled,
    isFetched: isFetchedInstalled,
  } = useFindInstalledPrebuiltRuleByRuleId(ruleId, {
    enabled: shouldLookupInstalledFallback,
  });

  const installableSettled = isFetchedInstallable && !isFetchingInstallable;
  const fallbackSettled = isFetchedInstalled && !isFetchingInstalled;

  // Resolved when there is nothing to fetch (no `ruleId` or already on the page), or the catalog
  // lookup settled and — if it found nothing and a fallback ran — the fallback settled too.
  const isResolved =
    !ruleId ||
    isOnCurrentPage ||
    (installableSettled && (!shouldLookupInstalledFallback || fallbackSettled));

  // `undefined` when the target is already on the current page: the caller has it via
  // `currentPageRules`, and a disabled query keeps its last value, so returning it here would
  // double-add it to the flyout list.
  const rule = isOnCurrentPage ? undefined : installableRule ?? installedFallbackRule;

  return {
    rule,
    isAlreadyInstalled: rule != null && rule === installedFallbackRule,
    isResolved,
  };
};
