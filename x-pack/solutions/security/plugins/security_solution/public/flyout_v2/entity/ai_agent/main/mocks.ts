/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AgentContext,
  AgentIdentity,
  AgentRow,
  RelatedEntity,
} from '../../../../entity_analytics/components/ai_security/types';

export const mockAgentIdentity: AgentIdentity = {
  entityId: 'ai_agent:claude_code@host-1@ec2-user',
  agentName: 'claude_code',
  hostId: 'host-1',
  userName: 'ec2-user',
};

export const mockAgentRow: AgentRow = {
  ...mockAgentIdentity,
  hostName: 'ci-build-01',
  version: '2.1.332',
  firstSeen: '2026-11-20T10:00:00.000Z',
  lastSeen: '2026-11-26T10:00:00.000Z',
  watchlistIds: [],
  accountEmails: ['avery.quinn@example.com'],
  accountIds: [],
  dependsOnIds: ['host:host-1'],
  dataSources: [],
};

export const mockRelatedRow = (
  overrides: Partial<RelatedEntity> & Pick<RelatedEntity, 'entityId' | 'engineType'>
): RelatedEntity => ({
  watchlistIds: [],
  resolvedTo: [],
  accountEmails: [],
  accountIds: [],
  ownsInferredIds: [],
  ...overrides,
});

export const mockAgentContext: AgentContext = {
  agent: mockAgentRow,
  host: mockRelatedRow({
    entityId: 'host:host-1',
    engineType: 'host',
    hostName: 'ci-build-01',
    criticality: 'high_impact',
    riskLevel: 'High',
  }),
  runsAs: mockRelatedRow({
    entityId: 'user:ec2-user@host-1@local',
    engineType: 'user',
    userName: 'ec2-user',
    namespace: 'local',
    riskLevel: 'Moderate',
  }),
  people: [
    {
      email: 'avery.quinn@example.com',
      rows: [
        mockRelatedRow({
          entityId: 'user:avery.quinn@example.com@entra_id',
          engineType: 'user',
          email: 'avery.quinn@example.com',
          mfaEnabled: false,
        }),
      ],
      primary: mockRelatedRow({
        entityId: 'user:avery.quinn@example.com@okta',
        engineType: 'user',
        email: 'avery.quinn@example.com',
        fullName: 'Avery Quinn',
        userName: 'avery.quinn@example.com',
      }),
      watchlistIds: ['departing-employees'],
    },
  ],
  otherAgentsOnHost: [
    mockRelatedRow({
      entityId: 'ai_agent:cursor@host-1@ec2-user',
      engineType: 'ai_agent',
      agentName: 'cursor',
      userName: 'ec2-user',
      hostId: 'host-1',
      hostName: 'ci-build-01',
    }),
  ],
  otherInstallsOnAccount: [
    mockRelatedRow({
      entityId: 'ai_agent:claude_code@host-2@aquinn',
      engineType: 'ai_agent',
      agentName: 'claude_code',
      userName: 'aquinn',
      hostId: 'host-2',
      hostName: 'dev-laptop-02',
      riskLevel: 'Low',
    }),
  ],
  signedInAs: 'avery.quinn@example.com',
  signedInAt: '2026-11-26T10:00:00.000Z',
};
