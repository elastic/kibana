/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RelationshipIntegrationConfig } from '../engine/types';
import {
  buildCompositeAggQuery as azureBuildCompositeAgg,
  buildBucketUserFilter as azureBuildBucketFilter,
} from './integrations/azure_auditlogs/build_composite_agg';
import { buildEsqlQuery as azureBuildEsqlQuery } from './integrations/azure_auditlogs/build_esql_query';
import { OKTA_USER_ADMIN_EVENT_ACTIONS } from './integrations/okta/constants';
import { HUMAN_IAM_IDENTITY_TYPES } from './integrations/aws_cloudtrail/constants';

export const COMMUNICATES_WITH_ENGINE_CONFIGS: RelationshipIntegrationConfig[] = [
  {
    id: 'okta',
    name: 'Okta',
    indexPattern: (ns) => `logs-okta.system-${ns}`,
    relationshipType: 'communicates_with',
    targetEntityType: 'user',
    compositeAggFilters: [
      { terms: { 'event.action': OKTA_USER_ADMIN_EVENT_ACTIONS } },
      { exists: { field: 'user.target.email' } },
    ],
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
    indexPattern: (ns) => `logs-jamf_pro.events-${ns}`,
    relationshipType: 'communicates_with',
    targetEntityType: 'host',
    compositeAggFilters: [
      { exists: { field: 'user.name' } },
      {
        bool: {
          should: [{ exists: { field: 'host.name' } }, { exists: { field: 'host.id' } }],
          minimum_should_match: 1,
        },
      },
    ],
    esqlWhereClause: `user.name IS NOT NULL`,
  },
  {
    id: 'aws_cloudtrail',
    name: 'AWS CloudTrail',
    indexPattern: (ns) => `logs-aws.cloudtrail-${ns}`,
    relationshipType: 'communicates_with',
    targetEntityType: 'host',
    compositeAggFilters: [
      { terms: { 'aws.cloudtrail.user_identity.type': HUMAN_IAM_IDENTITY_TYPES } },
      { exists: { field: 'host.target.entity.id' } },
    ],
    esqlWhereClause: `aws.cloudtrail.user_identity.type IN (${HUMAN_IAM_IDENTITY_TYPES.map(
      (t) => `"${t}"`
    ).join(', ')})
    AND host.target.entity.id IS NOT NULL`,
    targetEvalOverride: `CONCAT("host:", host.target.entity.id)`,
  },
  {
    id: 'azure_auditlogs',
    name: 'Azure Audit Logs',
    indexPattern: (ns) => `logs-azure.auditlogs-${ns}`,
    relationshipType: 'communicates_with',
    targetEntityType: 'user',
    // azure_auditlogs uses a non-ECS actor field and complex multi-type targets;
    // the standard composite agg, bucket filter, and ES|QL builders cannot be used.
    compositeAggFilters: [],
    esqlWhereClause: '',
    buildCompositeAggOverride: azureBuildCompositeAgg,
    buildBucketFilterOverride: azureBuildBucketFilter,
    esqlQueryOverride: azureBuildEsqlQuery,
  },
];
