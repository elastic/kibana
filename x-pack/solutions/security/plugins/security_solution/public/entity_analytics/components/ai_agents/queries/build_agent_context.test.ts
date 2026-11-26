/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildAgentContext } from './build_agent_context';
import { buildAgentContextQuery, buildAgentInventoryQuery } from './agent_queries';
import { buildOtelEventsQuery } from './activity_queries';
import { toAgentRow, toHrRecord, toIdpAccount, toRelatedEntity } from './parse_rows';
import type { AgentRow, RelatedEntity } from '../types';
import { getToolShellCommand, parseAgentId, parseAgentVersion } from '../utils';

const identity = {
  entityId: 'ai_agent:claude_code@host-1@ec2-user',
  agentName: 'claude_code',
  hostId: 'host-1',
  userName: 'ec2-user',
};

const agent: AgentRow = {
  ...identity,
  watchlistIds: [],
  accountEmails: ['alex@example.com'],
  accountIds: [],
  dependsOnIds: ['host:host-1'],
  dataSources: [],
};

const row = (
  overrides: Partial<RelatedEntity> & Pick<RelatedEntity, 'entityId' | 'engineType'>
) => ({
  watchlistIds: [],
  resolvedTo: [],
  accountEmails: [],
  accountIds: [],
  ownsInferredIds: [],
  ...overrides,
});

describe('buildAgentContext', () => {
  const host = row({ entityId: 'host:host-1', engineType: 'host', hostId: 'host-1' });
  const localUser = row({
    entityId: 'user:ec2-user@host-1@local',
    engineType: 'user',
    namespace: 'local',
    ownsInferredIds: [identity.entityId],
  });
  const okta = row({
    entityId: 'user:alex@example.com@okta',
    engineType: 'user',
    namespace: 'okta',
    email: 'alex@example.com',
    watchlistIds: ['departing-employees'],
  });
  const entra = row({
    entityId: 'user:alex@example.com@entra_id',
    engineType: 'user',
    namespace: 'entra_id',
    email: 'alex@example.com',
    resolvedTo: ['user:alex@example.com@okta'],
  });
  const sameHostAgent = row({
    entityId: 'ai_agent:cursor@host-1@ec2-user',
    engineType: 'ai_agent',
    hostId: 'host-1',
  });
  const sameAccountAgent = row({
    entityId: 'ai_agent:claude_code@host-2@alex',
    engineType: 'ai_agent',
    hostId: 'host-2',
    accountEmails: ['alex@example.com'],
  });

  it('resolves the person from raw emails, preferring the resolution target', () => {
    const context = buildAgentContext({
      identity,
      agent,
      related: [entra, okta, host, localUser, sameHostAgent, sameAccountAgent],
      idpAccounts: [{ email: 'alex@example.com', provider: 'Okta', deprovisioned: true }],
      hrRecords: [{ email: 'Alex@Example.com', status: 'Terminated' }],
      signedInAs: 'alex@example.com',
    });

    expect(context.host?.entityId).toBe('host:host-1');
    expect(context.runsAs?.entityId).toBe('user:ec2-user@host-1@local');
    expect(context.people).toHaveLength(1);
    expect(context.people[0].primary?.entityId).toBe('user:alex@example.com@okta');
    expect(context.people[0].watchlistIds).toEqual(['departing-employees']);
    expect(context.people[0].idpAccounts[0].deprovisioned).toBe(true);
    expect(context.people[0].hr?.status).toBe('Terminated');
    expect(context.otherAgentsOnHost.map((r) => r.entityId)).toEqual([sameHostAgent.entityId]);
    expect(context.otherInstallsOnAccount.map((r) => r.entityId)).toEqual([
      sameAccountAgent.entityId,
    ]);
  });

  it('uses resolved acts_on_behalf_of IDs once a maintainer writes them', () => {
    const context = buildAgentContext({
      identity,
      agent: { ...agent, accountEmails: [], accountIds: ['user:alex@example.com@okta'] },
      related: [okta, sameAccountAgent],
      idpAccounts: [],
    });
    expect(context.people.map((person) => person.primary?.entityId)).toEqual([
      'user:alex@example.com@okta',
    ]);
  });

  it('keeps an email no IdP user has, without a primary row', () => {
    const context = buildAgentContext({ identity, agent, related: [], idpAccounts: [] });
    expect(context.people).toEqual([
      expect.objectContaining({ email: 'alex@example.com', primary: undefined, rows: [] }),
    ]);
    expect(context.host).toBeUndefined();
    expect(context.runsAs).toBeUndefined();
  });

  it('falls back to the local user ID when owns_inferred is not written', () => {
    const context = buildAgentContext({
      identity,
      agent,
      related: [{ ...localUser, ownsInferredIds: [] }],
      idpAccounts: [],
    });
    expect(context.runsAs?.entityId).toBe('user:ec2-user@host-1@local');
  });
});

