/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const ALERTS_INDEX_SUFFIX = '.alerts-security.alerts';
export const ALERTS_INDICES_PATTERN = `${ALERTS_INDEX_SUFFIX}*`;
export const getAlertsIndexName = (namespace: string) => `${ALERTS_INDEX_SUFFIX}-${namespace}`;
export const getSecuritySolutionDataViewName = (namespace: string) =>
  `security-solution-${namespace}`;
