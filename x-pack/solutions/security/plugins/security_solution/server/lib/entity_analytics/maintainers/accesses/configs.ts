/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RelationshipIntegrationConfig } from '../engine/types';

const EXCLUDED_USERNAMES = ['SYSTEM', 'LOCAL SERVICE', 'NETWORK SERVICE', 'ANONYMOUS LOGON'];

const SUCCESSFUL_OUTCOME_FILTER = { term: { 'event.outcome': 'success' } } as const;

// Access-count threshold above which an actor→target pair is classified as
// `accesses_frequently` rather than `accesses_infrequently`. Each accesses
// integration declares this explicitly so the engine carries no implicit
// data-tuning defaults; tune per integration if a vendor's event volume
// makes the shared value misclassify.
const ACCESS_COUNT_THRESHOLD = 4;

// Bucket relationship keys for access-count classification. Defined once at
// the configs level so each integration declares the same accesses-schema
// pair without duplicating string literals at every call site.
const ACCESSES_BUCKETING = {
  threshold: ACCESS_COUNT_THRESHOLD,
  aboveThresholdRelationship: 'accesses_frequently',
  belowThresholdRelationship: 'accesses_infrequently',
} as const;

export const ACCESSES_INTEGRATION_RELATIONSHIP_CONFIGS: RelationshipIntegrationConfig[] = [
  {
    kind: 'bucketed',
    id: 'elastic_defend',
    name: 'Elastic Defend',
    indexPattern: (ns) => `logs-endpoint.events.security-${ns}`,
    targetEntityType: 'host',
    bucketTargetByThreshold: ACCESSES_BUCKETING,
    requireTargetEntityIdExists: true,
    esqlWhereClause: `event.action == "log_on"
    AND process.Ext.session_info.logon_type IN ("RemoteInteractive", "Interactive", "Network")
    AND event.outcome == "success"`,
    compositeAggAdditionalFilters: [
      { term: { 'event.action': 'log_on' } },
      SUCCESSFUL_OUTCOME_FILTER,
    ],
  },
  {
    kind: 'bucketed',
    id: 'aws_cloudtrail',
    name: 'AWS CloudTrail',
    indexPattern: (ns) => `logs-aws.cloudtrail-${ns}`,
    targetEntityType: 'host',
    bucketTargetByThreshold: ACCESSES_BUCKETING,
    requireTargetEntityIdExists: true,
    esqlWhereClause: `event.module == "aws"
    AND event.action IN ("StartSession", "SendSSHPublicKey")
    AND event.outcome == "success"`,
    compositeAggAdditionalFilters: [
      { terms: { 'event.action': ['StartSession', 'SendSSHPublicKey'] } },
      SUCCESSFUL_OUTCOME_FILTER,
    ],
  },
  {
    kind: 'bucketed',
    id: 'system_auth',
    name: 'System Auth',
    indexPattern: (ns) => `logs-system.auth-${ns}`,
    targetEntityType: 'host',
    bucketTargetByThreshold: ACCESSES_BUCKETING,
    requireTargetEntityIdExists: true,
    // Host-scoped EUID is `user:<user.name>@<host.id>@local`, so `user.name` is
    // the only actor field Step 2 reads. Listing anything else (`user.email`,
    // `user.id`) only inflates the composite agg: extra sources multiply buckets
    // — the same username appears with dozens of distinct Unix UIDs / Windows
    // SIDs across hosts — so Step 1 pages and Step 2 ES|QL queries grow for
    // actors Step 2 then discards.
    customActor: { fields: ['user.name'] },
    // `event.category` is multivalued in ECS (Elastic Agent's syslog SSH events
    // emit `["authentication", "session"]`). ES|QL `IN` returns NULL for a
    // multivalued left-hand side, so `event.category IN (...)` silently drops
    // those events. Use MV_CONTAINS (same idiom as communicates_with/system_auth)
    // so multivalued categories match.
    esqlWhereClause: `(MV_CONTAINS(TO_STRING(event.category), "authentication") OR MV_CONTAINS(TO_STRING(event.category), "session"))
    AND event.action == "ssh_login"
    AND event.outcome == "success"`,
    compositeAggAdditionalFilters: [
      { term: { 'event.action': 'ssh_login' } },
      SUCCESSFUL_OUTCOME_FILTER,
    ],
    hostScopedUsersOnly: true,
  },
  {
    kind: 'bucketed',
    id: 'system_security',
    name: 'System Security',
    indexPattern: (ns) => `logs-system.security-${ns}`,
    targetEntityType: 'host',
    bucketTargetByThreshold: ACCESSES_BUCKETING,
    requireTargetEntityIdExists: true,
    // Windows logon events carry `user.name`, which is the only actor field the
    // host-scoped EUID (`user:<user.name>@<host.id>@local`) reads. A doc with
    // `user.email` but no `user.name` is an IDP user that extraction indexed
    // under a different EUID, so bucketing on it would surface actors Step 2
    // cannot build an id for.
    customActor: { fields: ['user.name'] },
    esqlWhereClause: `event.action IN ("logged-in", "logged-in-explicit")
    AND event.code IN ("4624", "4648")
    AND winlog.logon.type IN ("Interactive", "RemoteInteractive", "CachedInteractive")
    AND event.outcome == "success"
    AND NOT user.name IN (${EXCLUDED_USERNAMES.map((u) => `"${u}"`).join(', ')})`,
    compositeAggAdditionalFilters: [
      { terms: { 'event.action': ['logged-in', 'logged-in-explicit'] } },
      SUCCESSFUL_OUTCOME_FILTER,
    ],
    hostScopedUsersOnly: true,
  },
  {
    kind: 'bucketed',
    id: 'crowdstrike_fdr',
    name: 'CrowdStrike FDR',
    indexPattern: (ns) => `logs-crowdstrike.fdr-${ns}`,
    targetEntityType: 'host',
    bucketTargetByThreshold: ACCESSES_BUCKETING,
    requireTargetEntityIdExists: true,
    // host.id is populated from crowdstrike.aid (the CrowdStrike Agent ID) by
    // the FDR ingest pipeline and is first in the host EUID ranking, so
    // host:<AID> resolves to the entity extraction already created from the
    // same FDR stream.
    //
    // LogonType is inverted to an exclusion list to tolerate NULL: an IN
    // allow-list returns NULL for missing fields, silently dropping events
    // with the richest identity data. Excluded: 3=Network, 4=Batch, 5=Service,
    // 8=NetworkCleartext. Machine accounts (WORKSTATION$) are guarded by the
    // LIKE filter because they are not in EXCLUDED_USERNAMES.
    //
    // event.outcome == "success" is always true on UserLogon (the pipeline
    // hard-codes it), but kept for test-suite consistency with the other
    // accesses configs.
    customActor: { fields: ['user.name'] },
    esqlWhereClause: `event.action == "UserLogon"
    AND MV_CONTAINS(TO_STRING(event.category), "authentication")
    AND (crowdstrike.LogonType IS NULL OR NOT crowdstrike.LogonType IN ("3", "4", "5", "8"))
    AND event.outcome == "success"
    AND NOT user.name IN (${EXCLUDED_USERNAMES.map((u) => `"${u}"`).join(', ')})
    AND NOT user.name LIKE "*$"`,
    compositeAggAdditionalFilters: [
      { terms: { 'event.action': ['UserLogon'] } },
      SUCCESSFUL_OUTCOME_FILTER,
    ],
    hostScopedUsersOnly: true,
  },
];
