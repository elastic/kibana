/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Keep a budget when it is unscoped or tied to this app. */
export const budgetMatchesApp = (
  item: { filter: string; name: string; groupings: Record<string, string | number> },
  serviceName?: string
): boolean => {
  if (!serviceName) {
    return true;
  }
  if (item.filter.includes(serviceName) || item.name.includes(serviceName)) {
    return true;
  }
  if (Object.values(item.groupings).some((value) => String(value) === serviceName)) {
    return true;
  }
  return !/service\.name/i.test(item.filter);
};

/** Keep an alert when it is unscoped or tagged for this app. */
export const alertMatchesApp = (rule: { serviceName?: string }, serviceName?: string): boolean => {
  if (!serviceName || !rule.serviceName) {
    return true;
  }
  return rule.serviceName === serviceName;
};
