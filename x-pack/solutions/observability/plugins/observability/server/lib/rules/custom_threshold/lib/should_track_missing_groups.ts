/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NoDataBehavior } from '../../../../../common/custom_threshold_rule/types';

export const shouldTrackMissingGroups = (
  noDataBehavior: NoDataBehavior | undefined,
  alertOnGroupDisappear: boolean | undefined
): boolean => {
  if (noDataBehavior === 'remainActive' || noDataBehavior === 'alertOnNoData') {
    return true;
  }
  // Legacy: undefined alertOnGroupDisappear means track missing groups.
  return alertOnGroupDisappear !== false && noDataBehavior !== 'recover';
};
