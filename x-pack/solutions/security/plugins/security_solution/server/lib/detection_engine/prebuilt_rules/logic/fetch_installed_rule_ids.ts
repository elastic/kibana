/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';
import type { IPrebuiltRuleObjectsClient } from './rule_objects/prebuilt_rule_objects_client';

// Keeps the filter of each lookup well within the number of clauses Elasticsearch allows.
const LOOKUP_SIZE = 250;

/**
 * The rule ids, of the given ones, that are installed as prebuilt rules in this space. They are looked up a few
 * hundred at a time, so there is no limit on how many installed rules there can be.
 */
export const fetchInstalledRuleIds = async (
  ruleObjectsClient: Pick<IPrebuiltRuleObjectsClient, 'fetchInstalledRuleVersionsByIds'>,
  ruleIds: readonly string[]
): Promise<Set<string>> => {
  const installedRuleIds = new Set<string>();

  for (const ids of chunk(ruleIds, LOOKUP_SIZE)) {
    const installed = await ruleObjectsClient.fetchInstalledRuleVersionsByIds({ ruleIds: ids });
    installed.forEach(({ rule_id: ruleId }) => installedRuleIds.add(ruleId));
  }

  return installedRuleIds;
};
