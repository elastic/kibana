/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euid } from '@kbn/entity-store/common';

import { INDEX_PATTERN } from './constants';

export function buildEsqlQuery(): string {
  const userIdEval = euid.getEuidEsqlEvaluation('user', { withTypeId: true });
  const userIdFilter = euid.getEuidEsqlDocumentsContainsIdFilter('user');
  const hostIdEval = euid.getEuidEsqlEvaluation('host', { withTypeId: false });

  return `FROM ${INDEX_PATTERN}
| WHERE event.code == "4624"
    AND event.provider == "Microsoft-Windows-Security-Auditing"
    AND event.category == "authentication"
    AND event.action == "logged-in"
    AND event.outcome == "success"
    AND winlog.logon.type IN ("Interactive", "Network", "Unlock", "RemoteInteractive", "CachedInteractive")
    AND user.name IS NOT NULL
    AND user.name NOT LIKE "*$"
    AND NOT user.name IN ("SYSTEM", "LOCAL SERVICE", "NETWORK SERVICE")
    AND user.name NOT LIKE "UMFD-*"
    AND user.name NOT LIKE "DWM-*"
    AND (winlog.event_data.VirtualAccount != "Yes" OR winlog.event_data.VirtualAccount IS NULL)
    AND (${userIdFilter})
| EVAL actorUserId = ${userIdEval}
| WHERE actorUserId IS NOT NULL AND actorUserId != ""
| EVAL targetEntityId = COALESCE(${hostIdEval}, TO_STRING(host.ip), TO_STRING(host.mac))
| WHERE targetEntityId IS NOT NULL AND targetEntityId != ""
| MV_EXPAND targetEntityId
| STATS access_count = COUNT(*) BY actorUserId, targetEntityId
| EVAL access_type = CASE(
    access_count > 4, "Accesses_frequently",
    "Accesses_infrequently"
  )
| STATS targets = VALUES(targetEntityId) BY access_type, actorUserId
| STATS
    Accesses_frequently   = VALUES(targets) WHERE access_type == "Accesses_frequently",
    Accesses_infrequently = VALUES(targets) WHERE access_type == "Accesses_infrequently"
  BY actorUserId`;
}
