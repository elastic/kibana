/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RelationshipIntegrationConfig } from '../engine/types';
import { COMPOSITE_PAGE_SIZE } from '../engine/constants';
import { getIndexPattern as oktaIndexPattern, OKTA_USER_ADMIN_EVENT_ACTIONS } from './integrations/okta/constants';
import { getIndexPattern as jamfProIndexPattern } from './integrations/jamf_pro/constants';
import { getIndexPattern as awsCloudtrailCommunicatesWithIndexPattern, HUMAN_IAM_IDENTITY_TYPES } from './integrations/aws_cloudtrail/constants';
import { getIndexPattern as azureAuditlogsIndexPattern } from './integrations/azure_auditlogs/constants';

const AZURE_AUDITLOGS_ACTOR_UPN_FIELD =
  'azure.auditlogs.properties.initiated_by.user.userPrincipalName';

const AZURE_AUDITLOGS_TARGET_UPN_FIELD =
  'azure.auditlogs.properties.target_resources.0.user_principal_name';

const AZURE_AUDITLOGS_TARGET_TYPE_FIELD = 'azure.auditlogs.properties.target_resources.0.type';

const AZURE_AUDITLOGS_TARGET_DISPLAY_NAME_FIELD =
  'azure.auditlogs.properties.target_resources.0.display_name';

function buildAzureEsqlQuery(namespace: string): string {
  const tType = `\`${AZURE_AUDITLOGS_TARGET_TYPE_FIELD}\``;
  const tUpn = `\`${AZURE_AUDITLOGS_TARGET_UPN_FIELD}\``;
  const tDisplayName = `\`${AZURE_AUDITLOGS_TARGET_DISPLAY_NAME_FIELD}\``;

  return `SET unmapped_fields="nullify";
FROM ${azureAuditlogsIndexPattern(namespace)}
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

export const COMMUNICATES_WITH_ENGINE_CONFIGS: RelationshipIntegrationConfig[] = [
  {
    id: 'okta',
    name: 'Okta',
    indexPattern: oktaIndexPattern,
    relationshipType: 'communicates_with',
    targetEntityType: 'user',
    esqlWhereClause: `event.action IN (${OKTA_USER_ADMIN_EVENT_ACTIONS.map((a) => `"${a}"`).join(
      ', '
    )})
    AND user.target.email IS NOT NULL`,
    targetEvalOverride: `CONCAT("user:", user.target.email, "@okta")`,
    additionalTargetFilter: `AND targetEntityId != "user:@okta"`,
  },
  {
    id: 'jamf_pro',
    name: 'Jamf Pro',
    indexPattern: jamfProIndexPattern,
    relationshipType: 'communicates_with',
    targetEntityType: 'host',
    esqlWhereClause: `user.name IS NOT NULL`,
  },
  {
    id: 'aws_cloudtrail',
    name: 'AWS CloudTrail',
    indexPattern: awsCloudtrailCommunicatesWithIndexPattern,
    relationshipType: 'communicates_with',
    targetEntityType: 'host',
    esqlWhereClause: `aws.cloudtrail.user_identity.type IN (${HUMAN_IAM_IDENTITY_TYPES.map(
      (t) => `"${t}"`
    ).join(', ')})
    AND host.target.entity.id IS NOT NULL`,
    targetEvalOverride: `CONCAT("host:", host.target.entity.id)`,
  },
  {
    id: 'azure_auditlogs',
    name: 'Azure Audit Logs',
    indexPattern: azureAuditlogsIndexPattern,
    relationshipType: 'communicates_with',
    targetEntityType: 'user',
    esqlWhereClause: '',
    actorFields: [AZURE_AUDITLOGS_ACTOR_UPN_FIELD],
    esqlQueryOverride: buildAzureEsqlQuery,
  },
];
