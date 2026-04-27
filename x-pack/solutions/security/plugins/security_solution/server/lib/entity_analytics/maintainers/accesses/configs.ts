/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RelationshipIntegrationConfig } from '../engine/types';
import { getIndexPattern as elasticDefendIndexPattern } from './integrations/elastic_defend/constants';
import { getIndexPattern as awsCloudtrailAccessesIndexPattern } from './integrations/aws_cloudtrail/constants';
import { getIndexPattern as systemAuthIndexPattern } from './integrations/system_auth/constants';
import { getIndexPattern as systemSecurityIndexPattern, EXCLUDED_USERNAMES } from './integrations/system_security/constants';

export const ACCESSES_ENGINE_CONFIGS: RelationshipIntegrationConfig[] = [
  {
    id: 'elastic_defend',
    name: 'Elastic Defend',
    indexPattern: elasticDefendIndexPattern,
    relationshipType: 'accesses',
    targetEntityType: 'host',
    esqlWhereClause: `event.action == "log_on"
    AND process.Ext.session_info.logon_type IN ("RemoteInteractive", "Interactive", "Network")`,
    compositeAggAdditionalFilters: [{ term: { 'event.action': 'log_on' } }],
  },
  {
    id: 'aws_cloudtrail',
    name: 'AWS CloudTrail',
    indexPattern: awsCloudtrailAccessesIndexPattern,
    relationshipType: 'accesses',
    targetEntityType: 'host',
    esqlWhereClause: `event.module == "aws"
    AND event.action IN ("StartSession", "SendSSHPublicKey")`,
    compositeAggAdditionalFilters: [
      { terms: { 'event.action': ['StartSession', 'SendSSHPublicKey'] } },
    ],
  },
  {
    id: 'system_auth',
    name: 'System Auth',
    indexPattern: systemAuthIndexPattern,
    relationshipType: 'accesses',
    targetEntityType: 'host',
    esqlWhereClause: `event.category IN ("authentication", "session")
    AND event.action == "ssh_login"`,
    compositeAggAdditionalFilters: [{ term: { 'event.action': 'ssh_login' } }],
  },
  {
    id: 'system_security',
    name: 'System Security',
    indexPattern: systemSecurityIndexPattern,
    relationshipType: 'accesses',
    targetEntityType: 'host',
    esqlWhereClause: `event.action IN ("logged-in", "logged-in-explicit")
    AND event.code IN ("4624", "4648")
    AND winlog.logon.type IN ("Interactive", "RemoteInteractive", "CachedInteractive")
    AND NOT user.name IN (${EXCLUDED_USERNAMES.map((u) => `"${u}"`).join(', ')})`,
    compositeAggAdditionalFilters: [
      { terms: { 'event.action': ['logged-in', 'logged-in-explicit'] } },
    ],
  },
];
