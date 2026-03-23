/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSimpleRule } from './get_simple_rule';

/**
 * Given an array of rule_id strings this will return a ndjson buffer which is useful
 * for testing uploads.
 * @param ruleIds Array of strings of rule_ids
 */
export const getSimpleRuleAsNdjson = (ruleIds: string[], enabled = false): Buffer => {
  const stringOfRules = ruleIds.map((ruleId) => {
    const simpleRule = getSimpleRule(ruleId, enabled);
    return JSON.stringify(simpleRule);
  });
  return Buffer.from(stringOfRules.join('\n'));
};
