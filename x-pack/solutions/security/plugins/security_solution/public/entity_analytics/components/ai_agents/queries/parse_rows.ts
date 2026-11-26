/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentAlert, AgentRow, HrRecord, IdpAccount, RelatedEntity } from '../types';
import {
  firstString,
  parseAgentId,
  parseAgentVersion,
  toBoolean,
  toCriticality,
  toNumber,
  toRiskLevel,
  toStringArray,
} from '../utils';

type EsqlRecord = Record<string, unknown>;

export const toRelatedEntity = (row: EsqlRecord): RelatedEntity | undefined => {
  const entityId = firstString(row['entity.id']);
  const engineType = firstString(row['entity.EngineMetadata.Type']);
  if (!entityId || !engineType) return undefined;
  return {
    entityId,
    engineType,
    name: firstString(row['entity.name']),
    hostId: firstString(row['host.id']),
    hostName: firstString(row['host.name']),
    userName: firstString(row['user.name']),
    email: firstString(row['user.email']),
    fullName: firstString(row['user.full_name']),
    namespace: firstString(row['entity.namespace']),
    source: firstString(row['entity.source']),
    lastSeen: firstString(row['entity.lifecycle.last_seen']),
    riskLevel: toRiskLevel(row['entity.risk.calculated_level']),
    riskScore: toNumber(row['entity.risk.calculated_score_norm']),
    criticality: toCriticality(row['asset.criticality']),
    watchlistIds: toStringArray(row['entity.attributes.watchlists']),
    resolvedTo: toStringArray(row['entity.relationships.resolution.resolved_to']),
    accountEmails: toStringArray(
      row['entity.relationships.acts_on_behalf_of.raw_identifiers.user.email']
    ),
    accountIds: toStringArray(row['entity.relationships.acts_on_behalf_of.ids']),
    ownsInferredIds: toStringArray(row['entity.relationships.owns_inferred.ids']),
    agentName: firstString(row['process.ai_agent.name']),
    mfaEnabled: toBoolean(row['entity.attributes.mfa_enabled']),
  };
};

/**
 * Reads an agent row. The identity comes from the row's fields, falling back to the install ID, so
 * a row written before a field was retained still shows.
 */
export const toAgentRow = (row: EsqlRecord): AgentRow | undefined => {
  const entityId = firstString(row['entity.id']);
  if (!entityId) return undefined;
  const parsed = parseAgentId(entityId);
  const agentName = firstString(row['process.ai_agent.name']) ?? parsed?.agentName;
  const hostId = firstString(row['host.id']) ?? parsed?.hostId;
  const userName = firstString(row['user.name']) ?? parsed?.userName;
  if (!agentName || !hostId || !userName) return undefined;
  const executable = firstString(row['process.executable']);
  return {
    entityId,
    agentName,
    hostId,
    userName,
    entityName: firstString(row['entity.name']),
    hostName: firstString(row['host.name']),
    executable,
    version: parseAgentVersion(executable),
    firstSeen: firstString(row['entity.lifecycle.first_seen']),
    lastSeen: firstString(row['entity.lifecycle.last_seen']),
    riskLevel: toRiskLevel(row['entity.risk.calculated_level']),
    riskScore: toNumber(row['entity.risk.calculated_score_norm']),
    criticality: toCriticality(row['asset.criticality']),
    watchlistIds: toStringArray(row['entity.attributes.watchlists']),
    accountEmails: toStringArray(
      row['entity.relationships.acts_on_behalf_of.raw_identifiers.user.email']
    ),
    accountIds: toStringArray(row['entity.relationships.acts_on_behalf_of.ids']),
    dependsOnIds: toStringArray(row['entity.relationships.depends_on.ids']),
    dataSources: toStringArray(row['entity.source']),
  };
};

const PROVIDER_NAMES: Readonly<Record<string, string>> = {
  entityanalytics_okta: 'Okta',
  entityanalytics_entra_id: 'Entra ID',
};

export const toIdpAccount = (row: EsqlRecord): IdpAccount | undefined => {
  const email = firstString(row['user.email']);
  const module = firstString(row['event.module']);
  if (!email || !module) return undefined;
  const accountEnabled = toBoolean(row.account_enabled);
  return {
    email,
    provider: PROVIDER_NAMES[module] ?? module,
    status: firstString(row.status),
    deprovisioned: toBoolean(row.deprovisioned) ?? (accountEnabled === false ? true : undefined),
    suspended: toBoolean(row.suspended),
    enabled: accountEnabled,
    mfaEnabled: toBoolean(row.mfa_enabled),
    fullName: firstString(row.full_name),
  };
};

export const toHrRecord = (row: EsqlRecord): HrRecord | undefined => {
  const email = firstString(row['user.email']);
  if (!email) return undefined;
  return {
    email,
    status: firstString(row.employment_status),
    terminationDate: firstString(row.termination_date),
  };
};

export const toAgentAlert = (row: EsqlRecord): AgentAlert | undefined => {
  const id = firstString(row._id);
  const index = firstString(row._index);
  const timestamp = firstString(row['@timestamp']);
  if (!id || !index || !timestamp) return undefined;
  return {
    id,
    index,
    timestamp,
    ruleName: firstString(row['kibana.alert.rule.name']),
    severity: firstString(row['kibana.alert.severity']),
    status: firstString(row['kibana.alert.workflow_status']),
    riskScore: toNumber(row['kibana.alert.risk_score']),
    processName: firstString(row['process.name']),
    userName: firstString(row['user.name']),
  };
};

export const isDefined = <T>(value: T | undefined): value is T => value !== undefined;
