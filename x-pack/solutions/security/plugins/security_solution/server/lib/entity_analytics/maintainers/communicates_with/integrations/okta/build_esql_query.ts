/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euid } from '@kbn/entity-store/common/euid_helpers';

import { COMPOSITE_PAGE_SIZE } from '../../constants';
import { getIndexPattern, OKTA_AUTH_EVENT_ACTIONS } from './constants';

export function buildEsqlQuery(namespace: string): string {
  const userFieldEvals = euid.esql.getFieldEvaluations('user');
  const userFieldEvalsLine = userFieldEvals ? `| EVAL ${userFieldEvals}\n` : '';
  const userIdEval = euid.esql.getEuidEvaluation('user', { withTypeId: true });
  const userIdFilter = euid.esql.getEuidDocumentsContainsIdFilter('user');

  const actionsLiteral = OKTA_AUTH_EVENT_ACTIONS.map((a) => `"${a}"`).join(', ');

  return `SET unmapped_fields="nullify";
FROM ${getIndexPattern(namespace)}
| WHERE event.action IN (${actionsLiteral})
    AND okta.target.display_name IS NOT NULL
    AND (${userIdFilter})
${userFieldEvalsLine}| EVAL actorUserId = ${userIdEval}
| WHERE actorUserId IS NOT NULL AND actorUserId != ""
| MV_EXPAND okta.target.display_name
| EVAL targetEntityId = CONCAT("service:", okta.target.display_name)
| WHERE targetEntityId IS NOT NULL AND targetEntityId != "service:"
| STATS communicates_with = VALUES(targetEntityId) BY actorUserId
| LIMIT ${COMPOSITE_PAGE_SIZE}`;
}
