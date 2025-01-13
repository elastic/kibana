/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregatedPrebuiltRuleError } from '../../../../../common/api/detection_engine/prebuilt_rules';
import { getErrorMessage, getErrorStatusCode } from '../../../../utils/error_helpers';
import type { PromisePoolError } from '../../../../utils/promise_pool';

export function aggregatePrebuiltRuleErrors(
  errors: Array<PromisePoolError<{ rule_id: string; name?: string }>>
) {
  const errorsByMessage: Record<string, AggregatedPrebuiltRuleError> = {};

  errors.forEach(({ error, item }) => {
    const message = getErrorMessage(error);
    const statusCode = getErrorStatusCode(error);
    const failedRule = {
      rule_id: item.rule_id,
      name: item.name,
    };

    if (errorsByMessage[message]) {
      errorsByMessage[message].rules.push(failedRule);
    } else {
      errorsByMessage[message] = {
        message,
        status_code: statusCode,
        rules: [failedRule],
      };
    }
  });

  return Object.values(errorsByMessage);
}
