/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeStringValue } from '@kbn/esql-utils';
import {
  getAlertsIndex,
  getEntityAlias,
  SET_UNMAPPED_NULLIFY,
  toList,
} from '../../home/entities_grid/queries/esql';
import { ALERT_OPEN_STATUS_FILTER } from '../../home/entities_grid/queries/alerts';
import {
  AGENT_ALERTS_MAX_ROWS,
  AI_AGENT_ENGINE_TYPE,
  AI_AGENT_ID_PREFIX,
  AI_AGENTS_MAX_ROWS,
  ENDPOINT_PROCESS_INDEX,
  ENTRA_USER_INDEX,
  HR_INDEX,
  OKTA_USER_INDEX,
} from '../constants';
import type { AgentIdentity } from '../types';
import { getLocalUserEntityId } from '../utils';

/** Raw IdP user documents may carry fields the integration doesn't map; load them from `_source`. */
const SET_UNMAPPED_LOAD = 'SET unmapped_fields="load";';

/** Columns every related-entity read keeps, so one parser reads agents, hosts and users. */
export const ENTITY_ROW_COLUMNS = [
  'entity.id',
  'entity.name',
  'entity.EngineMetadata.Type',
  'entity.source',
  'entity.namespace',
  'entity.lifecycle.first_seen',
  'entity.lifecycle.last_seen',
  'entity.risk.calculated_level',
  'entity.risk.calculated_score_norm',
  'asset.criticality',
  'entity.attributes.watchlists',
  'entity.relationships.resolution.resolved_to',
  'entity.relationships.acts_on_behalf_of.raw_identifiers.user.email',
  'entity.relationships.acts_on_behalf_of.ids',
  'entity.relationships.depends_on.ids',
  'entity.relationships.owns_inferred.ids',
  'process.ai_agent.name',
  'process.executable',
  'host.id',
  'host.name',
  'user.name',
  'user.email',
  'user.full_name',
  'entity.attributes.mfa_enabled',
] as const;

const ACCOUNT_EMAILS_FIELD = 'entity.relationships.acts_on_behalf_of.raw_identifiers.user.email';

/** `field` holds any of `values`. `IN` returns null on multi-valued fields, so this ORs `MV_CONTAINS`. */
const anyOf = (field: string, values: readonly string[]): string =>
  values.length === 0
    ? 'false'
    : `(${values
        .map((value) => `MV_CONTAINS(${field}, ${escapeStringValue(value)})`)
        .join(' OR ')})`;

/** One row per agent install in the space. */
export const buildAgentInventoryQuery = (spaceId: string): string =>
  [
    SET_UNMAPPED_NULLIFY,
    `FROM ${getEntityAlias(spaceId)}`,
    `| WHERE entity.EngineMetadata.Type == "${AI_AGENT_ENGINE_TYPE}"`,
    `| KEEP ${ENTITY_ROW_COLUMNS.join(', ')}`,
    '| SORT entity.lifecycle.last_seen DESC',
    `| LIMIT ${AI_AGENTS_MAX_ROWS}`,
  ].join('\n');

/** Open alerts per agent, read from the agent IDs detection appends to `kibana.alert.entity.id`. */
export const buildAgentAlertCountsQuery = (spaceId: string): string =>
  [
    SET_UNMAPPED_NULLIFY,
    `FROM ${getAlertsIndex(spaceId)}`,
    `| WHERE ${ALERT_OPEN_STATUS_FILTER}`,
    '| MV_EXPAND kibana.alert.entity.id',
    `| WHERE STARTS_WITH(kibana.alert.entity.id, "${AI_AGENT_ID_PREFIX}")`,
    '| STATS alert_count = COUNT(*) BY kibana.alert.entity.id',
    `| LIMIT ${AI_AGENTS_MAX_ROWS}`,
  ].join('\n');

export interface AgentContextQueryParams {
  readonly spaceId: string;
  readonly identity: AgentIdentity;
  readonly accountEmails: readonly string[];
  readonly accountIds: readonly string[];
  readonly dependsOnIds: readonly string[];
}

/**
 * Every row that gives the agent context: the agent itself, its host, the local user it runs as,
 * the people behind its accounts (by resolved ID or by `user.email`), other agents on the host
 * and other installs that used the same accounts.
 */
export const buildAgentContextQuery = ({
  spaceId,
  identity,
  accountEmails,
  accountIds,
  dependsOnIds,
}: AgentContextQueryParams): string => {
  const { entityId, hostId } = identity;
  const directIds = Array.from(
    new Set([
      entityId,
      `host:${hostId}`,
      getLocalUserEntityId(identity),
      ...dependsOnIds,
      ...accountIds,
    ])
  );
  const conditions = [
    `entity.id IN (${toList(directIds)})`,
    `(entity.EngineMetadata.Type == "user" AND ${anyOf('entity.relationships.owns_inferred.ids', [
      entityId,
    ])})`,
    `(entity.EngineMetadata.Type == "${AI_AGENT_ENGINE_TYPE}" AND host.id == ${escapeStringValue(
      hostId
    )})`,
  ];
  if (accountEmails.length > 0) {
    conditions.push(
      `(entity.EngineMetadata.Type == "user" AND ${anyOf('user.email', accountEmails)})`,
      `(entity.EngineMetadata.Type == "${AI_AGENT_ENGINE_TYPE}" AND ${anyOf(
        ACCOUNT_EMAILS_FIELD,
        accountEmails
      )})`
    );
  }
  if (accountIds.length > 0) {
    conditions.push(
      `(entity.EngineMetadata.Type == "${AI_AGENT_ENGINE_TYPE}" AND ${anyOf(
        'entity.relationships.acts_on_behalf_of.ids',
        accountIds
      )})`
    );
  }
  return [
    SET_UNMAPPED_NULLIFY,
    `FROM ${getEntityAlias(spaceId)}`,
    `| WHERE ${conditions.join('\n  OR ')}`,
    `| KEEP ${ENTITY_ROW_COLUMNS.join(', ')}`,
    '| LIMIT 500',
  ].join('\n');
};

