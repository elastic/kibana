/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentContextRow, RelatedContextRow } from './compute_ai_agent_context';
import { computeAiAgentContexts } from './compute_ai_agent_context';
import { buildAiAgentContextUpdate } from '.';

const NOW = '2026-01-01T00:00:00.000Z';

const agent = (overrides: Partial<AgentContextRow> & { id: string }): AgentContextRow => ({
  personIds: [],
  personEmails: [],
  hostIds: [],
  ...overrides,
});

const row = (overrides: Partial<RelatedContextRow> & { id: string }): RelatedContextRow => ({
  watchlists: [],
  ...overrides,
});

const contextOf = (
  agents: AgentContextRow[],
  relatedRows: RelatedContextRow[],
  agentId = agents[0].id
) => computeAiAgentContexts({ agents, relatedRows, now: NOW }).get(agentId);

describe('computeAiAgentContexts', () => {
  describe('person facts', () => {
    it('combines every row in the resolution group of each person the agent acts for', () => {
      // The agent names only the alias; the target and a second alias carry the other facts.
      const context = contextOf(
        [agent({ id: 'ai_agent:a', personIds: ['user:alice@entra_id'] })],
        [
          row({
            id: 'user:alice@entra_id',
            resolvedTo: 'user:alice@okta',
            watchlists: ['departing'],
            mfaEnabled: false,
          }),
          row({ id: 'user:alice@okta', watchlists: ['privileged'], criticality: 'medium_impact' }),
          row({
            id: 'user:alice@ad',
            resolvedTo: 'user:alice@okta',
            watchlists: ['departing'],
            criticality: 'high_impact',
            mfaEnabled: true,
          }),
          row({ id: 'user:bob@okta', watchlists: ['unrelated'], criticality: 'extreme_impact' }),
        ]
      );

      expect(context).toMatchObject({
        person_watchlists: ['departing', 'privileged'],
        person_criticality: 'high_impact',
        person_mfa_enabled: false,
      });
    });

    it('takes the group from the target when the agent names the target', () => {
      const context = contextOf(
        [agent({ id: 'ai_agent:a', personIds: ['user:alice@okta'] })],
        [
          row({ id: 'user:alice@okta' }),
          row({
            id: 'user:alice@entra_id',
            resolvedTo: 'user:alice@okta',
            watchlists: ['departing'],
          }),
        ]
      );

      expect(context?.person_watchlists).toEqual(['departing']);
    });

    it('reports MFA as on only when every known value is on', () => {
      const context = contextOf(
        [agent({ id: 'ai_agent:a', personIds: ['user:alice@okta', 'user:alice@entra_id'] })],
        [row({ id: 'user:alice@okta' }), row({ id: 'user:alice@entra_id', mfaEnabled: true })]
      );

      expect(context?.person_mfa_enabled).toBe(true);
    });

    it('leaves person facts empty when the persons are not in the store', () => {
      const context = contextOf(
        [agent({ id: 'ai_agent:a', personIds: ['user:gone@okta'], personEmails: ['gone@x.io'] })],
        []
      );

      expect(context).toMatchObject({
        person_watchlists: null,
        person_criticality: null,
        person_mfa_enabled: null,
      });
    });

    it('ignores criticality values it does not rank', () => {
      const context = contextOf(
        [agent({ id: 'ai_agent:a', personIds: ['user:alice@okta'] })],
        [row({ id: 'user:alice@okta', criticality: 'unassigned' })]
      );

      expect(context?.person_criticality).toBeNull();
    });
  });

  describe('host criticality', () => {
    it('reads the criticality of the host the agent depends on', () => {
      const context = contextOf(
        [agent({ id: 'ai_agent:a', hostIds: ['host:h1'] })],
        [row({ id: 'host:h1', criticality: 'high_impact' })]
      );

      expect(context?.host_criticality).toBe('high_impact');
    });

    it('is empty when the agent has no host or the host is not in the store', () => {
      const agents = [
        agent({ id: 'ai_agent:a' }),
        agent({ id: 'ai_agent:b', hostIds: ['host:x'] }),
      ];
      const contexts = computeAiAgentContexts({ agents, relatedRows: [], now: NOW });

      expect(contexts.get('ai_agent:a')?.host_criticality).toBeNull();
      expect(contexts.get('ai_agent:b')?.host_criticality).toBeNull();
    });
  });

  describe('shared account installs', () => {
    it('counts the other agents acting for the same person, by resolved ID or raw email', () => {
      const agents = [
        agent({ id: 'ai_agent:a', personIds: ['user:alice@okta'], personEmails: ['alice@x.io'] }),
        // Same person through an alias resolved to the same target.
        agent({ id: 'ai_agent:b', personIds: ['user:alice@entra_id'] }),
        // No IDs yet, same raw email in a different case.
        agent({ id: 'ai_agent:c', personEmails: ['Alice@X.io'] }),
        agent({ id: 'ai_agent:d', personIds: ['user:bob@okta'], personEmails: ['bob@x.io'] }),
        agent({ id: 'ai_agent:e' }),
      ];
      const contexts = computeAiAgentContexts({
        agents,
        relatedRows: [
          row({ id: 'user:alice@okta' }),
          row({ id: 'user:alice@entra_id', resolvedTo: 'user:alice@okta' }),
          row({ id: 'user:bob@okta' }),
        ],
        now: NOW,
      });

      expect(contexts.get('ai_agent:a')?.shared_account_installs).toBe(2);
      expect(contexts.get('ai_agent:b')?.shared_account_installs).toBe(1);
      expect(contexts.get('ai_agent:c')?.shared_account_installs).toBe(1);
      expect(contexts.get('ai_agent:d')?.shared_account_installs).toBe(0);
      expect(contexts.get('ai_agent:e')?.shared_account_installs).toBeNull();
    });
  });

  describe('stale values', () => {
    it('keeps the account but clears person and host facts when those rows disappear', () => {
      const context = contextOf(
        [agent({ id: 'ai_agent:a', personIds: ['user:alice@okta'], hostIds: ['host:h1'] })],
        []
      );

      expect(context).toMatchObject({
        person_watchlists: null,
        person_criticality: null,
        host_criticality: null,
        shared_account_installs: 0,
      });
    });

    it('writes every key, with null for the inputs that disappeared, so the update clears them', () => {
      const before = contextOf(
        [agent({ id: 'ai_agent:a', personIds: ['user:alice@okta'], hostIds: ['host:h1'] })],
        [
          row({ id: 'user:alice@okta', watchlists: ['departing'], criticality: 'high_impact' }),
          row({ id: 'host:h1', criticality: 'high_impact' }),
        ]
      );
      const after = contextOf([agent({ id: 'ai_agent:a' })], []);

      expect(before?.person_watchlists).toEqual(['departing']);
      expect(after && buildAiAgentContextUpdate('ai_agent:a', after)).toEqual({
        type: 'ai_agent',
        doc: {
          entity: {
            id: 'ai_agent:a',
            attributes: {
              ai_agent_context: {
                person_watchlists: null,
                person_criticality: null,
                person_mfa_enabled: null,
                host_criticality: null,
                shared_account_installs: null,
                computed_at: NOW,
              },
            },
          },
        },
      });
    });
  });
});
