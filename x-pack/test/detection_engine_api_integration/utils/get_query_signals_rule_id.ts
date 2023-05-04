/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_RULE_RULE_ID } from '@kbn/rule-data-utils';

/**
 * Given an array of ruleIds for a test this will get the signals
 * created from that rule_id.
 * @param ruleIds The rule_id to search for signals
 */
export const getQuerySignalsRuleId = (ruleIds: string[]) => ({
  query: {
    terms: {
      [ALERT_RULE_RULE_ID]: ruleIds,
    },
  },
});
