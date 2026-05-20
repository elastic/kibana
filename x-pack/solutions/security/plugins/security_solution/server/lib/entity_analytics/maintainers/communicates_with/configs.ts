/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RelationshipIntegrationConfig } from '../engine/types';
import { COMPOSITE_PAGE_SIZE } from '../engine/constants';

const OKTA_USER_ADMIN_EVENT_ACTIONS = [
  'user.lifecycle.create',
  'user.lifecycle.activate',
  'user.lifecycle.deactivate',
  'user.lifecycle.suspend',
  'user.lifecycle.unsuspend',
  'group.user_membership.add',
  'group.user_membership.remove',
  'application.user_membership.add',
  'application.user_membership.remove',
  'application.user_membership.change_username',
];

const HUMAN_IAM_IDENTITY_TYPES = [
  'IAMUser',
  'AssumedRole',
  'Root',
  'FederatedUser',
  'IdentityCenterUser',
];

const AZURE_AUDITLOGS_ACTOR_UPN_FIELD =
  'azure.auditlogs.properties.initiated_by.user.userPrincipalName';

const AZURE_AUDITLOGS_TARGET_UPN_FIELD =
  'azure.auditlogs.properties.target_resources.0.user_principal_name';

const AZURE_AUDITLOGS_TARGET_TYPE_FIELD = 'azure.auditlogs.properties.target_resources.0.type';

const AZURE_AUDITLOGS_TARGET_DISPLAY_NAME_FIELD =
  'azure.auditlogs.properties.target_resources.0.display_name';

// Azure override body — the engine prepends `ESQL_ENGINE_PREAMBLE` (i.e.
// `SET unmapped_fields="nullify";`) when running the query, so override
// functions MUST NOT include it themselves (it would be redundant and
// could mislead future readers about which value is in effect).
function buildAzureEsqlQuery(namespace: string): string {
  const tType = `\`${AZURE_AUDITLOGS_TARGET_TYPE_FIELD}\``;
  const tUpn = `\`${AZURE_AUDITLOGS_TARGET_UPN_FIELD}\``;
  const tDisplayName = `\`${AZURE_AUDITLOGS_TARGET_DISPLAY_NAME_FIELD}\``;

  return `FROM logs-azure.auditlogs-${namespace}
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

export const COMMUNICATES_WITH_INTEGRATION_RELATIONSHIP_CONFIGS: RelationshipIntegrationConfig[] = [
  {
    kind: 'standard',
    id: 'okta',
    name: 'Okta',
    indexPattern: (ns) => `logs-okta.system-${ns}`,
    relationshipKey: 'communicates_with',
    targetEntityType: 'user',
    esqlWhereClause: `event.action IN (${OKTA_USER_ADMIN_EVENT_ACTIONS.map((a) => `"${a}"`).join(
      ', '
    )})
    AND user.target.email IS NOT NULL`,
    targetEvalOverride: `CONCAT("user:", user.target.email, "@okta")`,
    additionalTargetFilter: `AND targetEntityId != "user:@okta"`,
  },
  {
    kind: 'standard',
    id: 'jamf_pro',
    name: 'Jamf Pro',
    indexPattern: (ns) => `logs-jamf_pro.events-${ns}`,
    relationshipKey: 'communicates_with',
    targetEntityType: 'host',
    requireTargetEntityIdExists: true,
    esqlWhereClause: `user.name IS NOT NULL`,
  },
  {
    kind: 'standard',
    id: 'aws_cloudtrail',
    name: 'AWS CloudTrail',
    indexPattern: (ns) => `logs-aws.cloudtrail-${ns}`,
    relationshipKey: 'communicates_with',
    targetEntityType: 'host',
    // Narrow exists-filter, NOT `requireTargetEntityIdExists: true`:
    // targetEvalOverride uses `host.target.entity.id` specifically, which is
    // narrower than the any-host-EUID-source gate the boolean flag enables.
    compositeAggAdditionalFilters: [{ exists: { field: 'host.target.entity.id' } }],
    esqlWhereClause: `aws.cloudtrail.user_identity.type IN (${HUMAN_IAM_IDENTITY_TYPES.map(
      (t) => `"${t}"`
    ).join(', ')})
    AND host.target.entity.id IS NOT NULL`,
    targetEvalOverride: `CONCAT("host:", host.target.entity.id)`,
  },
  {
    kind: 'override',
    id: 'azure_auditlogs',
    name: 'Azure Audit Logs',
    indexPattern: (ns) => `logs-azure.auditlogs-${ns}`,
    relationshipKey: 'communicates_with',
    targetEntityType: 'user',
    customActor: { fields: [AZURE_AUDITLOGS_ACTOR_UPN_FIELD] },
    esqlQueryOverride: buildAzureEsqlQuery,
  },
];
