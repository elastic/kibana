/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse } from '../../../../../../common/api/detection_engine';
import type { BulkActionError } from '../../../rule_management/api/rules/bulk_actions/bulk_actions_response';
import { createBulkActionError } from '../../../rule_management/utils/utils';

export const getConcurrencyErrors = (
  revision: number,
  version: number,
  rule: RuleResponse
): BulkActionError | undefined => {
  if (rule.version !== version) {
    return createBulkActionError({
      id: rule.id,
      message: `Version mismatch for rule with id: ${rule.id}. Expected ${version}, got ${rule.version}`,
      statusCode: 409,
    });
  }

  if (rule.revision !== revision) {
    return createBulkActionError({
      id: rule.id,
      message: `Revision mismatch for rule with id: ${rule.id}. Expected ${revision}, got ${rule.revision}`,
      statusCode: 409,
    });
  }
};
