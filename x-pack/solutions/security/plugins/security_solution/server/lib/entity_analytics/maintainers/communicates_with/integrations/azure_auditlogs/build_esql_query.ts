/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { COMPOSITE_PAGE_SIZE } from '../../constants';
import {
  getIndexPattern,
  AZURE_AUDITLOGS_ACTOR_UPN_FIELD,
  AZURE_AUDITLOGS_TARGET_UPN_FIELD,
  AZURE_AUDITLOGS_TARGET_TYPE_FIELD,
  AZURE_AUDITLOGS_TARGET_DISPLAY_NAME_FIELD,
} from './constants';

/**
 * Builds an ES|QL query for Azure Audit Logs that produces user→user and user→host
 * communicates_with relationships. The actor is the admin user who initiated the
 * operation; the target is either an Entra ID user or a registered device.
 *
 * EUIDs are constructed manually because the auditlogs pipeline does not map the
 * initiated_by actor to standard ECS user.* fields. The UPN (userPrincipalName) is
 * the email address and matches the entity store's entra_id namespace EUID ranking:
 * user:{email}@entra_id. Device display names match the host entity store's host.name
 * ranking: host:{displayName}.
 */
export function buildEsqlQuery(namespace: string): string {
  // Azure Audit Logs records can list multiple target resources per operation, but
  // only the first target (target_resources.0.*) is mapped by the ingest pipeline.
  // Multi-target operations (e.g. bulk role assignments) will only capture the
  // first target as a communicates_with relationship.
  //
  // ES|QL cannot parse field names containing numeric path components (e.g. .0.)
  // without backtick escaping — plain dot-notation fails with "mismatched input '.0'".
  // The actor UPN field has no numeric component and does not need escaping.
  const tType = `\`${AZURE_AUDITLOGS_TARGET_TYPE_FIELD}\``;
  const tUpn = `\`${AZURE_AUDITLOGS_TARGET_UPN_FIELD}\``;
  const tDisplayName = `\`${AZURE_AUDITLOGS_TARGET_DISPLAY_NAME_FIELD}\``;

  return `SET unmapped_fields="nullify";
FROM ${getIndexPattern(namespace)}
| WHERE ${AZURE_AUDITLOGS_ACTOR_UPN_FIELD} IS NOT NULL
    AND (
      (${tType} == "User" AND ${tUpn} IS NOT NULL)
      OR
      (${tType} == "Device" AND ${tDisplayName} IS NOT NULL)
    )
| EVAL actorUserId = CONCAT("user:", ${AZURE_AUDITLOGS_ACTOR_UPN_FIELD}, "@entra_id")
| EVAL targetEntityId = CASE(
    ${tType} == "User", CONCAT("user:", ${tUpn}, "@entra_id"),
    ${tType} == "Device", CONCAT("host:", ${tDisplayName}),
    NULL
  )
| WHERE actorUserId != "user:@entra_id"
    AND targetEntityId IS NOT NULL AND targetEntityId != "" AND targetEntityId != "host:" AND targetEntityId != "user:@entra_id"
| STATS communicates_with = VALUES(targetEntityId) BY actorUserId
| LIMIT ${COMPOSITE_PAGE_SIZE}`;
}
