/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euid } from '@kbn/entity-store/common/euid_helpers';

import { COMPOSITE_PAGE_SIZE } from '../../constants';
import { getIndexPattern, HUMAN_IAM_IDENTITY_TYPES } from './constants';

export function buildEsqlQuery(namespace: string): string {
  const userFieldEvals = euid.esql.getFieldEvaluations('user');
  const userFieldEvalsLine = userFieldEvals ? `| EVAL ${userFieldEvals}\n` : '';
  const userIdFilter = euid.esql.getEuidDocumentsContainsIdFilter('user');
  const userEuidEval = euid.esql.getEuidEvaluation('user', { withTypeId: true });

  const iamTypesLiteral = HUMAN_IAM_IDENTITY_TYPES.map((t) => `"${t}"`).join(', ');

  // `host.target.entity.id` is populated by the AWS CloudTrail ingest pipeline
  // (elastic/integrations#17827, introduced in aws package v6.4.0). The pipeline
  // classifies CloudTrail target resource ARNs by ID prefix (e.g. "i-" → EC2
  // instances, "eni-" → network interfaces) and writes the raw resource IDs — NOT
  // prefixed with "host:" — to this multi-value field. CONCAT("host:", ...) below
  // constructs the full host EUID expected by the entity store.
  return `SET unmapped_fields="nullify";
FROM ${getIndexPattern(namespace)}
| WHERE aws.cloudtrail.user_identity.type IN (${iamTypesLiteral})
    AND host.target.entity.id IS NOT NULL
    AND (${userIdFilter})
${userFieldEvalsLine}| EVAL actorUserId = ${userEuidEval}
| WHERE actorUserId IS NOT NULL AND actorUserId != ""
| EVAL targetEntityId = CONCAT("host:", host.target.entity.id)
| MV_EXPAND targetEntityId
| WHERE targetEntityId IS NOT NULL AND targetEntityId != "host:"
| STATS communicates_with = VALUES(targetEntityId) BY actorUserId
| LIMIT ${COMPOSITE_PAGE_SIZE}`;
}
