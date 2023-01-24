/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_RULE_UUID } from '@kbn/rule-data-utils';

/**
 * Given an array of ids for a test this will get the signals
 * created from that rule's regular id.
 * @param ids The rule_id to search for signals
 */
export const getQuerySignalsId = (ids: string[], size = 10) => ({
  size,
  query: {
    terms: {
      [ALERT_RULE_UUID]: ids,
    },
  },
});
