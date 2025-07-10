/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ShardFailure } from '@elastic/elasticsearch/lib/api/types';
import type { IRuleExecutionLogForExecutors } from '../../rule_monitoring';
import type { SearchAfterAndBulkCreateReturnType } from '../types';
import * as i18n from '../translations';

export const logShardFailures = (
  isSequenceQuery: boolean,
  shardFailures: ShardFailure[],
  result: SearchAfterAndBulkCreateReturnType,
  ruleExecutionLogger: IRuleExecutionLogForExecutors
) => {
  const shardFailureMessage = i18n.EQL_SHARD_FAILURE_MESSAGE(
    isSequenceQuery,
    JSON.stringify(shardFailures)
  );
  ruleExecutionLogger.error(shardFailureMessage);
  if (isSequenceQuery) {
    result.errors.push(shardFailureMessage);
  } else {
    result.warningMessages.push(shardFailureMessage);
  }
};
