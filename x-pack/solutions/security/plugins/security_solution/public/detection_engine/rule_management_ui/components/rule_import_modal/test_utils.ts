/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ImportRulesResponse } from '../../../../../common/api/detection_engine';

export function mockImportResponse(
  overrides: Partial<ImportRulesResponse> = {}
): ImportRulesResponse {
  return {
    success: true,
    success_count: 1,
    rules_count: 1,
    errors: [],
    exceptions_success: true,
    exceptions_success_count: 0,
    exceptions_errors: [],
    action_connectors_success: true,
    action_connectors_success_count: 0,
    action_connectors_errors: [],
    action_connectors_warnings: [],
    ...overrides,
  };
}
