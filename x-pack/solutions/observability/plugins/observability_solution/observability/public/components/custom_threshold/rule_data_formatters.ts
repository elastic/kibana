/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_REASON } from '@kbn/rule-data-utils';
import { ObservabilityRuleTypeFormatter } from '../..';

// Putting undefined value in the link will hide the View In App button as requested in to https://github.com/elastic/kibana/issues/159782
export const LINK_TO_THRESHOLD_EXPLORER = undefined;

export const formatReason: ObservabilityRuleTypeFormatter = ({ fields }) => {
  const reason = fields[ALERT_REASON] ?? '-';
  const link = LINK_TO_THRESHOLD_EXPLORER;

  return {
    reason,
    link,
  };
};
