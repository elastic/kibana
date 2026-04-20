/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euid } from '@kbn/entity-store/common/euid_helpers';

import { COMPOSITE_PAGE_SIZE } from '../../constants';
import { getIndexPattern } from './constants';

export function buildEsqlQuery(namespace: string): string {
  const userFieldEvals = euid.esql.getFieldEvaluations('user');
  const userFieldEvalsLine = userFieldEvals ? `| EVAL ${userFieldEvals}\n` : '';
  const userIdFilter = euid.esql.getEuidDocumentsContainsIdFilter('user');
  const userEuidEval = euid.esql.getEuidEvaluation('user', { withTypeId: true });
  const hostIdFilter = euid.esql.getEuidDocumentsContainsIdFilter('host');
  const hostEuidEval = euid.esql.getEuidEvaluation('host', { withTypeId: true });

  return `SET unmapped_fields="nullify";
FROM ${getIndexPattern(namespace)}
| WHERE (${userIdFilter})
    AND (${hostIdFilter})
${userFieldEvalsLine}| EVAL actorUserId = ${userEuidEval}
| WHERE actorUserId IS NOT NULL AND actorUserId != ""
| EVAL targetEntityId = ${hostEuidEval}
| MV_EXPAND targetEntityId
| WHERE targetEntityId IS NOT NULL AND targetEntityId != "host:"
| STATS communicates_with = VALUES(targetEntityId) BY actorUserId
| LIMIT ${COMPOSITE_PAGE_SIZE}`;
}
