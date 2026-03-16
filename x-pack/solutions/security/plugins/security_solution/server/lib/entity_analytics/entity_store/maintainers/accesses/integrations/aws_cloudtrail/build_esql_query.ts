/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euid } from '@kbn/entity-store/common/euid_helpers';

import { COMPOSITE_PAGE_SIZE } from '../../constants';
import { getIndexPattern } from './constants';

function getEuidFragments() {
  const userFieldEvals = euid.getFieldEvaluationsEsql('user');

  return {
    userFieldEvalsLine: userFieldEvals ? `| EVAL ${userFieldEvals}\n` : '',
    userIdEval: euid.getEuidEsqlEvaluation('user', { withTypeId: false }),
    userIdFilter: euid.getEuidEsqlDocumentsContainsIdFilter('user'),
    hostIdFilter: euid.getEuidEsqlDocumentsContainsIdFilter('host'),
    hostIdEval: euid.getEuidEsqlEvaluation('host', { withTypeId: false }),
  };
}

export function buildEsqlQuery(namespace: string): string {
  const { userFieldEvalsLine, userIdEval, userIdFilter, hostIdFilter, hostIdEval } =
    getEuidFragments();

  return `FROM ${getIndexPattern(namespace)}
| WHERE event.module == "aws"
    AND event.action == "StartSession"
    AND event.outcome == "success"
    AND (${userIdFilter})
    AND (${hostIdFilter})
${userFieldEvalsLine}| EVAL actorUserId = ${userIdEval}
| WHERE actorUserId IS NOT NULL AND actorUserId != ""
| EVAL targetEntityId = COALESCE(${hostIdEval}, TO_STRING(host.ip), TO_STRING(host.mac))
| MV_EXPAND targetEntityId
| WHERE targetEntityId IS NOT NULL AND targetEntityId != ""
| STATS access_count = COUNT(*), _userId = MIN(user.id), _ns = MIN(entity.namespace) BY actorUserId, targetEntityId
| EVAL access_type = CASE(
    access_count > 4, "accesses_frequently",
    "accesses_infrequently"
  )
| STATS targets = VALUES(targetEntityId), _userId = MIN(_userId), _ns = MIN(_ns) BY access_type, actorUserId
| STATS
    accesses_frequently   = VALUES(targets) WHERE access_type == "accesses_frequently",
    accesses_infrequently = VALUES(targets) WHERE access_type == "accesses_infrequently",
    _userId = MIN(_userId),
    _ns = MIN(_ns)
  BY actorUserId
| LIMIT ${COMPOSITE_PAGE_SIZE}`;
}
