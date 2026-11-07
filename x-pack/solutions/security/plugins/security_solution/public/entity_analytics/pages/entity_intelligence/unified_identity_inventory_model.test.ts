/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityType } from '../../../../common/entity_analytics/types';
import type { AgentInventoryItem } from './ai_agents/types';
import type { CodexSession } from './ai_agents/codex_types';
import type { IntelligenceEntity } from './common';
import {
  buildUnifiedIdentityRows,
  filterUnifiedIdentityRows,
} from './unified_identity_inventory_model';

const entity: IntelligenceEntity = {
  id: 'user:one',
  name: 'same-name',
  type: EntityType.user,
  identifierValue: 'same-name',
  riskScoreNorm: 77,
  riskLevel: 'High',
  source: 'endpoint',
  criticality: undefined,
  lastSeen: '2026-10-12T12:00:00Z',
};
const agent: AgentInventoryItem = {
  id: 'one',
  entityId: 'ai_agent:default:one',
  name: 'same-name',
  description: '',
  type: 'custom',
  readonly: false,
  configuredTools: [],
  connectorIds: [],
  subagentIds: [],
  enableElasticCapabilities: false,
  traceAliases: [],
  owner: { name: 'agent-creator' },
};
const session: CodexSession = {
  id: 'session-one',
  agentId: 'codex:install-one',
  start: '2026-10-12T10:00:00Z',
  lastSeen: '2026-10-12T14:00:00Z',
  toolCount: 5,
  failures: 2,
  successes: 3,
  unknowns: 0,
  completedTurns: 1,
  abortedTurns: 0,
  tools: [],
  summaryComplete: true,
  source: { index: 'logs-codex.entity_intelligence-default', id: 'doc-one' },
  fileHash: 'hash',
};

it('keeps matching names and cross-type identifiers distinct and preserves investigation targets', () => {
  const host = { ...entity, type: EntityType.host };
  const rows = buildUnifiedIdentityRows({
    entities: [entity, host],
    agents: [agent],
    codexSessions: [],
  });
  expect(rows).toHaveLength(3);
  expect(new Set(rows.map((row) => row.id)).size).toBe(3);
  expect(rows.find((row) => row.kind === 'user')?.target).toEqual({
    source: 'entity_store',
    entity,
  });
  expect(rows.find((row) => row.source === 'agent_builder')?.target).toEqual({
    source: 'agent_builder',
    agentId: 'one',
  });
});

it('groups Codex by installation, deduplicates session records, and opens its latest session', () => {
  const latest = { ...session, id: 'session-latest', lastSeen: '2026-10-12T15:00:00Z' };
  const otherInstall = { ...session, agentId: 'codex:install-two' };
  const rows = buildUnifiedIdentityRows({
    entities: [],
    agents: [],
    codexSessions: [session, session, latest, otherInstall],
    codexPartial: true,
  });
  expect(rows).toHaveLength(2);
  expect(rows[0].target).toEqual({
    source: 'codex',
    sessionKey: '["codex:install-one","session-latest"]',
  });
  expect(rows[0].activity).toEqual({ count: 2, unit: 'sessions', partial: true });
  expect(rows[1].activity?.count).toBe(1);
});

it('does not convert unavailable agent activity or unscored risk to zero', () => {
  const rows = buildUnifiedIdentityRows({
    entities: [{ ...entity, riskScoreNorm: undefined }],
    agents: [agent],
    codexSessions: [session],
  });
  expect(rows.every((row) => row.riskScore === undefined)).toBe(true);
  expect(rows.find((row) => row.source === 'agent_builder')?.activity).toBeUndefined();
  expect(rows.find((row) => row.source === 'agent_builder')?.owner).toBe('agent-creator');
});

it('searches source and installation IDs while respecting type filters', () => {
  const rows = buildUnifiedIdentityRows({
    entities: [entity],
    agents: [agent],
    codexSessions: [session],
  });
  expect(
    filterUnifiedIdentityRows(rows, 'INSTALL-ONE', 'ai_agent').map((row) => row.source)
  ).toEqual(['codex']);
  expect(filterUnifiedIdentityRows(rows, 'agent builder', 'all').map((row) => row.source)).toEqual([
    'agent_builder',
  ]);
  expect(filterUnifiedIdentityRows(rows, 'same-name', 'user')).toHaveLength(1);
  expect(filterUnifiedIdentityRows(rows, 'agent-creator', 'ai_agent')).toHaveLength(1);
  expect(filterUnifiedIdentityRows(rows, 'Codex', 'host')).toHaveLength(0);
});

it('opens the latest explicit user session while retaining newer background activity time', () => {
  const userSession: CodexSession = { ...session, id: 'user-session', role: 'user' };
  const guardian: CodexSession = {
    ...session,
    id: 'guardian',
    role: 'guardian_review',
    lastSeen: '2026-10-12T15:00:00Z',
  };
  const rows = buildUnifiedIdentityRows({
    entities: [],
    agents: [],
    codexSessions: [guardian, userSession],
  });
  expect(rows[0].target).toEqual({
    source: 'codex',
    sessionKey: '["codex:install-one","user-session"]',
  });
  expect(rows[0].lastSeen).toBe(guardian.lastSeen);
  expect(rows[0].activity?.count).toBe(2);
});

it('uses declared cloud ownership without substituting the requester or local account', () => {
  const cloudSession: CodexSession = {
    ...session,
    provider: 'google_adk',
    agentId: 'google-support-agent',
    googleAdk: {
      project_id: 'project-one',
      service_name: 'support-agent',
      revision: 'support-agent-001',
      run_id: 'run-one',
      trace_id: 'a'.repeat(32),
      span_id: 'b'.repeat(16),
      requester: {
        email: 'requester@example.com',
        subject: 'requester-one',
        authenticated: true,
        provenance: 'google_signed_id_token_verified_by_application',
        human_identity: 'account_level_only',
      },
      runtime: {
        email: 'runtime@project-one.iam.gserviceaccount.com',
        provenance: 'cloud_run_metadata_service_identity',
      },
      owner: {
        email: 'owner@example.com',
        recorded_by: 'operator@example.com',
        effective_from: '2026-10-12T08:00:00Z',
        provenance: 'operator_declared',
      },
      resources: [],
      audit_matches: [],
      source_policy: {
        id: 'data-boundary',
        name: 'Data boundary',
        revision: 1,
        mode: 'monitor',
        enforced: false,
        matches: [],
      },
    },
  };
  const rows = buildUnifiedIdentityRows({
    entities: [],
    agents: [],
    codexSessions: [],
    googleAdkSessions: [cloudSession],
  });
  expect(rows[0]).toMatchObject({
    name: 'Google ADK',
    owner: 'owner@example.com',
    sourceDetail: 'support-agent',
    target: {
      source: 'google_adk',
      sessionKey: '["google-support-agent","session-one"]',
    },
  });
  expect(
    buildUnifiedIdentityRows({
      entities: [],
      agents: [],
      codexSessions: [],
      googleAdkSessions: [{ ...cloudSession, googleAdk: undefined }],
    })[0].owner
  ).toBeUndefined();
});
