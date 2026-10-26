/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EsqlEsqlShardFailure } from '@elastic/elasticsearch/lib/api/types';
import type { EsqlTable } from '../esql/esql_request';
import * as i18n from '../translations';
import type { SearchAfterAndBulkCreateReturnType } from '../types';

export const logClusterShardFailuresEsql = ({
  response,
  result,
}: {
  response: EsqlTable;
  result: SearchAfterAndBulkCreateReturnType;
}) => {
  const clusters = response?._clusters?.details ?? {};
  const shardFailures = Object.keys(clusters).reduce<EsqlEsqlShardFailure[]>((acc, cluster) => {
    const failures = clusters[cluster]?.failures ?? [];

    if (failures.length > 0) {
      acc.push(...failures);
    }

    return acc;
  }, []);

  if (shardFailures.length > 0) {
    result.warningMessages.push(i18n.ESQL_SHARD_FAILURE_MESSAGE(JSON.stringify(shardFailures)));
  }
};
