/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeRegExp } from 'lodash';
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
 * Whether a threat index entry names `index`: the exact name, or a wildcard pattern
 * (`.items-*`) that Elasticsearch would resolve to it. An exclusion entry (`-name`) never
 * names anything.
 */
export const threatIndexEntryMatches = (entry: string, index: string): boolean => {
  if (entry.startsWith('-')) return false;
  if (!entry.includes('*')) return entry === index;
  const pattern = new RegExp(`^${entry.split('*').map(escapeRegExp).join('.*')}$`);
  return pattern.test(index);
};

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
 *   through an exception item (`reason: exception`). They are returned but never set
 *   the level, because their access goes through the list's name, not through `.items`.
 * - Indicator match rules whose threat index is one of `accessNames` reference the list
 *   directly as a threat index (`reason: threat_index`, level `referenced`).
 * - Indicator match rules whose threat index is `itemsIndex` and whose threat query
 *   names the `listId` reference it through the shared stream (a frozen copy after
 *   migration; level `referenced`). The same without the `listId` is only `maybe`
 *   (`reason: threat_index_maybe`).
 * With `verifyReadOn`, each definite rule's API key is checked for read on that index.
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
    // Rules that reference the list through an exception item. They never set the
    // level: their only concern is whether their API key can read the list's name.
    const exception = new Map<string, ValueListReferencingRule>();
    // Indicator match rules that read the list as a threat index, directly or through
    // the shared stream. Only these decide the level.
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
        exception.set(rule.id, { id: rule.id, name: rule.name, reason: 'exception' });
      }
    }

    // The list id as a whole token in a threat query: `list_id: "foo"` or `list_id: foo`
    // name `foo`, while `foo-bar` and `foo.1` do not.
    const listIdToken = new RegExp(`(^|[^\\w.-])${escapeRegExp(listId)}(?![\\w.-])`);

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
      // A pattern such as `.items-*` resolves to the shared stream, and after migration
      // to the list's alias as well, so it counts the same as the exact name.
      const names = (index: string): boolean =>
        threatIndex.some((name) => threatIndexEntryMatches(name, index));
      if (accessNames.some(names)) {
        referenced.set(rule.id, entry);
      } else if (names(itemsIndex)) {
        if (listIdToken.test(String(params.threatQuery ?? ''))) {
          referenced.set(rule.id, entry);
        } else {
          maybe.set(rule.id, { ...entry, reason: 'threat_index_maybe' });
        }
      }
    }

    // A rule that references the list both through an exception and as a threat index
    // is returned once per reason, so the caller can count blockers by reason. The key
    // check runs once per rule and its result is attached to each definite entry.
    const definite = [...exception.values(), ...referenced.values()];
    const readByRule = new Map<string, Pick<ValueListReferencingRule, 'apiKeyOwner' | 'canRead'>>();
    if (verifyReadOn != null) {
      const uniqueRules = [...new Map(definite.map((rule) => [rule.id, rule])).values()];
      const checked = await checkApiKeyRead(rulesClient, uniqueRules, verifyReadOn);
      checked.forEach(({ id, apiKeyOwner, canRead }) =>
        readByRule.set(id, { apiKeyOwner, canRead })
      );
    }
    const rules = [
      ...definite.map((rule) => ({ ...rule, ...readByRule.get(rule.id) })),
      ...maybe.values(),
    ];
    const level = referenced.size > 0 ? 'referenced' : maybe.size > 0 ? 'maybe' : 'none';
    if (rules.length === 0) {
      return { level };
    }
    return { level, ruleIds: [...new Set(rules.map((rule) => rule.id))], rules };
  } catch {
    return { level: 'unverified' };
  }
};