describe('row readers', () => {
  it('reads an agent row and parses its version', () => {
    expect(
      toAgentRow({
        'entity.id': identity.entityId,
        'process.executable':
          '/home/ec2-user/.local/share/cursor-agent/versions/2026.11.22-e9042b2/node',
        'entity.relationships.acts_on_behalf_of.raw_identifiers.user.email': ['a@x', 'b@x'],
        'entity.risk.calculated_level': null,
      })
    ).toMatchObject({
      agentName: 'claude_code',
      hostId: 'host-1',
      userName: 'ec2-user',
      version: '2026.11.22-e9042b2',
      accountEmails: ['a@x', 'b@x'],
      riskLevel: undefined,
    });
  });

  it('reads IdP booleans whether mapped or loaded from _source', () => {
    expect(
      toIdpAccount({
        'user.email': 'a@x',
        'event.module': 'entityanalytics_okta',
        deprovisioned: 'true',
        mfa_enabled: false,
      })
    ).toMatchObject({ provider: 'Okta', deprovisioned: true, mfaEnabled: false });
    expect(
      toIdpAccount({
        'user.email': 'a@x',
        'event.module': 'entityanalytics_entra_id',
        account_enabled: false,
      })
    ).toMatchObject({ provider: 'Entra ID', deprovisioned: true });
  });

  it('reads HR records and MFA from the entity row', () => {
    expect(
      toHrRecord({
        'user.email': 'a@x',
        employment_status: 'Terminated',
        termination_date: '2026-12-01',
      })
    ).toEqual({ email: 'a@x', status: 'Terminated', terminationDate: '2026-12-01' });
    expect(toHrRecord({ employment_status: 'Active' })).toBeUndefined();
    expect(
      toRelatedEntity({
        'entity.id': 'user:a@x@okta',
        'entity.EngineMetadata.Type': 'user',
        'entity.attributes.mfa_enabled': 'false',
      })?.mfaEnabled
    ).toBe(false);
  });

  it('skips rows without an ID', () => {
    expect(toRelatedEntity({ 'entity.EngineMetadata.Type': 'user' })).toBeUndefined();
  });
});

describe('utils', () => {
  it('parses the install ID, keeping any @ in the OS user', () => {
    expect(parseAgentId(identity.entityId)).toEqual(identity);
    expect(parseAgentId('ai_agent:cursor@h@a@b')?.userName).toBe('a@b');
    expect(parseAgentId('host:h')).toBeUndefined();
  });

  it('parses versions from native installs only', () => {
    expect(parseAgentVersion('/home/u/.local/share/claude/versions/2.1.332')).toBe('2.1.332');
    expect(parseAgentVersion('/opt/homebrew/Caskroom/claude-code/2.1.332/claude')).toBe('2.1.332');
    expect(
      parseAgentVersion('/usr/lib/node_modules/@anthropic-ai/claude-code/cli.js')
    ).toBeUndefined();
    expect(parseAgentVersion(undefined)).toBeUndefined();
  });
});

describe('getToolShellCommand', () => {
  it('reads the command a Claude Code tool shell evaluates, unescaping quotes', () => {
    const wrap = (command: string) =>
      `/bin/bash -c source /home/u/.claude/shell-snapshots/snapshot-bash-1.sh 2>/dev/null || true && eval '${command}' < /dev/null && pwd -P >| /tmp/claude-1-cwd`;
    expect(getToolShellCommand(wrap('git status'))).toBe('git status');
    expect(getToolShellCommand(wrap("echo '\\''hi'\\''"))).toBe("echo 'hi'");
    expect(getToolShellCommand("bash -c eval 'git status'")).toBeUndefined();
    expect(getToolShellCommand(undefined)).toBeUndefined();
  });
});

describe('queries', () => {
  it('reads unmapped fields as null and filters agent rows by type', () => {
    const query = buildAgentInventoryQuery('default');
    expect(query).toContain('SET unmapped_fields="nullify";');
    expect(query).toContain('entity.EngineMetadata.Type == "ai_agent"');
  });

  it('matches multi-valued account fields with MV_CONTAINS and escapes values', () => {
    const query = buildAgentContextQuery({
      spaceId: 'default',
      identity,
      accountEmails: ['a"b@x'],
      accountIds: [],
      dependsOnIds: [],
    });
    expect(query).toContain(
      'MV_CONTAINS(entity.relationships.acts_on_behalf_of.raw_identifiers.user.email, "a\\"b@x")'
    );
    expect(query).toContain('"user:ec2-user@host-1@local"');
  });

  it('ties OTel to Defend by session through the ECS field with the Claude fallback', () => {
    const query = buildOtelEventsQuery({ sessionIds: ['s1'] });
    expect(query).toContain('COALESCE(gen_ai.conversation.id, claude_code.events.session.id)');
    expect(query).toContain('claude_code.events.prompt_text');
  });
});
