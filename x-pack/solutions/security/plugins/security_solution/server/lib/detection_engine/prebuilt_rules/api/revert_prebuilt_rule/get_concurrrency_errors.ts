/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse } from '../../../../../../common/api/detection_engine';
import type { BulkActionError } from '../../../rule_management/api/rules/bulk_actions/bulk_actions_response';

export const getConcurrencyErrors = (
  revision: number,
  version: number,
  rule: RuleResponse
): BulkActionError | undefined => {
  if (rule.version !== version) {
    return {
      message: `Version mismatch for id ${rule.id}: expected ${version}, got ${rule.version}`,
      status: 409,
      rule,
    };
  }

  if (rule.revision !== revision) {
    return {
      message: `Revision mismatch for id ${rule.id}: expected ${revision}, got ${rule.revision}`,
      status: 409,
      rule,
    };
  }
};
