/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euid } from '@kbn/entity-store/common';

import { getIndexPattern } from './constants';

/**
 * Strips CASE branches that reference *.entity.* fields from an euid EVAL expression.
 * Raw log indices (e.g. logs-endpoint.events.security-*) don't have entity.id fields;
 * ES|QL fails with a verification_exception on unknown columns.
 */
function skipEntityIdFieldsInEval(evalStr: string): string {
  const caseStart = evalStr.indexOf('CASE(');
  if (caseStart === -1) return evalStr;

  const caseContentStart = caseStart + 5;
  const nullEnd = evalStr.lastIndexOf(', NULL)');
  if (nullEnd === -1) return evalStr;

  const prefix = evalStr.substring(0, caseContentStart);
  const suffix = evalStr.substring(nullEnd);
  const caseContent = evalStr.substring(caseContentStart, nullEnd);

  const branches = caseContent.split(',\n');
  const filtered = branches.filter((b) => !b.includes('.entity.'));

  return prefix + filtered.join(',\n') + suffix;
}

/**
 * Strips OR clauses that reference *.entity.* fields from an euid filter expression.
 */
function skipEntityIdFieldsInFilter(filterStr: string): string {
  return filterStr
    .split(' OR ')
    .filter((part) => !part.includes('.entity.'))
    .join(' OR ');
}

function getEuidFragments(skipEntityFields: boolean) {
  const skipEntity = skipEntityFields
    ? { eval: skipEntityIdFieldsInEval, filter: skipEntityIdFieldsInFilter }
    : { eval: (s: string) => s, filter: (s: string) => s };

  return {
    userIdEval: skipEntity.eval(euid.getEuidEsqlEvaluation('user', { withTypeId: false })),
    userIdFilter: skipEntity.filter(euid.getEuidEsqlDocumentsContainsIdFilter('user')),
    hostIdFilter: skipEntity.filter(euid.getEuidEsqlDocumentsContainsIdFilter('host')),
    hostIdEval: skipEntity.eval(euid.getEuidEsqlEvaluation('host', { withTypeId: false })),
  };
}

export function buildEsqlQuery(namespace: string, skipEntityFields: boolean = false): string {
  const { userIdEval, userIdFilter, hostIdFilter, hostIdEval } = getEuidFragments(skipEntityFields);

  return `FROM ${getIndexPattern(namespace)}
| WHERE event.action == "log_on"
    AND process.Ext.session_info.logon_type IN ("RemoteInteractive", "Interactive", "Network")
    AND event.outcome == "success"
    AND (${userIdFilter})
    AND (${hostIdFilter})
| EVAL actorUserId = ${userIdEval}
| WHERE actorUserId IS NOT NULL AND actorUserId != ""
| EVAL targetEntityId = COALESCE(${hostIdEval}, TO_STRING(host.ip), TO_STRING(host.mac))
| MV_EXPAND targetEntityId
| WHERE targetEntityId IS NOT NULL AND targetEntityId != ""
| STATS access_count = COUNT(*) BY actorUserId, targetEntityId
| EVAL access_type = CASE(
    access_count > 4, "accesses_frequently",
    "accesses_infrequently"
  )
| STATS targets = VALUES(targetEntityId) BY access_type, actorUserId
| STATS
    accesses_frequently   = VALUES(targets) WHERE access_type == "accesses_frequently",
    accesses_infrequently = VALUES(targets) WHERE access_type == "accesses_infrequently"
  BY actorUserId`;
}
