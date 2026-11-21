/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleSignatureId, RuleVersion } from '../../../../../common/api/detection_engine';
import type { SkippedRuleInstall } from '../../../../../common/api/detection_engine/prebuilt_rules';
import { SkipRuleInstallReason } from '../../../../../common/api/detection_engine/prebuilt_rules';
import type { BasicRuleInfo } from './basic_rule_info';

interface RequestedRule {
  rule_id: RuleSignatureId;
  version: RuleVersion;
  library_id?: string;
}

interface ResolveSpecificRuleInstallsParams {
  rules: readonly RequestedRule[];
  latestVersions: readonly BasicRuleInfo[];
  installedRuleIds: ReadonlySet<string>;
  // Libraries the caller may install from. Leave unset for requests that name no library.
  visibleLibraryIds?: ReadonlySet<string>;
}

interface ResolvedRuleInstalls {
  queue: RequestedRule[];
  skipped: SkippedRuleInstall[];
  errors: Array<{ error: Error; item: RequestedRule }>;
}

/**
 * The rules that an install-all request installs: the latest version of every rule that is not installed yet.
 * A space installs a rule_id from one library only, so a rule_id that several libraries have is taken from
 * the first one.
 */
export const resolveAllRuleInstalls = ({
  latestVersions,
  installedRuleIds,
}: {
  latestVersions: readonly BasicRuleInfo[];
  installedRuleIds: ReadonlySet<string>;
}): BasicRuleInfo[] => {
  const queuedRuleIds = new Set<string>();
  return latestVersions.filter(({ rule_id: ruleId }) => {
    if (installedRuleIds.has(ruleId) || queuedRuleIds.has(ruleId)) {
      return false;
    }
    queuedRuleIds.add(ruleId);
    return true;
  });
};

/**
 * Decides, for each requested rule, whether it can be installed. A rule that names a library is matched
 * against that library only, so the same rule_id in two libraries installs from the one that was asked for.
 */
export const resolveSpecificRuleInstalls = ({
  rules,
  latestVersions,
  installedRuleIds,
  visibleLibraryIds,
}: ResolveSpecificRuleInstallsParams): ResolvedRuleInstalls => {
  const result: ResolvedRuleInstalls = { queue: [], skipped: [], errors: [] };
  const queuedRuleIds = new Set<string>();

  for (const rule of rules) {
    if (installedRuleIds.has(rule.rule_id)) {
      result.skipped.push({
        rule_id: rule.rule_id,
        reason: SkipRuleInstallReason.ALREADY_INSTALLED,
      });
    } else if (queuedRuleIds.has(rule.rule_id)) {
      // A space installs a rule_id from one library only.
      result.errors.push({
        error: new Error(`Rule with ID "${rule.rule_id}" was requested from more than one library`),
        item: rule,
      });
    } else if (rule.library_id && !visibleLibraryIds?.has(rule.library_id)) {
      result.errors.push({
        error: new Error(`Rule library "${rule.library_id}" not found`),
        item: rule,
      });
    } else {
      const inRequestedLibrary = (version: BasicRuleInfo) =>
        !rule.library_id || version.library_id === rule.library_id;
      const candidates = latestVersions.filter(
        (version) => version.rule_id === rule.rule_id && inRequestedLibrary(version)
      );

      if (candidates.length === 0) {
        result.errors.push({
          error: new Error(
            `Rule with ID "${rule.rule_id}" and version "${rule.version}" not found`
          ),
          item: rule,
        });
      } else {
        const match = candidates.find((version) => version.version === rule.version);
        queuedRuleIds.add(rule.rule_id);
        result.queue.push({
          rule_id: rule.rule_id,
          version: rule.version,
          library_id: match?.library_id ?? rule.library_id,
        });
      }
    }
  }

  return result;
};
