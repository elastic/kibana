/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  createCase,
  attachAlertsToCase,
  fetchOpenSecurityCases,
  detachAlertsFromCase,
  addCommentToCase,
  type CasesClientLike,
} from './case_operations';
