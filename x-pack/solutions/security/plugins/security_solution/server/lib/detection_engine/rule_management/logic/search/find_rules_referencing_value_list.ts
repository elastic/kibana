/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { ValueListReferencingRule, ValueListReferencingRules } from '@kbn/lists-plugin/server';

import { findRules } from './find_rules';

const INDICATOR_MATCH_RULE_TYPE_ID = 'siem.indicatorRule';

interface IndicatorMatchParamsView {
  threatIndex?: string[];
  threatQuery?: string;
}

const escapeKql = (value: string): string => value.replace(/["\\]/g, '\\$&');

/**
 * Whether each rule's API key can read `index`, through the alerting method that
 * authenticates the stored key. A rule with no key (disabled) or a failed check is left
 * undefined, so the caller can tell "cannot read" from "unknown".
 */
const checkApiKeyRead = async (
  rulesClient: RulesClient,
  rules: ValueListReferencingRule[],
  index: string
): Promise<ValueListReferencingRule[]> =>
  Promise.all(
    rules.map(async (rule) => {
      try {
        const result = await rulesClient.getRuleApiKeyIndexPrivileges({
          id: rule.id,
          index: { [index]: ['read'] },
        });
        return {
          ...rule,
          apiKeyOwner: result.apiKeyOwner,
          canRead: result.hasApiKey ? result.index?.[index]?.read : undefined,
        };
      } catch {
        return rule;
      }
    })
  );

/**
 * Best effort scan, through the detection rule search, for rules that reference a
 * value list. This is the implementation of the value list rule scanner the security
 * solution registers with the lists plugin. Never throws: on any error it returns
 * `unverified`, so it can never fail the action it advises on.
 * - Rules whose exceptions list contains one of `exceptionListIds` reference the list
 *   through an exception item.
 * - Indicator match rules whose threat index is one of `accessNames` reference the list
 *   directly as a threat index.
 * - Indicator match rules whose threat index is `itemsIndex` and whose threat query
 *   names the `listId` reference it through the shared stream (a frozen copy after
 *   migration). The same without the `listId` is only `maybe`.
 * With `verifyReadOn`, each referencing rule's API key is checked for read on that index.
 */
export const findRulesReferencingValueList = async ({
  accessNames,
  exceptionListIds,
  itemsIndex,
  listId,
  rulesClient,
  verifyReadOn,
}: {
  accessNames: string[];
  exceptionListIds: string[];
  itemsIndex: string;
  listId: string;
  rulesClient: RulesClient;
  verifyReadOn?: string;
}): Promise<ValueListReferencingRules> => {
  try {
    const referenced = new Map<string, ValueListReferencingRule>();
    const maybe = new Map<string, ValueListReferencingRule>();

    if (exceptionListIds.length > 0) {
      const clauses = exceptionListIds.map((id) => `"${escapeKql(id)}"`).join(' OR ');
      const { data } = await findRules({
        fields: undefined,
        filter: `alert.attributes.params.exceptionsList.list_id: (${clauses})`,
        page: 1,
        perPage: 1000,
        rulesClient,
        sortField: undefined,
        sortOrder: undefined,
      });
      for (const rule of data) {
        referenced.set(rule.id, { id: rule.id, name: rule.name, reason: 'exception' });
      }
    }

    // indicator match rules are few, so fetch them by type and filter their params in
    // memory. Only indicator match rules have a threat index, so this is exhaustive.
    const { data: indicatorMatchRules } = await findRules({
      fields: undefined,
      filter: `alert.attributes.alertTypeId: "${INDICATOR_MATCH_RULE_TYPE_ID}"`,
      page: 1,
      perPage: 1000,
      rulesClient,
      sortField: undefined,
      sortOrder: undefined,
    });
    for (const rule of indicatorMatchRules) {
      const params = rule.params as IndicatorMatchParamsView;
      const threatIndex = params.threatIndex ?? [];
      const entry: ValueListReferencingRule = {
        id: rule.id,
        name: rule.name,
        reason: 'threat_index',
      };
      if (threatIndex.some((name) => accessNames.includes(name))) {
        referenced.set(rule.id, entry);
      } else if (threatIndex.includes(itemsIndex)) {
        if (String(params.threatQuery ?? '').includes(listId)) {
          referenced.set(rule.id, entry);
        } else if (!referenced.has(rule.id)) {
          maybe.set(rule.id, entry);
        }
      }
    }

    if (referenced.size > 0) {
      const found = [...referenced.values()];
      const rules =
        verifyReadOn != null ? await checkApiKeyRead(rulesClient, found, verifyReadOn) : found;
      return { level: 'referenced', ruleIds: rules.map((rule) => rule.id), rules };
    }
    if (maybe.size > 0) {
      const rules = [...maybe.values()];
      return { level: 'maybe', ruleIds: rules.map((rule) => rule.id), rules };
    }
    return { level: 'none' };
  } catch {
    return { level: 'unverified' };
  }
};