/** Rows by ID, used to follow `resolution.resolved_to` to the person's primary row. */
export const buildEntitiesByIdQuery = (spaceId: string, entityIds: readonly string[]): string =>
  [
    SET_UNMAPPED_NULLIFY,
    `FROM ${getEntityAlias(spaceId)}`,
    `| WHERE entity.id IN (${toList(entityIds)})`,
    `| KEEP ${ENTITY_ROW_COLUMNS.join(', ')}`,
    '| LIMIT 100',
  ].join('\n');

/**
 * Okta account state per email, from the raw user documents (`asset.status`,
 * `user.account.status.*`). MFA has no integration field, so the storyline writes
 * `user.entity.attributes.mfa_enabled`. Each provider is read on its own, because a field mapped in
 * one integration and loaded from `_source` in the other would conflict.
 */
export const buildOktaAccountsQuery = (emails: readonly string[]): string =>
  [
    SET_UNMAPPED_LOAD,
    `FROM ${OKTA_USER_INDEX}`,
    `| WHERE user.email IN (${toList(emails)})`,
    '| STATS status = LAST(asset.status, @timestamp),',
    '    deprovisioned = LAST(user.account.status.deprovisioned, @timestamp),',
    '    suspended = LAST(user.account.status.suspended, @timestamp),',
    '    mfa_enabled = LAST(user.entity.attributes.mfa_enabled, @timestamp),',
    '    full_name = LAST(user.full_name, @timestamp)',
    '  BY user.email, event.module',
    '| LIMIT 100',
  ].join('\n');

/** Entra ID account state per email: `account_enabled` false reads as deprovisioned. */
export const buildEntraAccountsQuery = (emails: readonly string[]): string =>
  [
    SET_UNMAPPED_LOAD,
    `FROM ${ENTRA_USER_INDEX}`,
    `| WHERE user.email IN (${toList(emails)})`,
    '| STATS account_enabled = LAST(entityanalytics_entra_id.user.account_enabled, @timestamp),',
    '    mfa_enabled = LAST(user.entity.attributes.mfa_enabled, @timestamp),',
    '    full_name = LAST(user.full_name, @timestamp)',
    '  BY user.email, event.module',
    '| LIMIT 100',
  ].join('\n');

/** Employment status per email from the storyline's HR index. */
export const buildHrRecordsQuery = (emails: readonly string[]): string =>
  [
    SET_UNMAPPED_LOAD,
    `FROM ${HR_INDEX}`,
    `| WHERE user.email IN (${toList(emails)})`,
    '| STATS employment_status = LAST(employment.status, @timestamp),',
    '    termination_date = LAST(employment.termination_date, @timestamp)',
    '  BY user.email',
    '| LIMIT 100',
  ].join('\n');

/** The agent's own events: its three identity fields, descendants left out. */
export const agentOwnEventsFilter = ({ agentName, hostId, userName }: AgentIdentity): string =>
  [
    `process.ai_agent.name == ${escapeStringValue(agentName)}`,
    `host.id == ${escapeStringValue(hostId)}`,
    `user.name == ${escapeStringValue(userName)}`,
    '(process.ai_agent.is_descendant IS NULL OR process.ai_agent.is_descendant == false)',
  ].join(' AND ');

/**
 * The account the install is signed in as now: the newest email on its own events. The row's
 * account set can't say this, because it keeps every email the install has ever used.
 */
export const buildSignedInAsQuery = (identity: AgentIdentity): string =>
  [
    SET_UNMAPPED_NULLIFY,
    `FROM ${ENDPOINT_PROCESS_INDEX}`,
    `| WHERE ${agentOwnEventsFilter(identity)} AND process.ai_agent.email IS NOT NULL`,
    '| SORT @timestamp DESC',
    '| KEEP @timestamp, process.ai_agent.email',
    '| LIMIT 1',
  ].join('\n');

/** Alerts stamped with the agent ID, including alerts on its descendants. */
export const buildAgentAlertsQuery = (spaceId: string, entityId: string): string =>
  [
    SET_UNMAPPED_NULLIFY,
    `FROM ${getAlertsIndex(spaceId)} METADATA _id, _index`,
    `| WHERE MV_CONTAINS(kibana.alert.entity.id, ${escapeStringValue(entityId)})`,
    '| KEEP @timestamp, _id, _index, kibana.alert.rule.name, kibana.alert.severity,',
    '    kibana.alert.workflow_status, kibana.alert.risk_score, process.name, user.name',
    '| SORT @timestamp DESC',
    `| LIMIT ${AGENT_ALERTS_MAX_ROWS}`,
  ].join('\n');
