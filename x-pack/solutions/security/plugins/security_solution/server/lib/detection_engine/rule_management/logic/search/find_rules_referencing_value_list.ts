/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { ValueListMigrationReferencingRules } from '@kbn/lists-plugin/server';

import { findRules } from './find_rules';

const INDICATOR_MATCH_RULE_TYPE_ID = 'siem.indicatorRule';

interface IndicatorMatchParamsView {
  threatIndex?: string[];
  threatQuery?: string;
}

/**
 * Best effort scan, through the detection rule search (not the generic alerting
 * client and not raw saved-object indices), for indicator match rules that use a
 * value list as a threat index. This is the implementation of the value list
 * migration rule scanner the security solution registers with the lists plugin.
 * Never throws: on any error it returns `unverified`, so it can never fail the
 * migration it advises on.
 * - `referenced`: indicator match rules that read `itemsIndex` and whose threat query
 *   names the `list_id`. These read a frozen copy of the list until repointed.
 * - `maybe`: indicator match rules that read `itemsIndex` with no `list_id` match.
 * - `unverified`: the scan errored. `none`: nothing found.
 */
export const findRulesReferencingValueList = async ({
  itemsIndex,
  listId,
  rulesClient,
}: {
  itemsIndex: string;
  listId: string;
  rulesClient: RulesClient;
}): Promise<ValueListMigrationReferencingRules> => {
  try {
    // indicator match rules are few, so fetch them by type and filter their params in
    // memory. Only indicator match rules have a threat index, so this is exhaustive.
    const { data } = await findRules({
      fields: undefined,
      filter: `alert.attributes.alertTypeId: "${INDICATOR_MATCH_RULE_TYPE_ID}"`,
      page: 1,
      perPage: 1000,
      rulesClient,
      sortField: undefined,
      sortOrder: undefined,
    });

    const readingItems = data.filter((rule) => {
      const params = rule.params as IndicatorMatchParamsView;
      return (params.threatIndex ?? []).includes(itemsIndex);
    });

    const referencing = readingItems.filter((rule) =>
      String((rule.params as IndicatorMatchParamsView).threatQuery ?? '').includes(listId)
    );

    if (referencing.length > 0) {
      return { level: 'referenced', ruleIds: referencing.map((rule) => rule.id) };
    }
    if (readingItems.length > 0) {
      return { level: 'maybe', ruleIds: readingItems.map((rule) => rule.id) };
    }
    return { level: 'none' };
  } catch {
    return { level: 'unverified' };
  }
};
