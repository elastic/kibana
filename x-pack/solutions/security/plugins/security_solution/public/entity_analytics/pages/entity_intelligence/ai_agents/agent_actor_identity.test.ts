/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Sha256 } from '@kbn/crypto-browser';
import { resolveAgentActor } from './agent_actor_identity';
import type { AgentConversationResponse, AgentConversationRound } from './agent_conversations';
import { getConversationReferenceAliases } from './agent_conversations';
import type { AgentInvocation, AgentRuntimeAttribution } from './types';

const authorId = 'profile-alice';
const authorHash = new Sha256().update(authorId, 'utf8').digest('hex').slice(0, 16);
const attribution: AgentRuntimeAttribution = {
  status: 'partial',
  source: 'kibana_authc',
  capturePoint: 'request',
  initiatingActor: { hash: authorHash, source: 'kibana_authc' },
  caller: { type: 'user', hash: authorHash },
  delegationStatus: 'unknown',
  downstreamCredentialStatus: 'unknown',
};
const invocation: AgentInvocation = {
  id: 'trace:agent-span',
  traceId: 'trace',
  spanId: 'agent-span',
  timestamp: '2026-10-13T12:00:00Z',
  outcome: 'success',
  source: { index: 'traces', id: 'agent-doc' },
  conversationReference: 'conversation-id',
  attribution,
};
const round: AgentConversationRound = {
  id: 'round-one',
  trace_id: 'trace',
  author: { id: authorId, username: 'alice', full_name: 'Alice Example' },
  input: { message: 'Private source prompt' },
  response: { message: 'Private source response' },
  steps: [{ type: 'reasoning', params: { reasoning: 'Private source reasoning' } }],
};
const conversation: AgentConversationResponse = {
  id: 'conversation-id',
  agent_id: 'agent',
  title: 'Private conversation title',
  rounds: [round],
};

it('resolves a matching pseudonymous authenticated actor through exact conversation and round evidence', () => {
  expect(resolveAgentActor(conversation, invocation)).toEqual({
    id: authorId,
    name: 'Alice Example',
    username: 'alice',
    provenance: 'conversation_author',
    conversationId: 'conversation-id',
    roundId: 'round-one',
  });
});

it('supports raw profile IDs and matching simultaneous raw and hashed actor IDs', () => {
  for (const initiatingActor of [
    { id: authorId, source: 'kibana_authc' },
    { id: authorId, hash: authorHash, source: 'kibana_authc' },
  ]) {
    expect(
      resolveAgentActor(conversation, {
        ...invocation,
        attribution: { ...attribution, initiatingActor },
      })?.name
    ).toBe('Alice Example');
  }
});

it('matches privacy-normalized conversation IDs and round trace arrays', () => {
  expect(
    resolveAgentActor(
      { ...conversation, rounds: [{ ...round, trace_id: ['previous-trace', 'trace'] }] },
      {
        ...invocation,
        conversationReference: getConversationReferenceAliases(conversation.id)[1],
      }
    )?.roundId
  ).toBe('round-one');
});

it('uses a nonblank full name or username without returning raw conversation content', () => {
  const result = resolveAgentActor(
    {
      ...conversation,
      rounds: [{ ...round, author: { id: authorId, username: ' alice ', full_name: '  ' } }],
    },
    invocation
  );
  expect(result?.name).toBe('alice');
  expect(result?.username).toBe('alice');
  expect(JSON.stringify(result)).not.toContain('Private');
  expect(
    resolveAgentActor(
      {
        ...conversation,
        rounds: [{ ...round, author: { id: authorId, full_name: ' Alice Example ' } }],
      },
      invocation
    )
  ).toEqual(expect.objectContaining({ name: 'Alice Example' }));
});

it.each([
  { source: undefined },
  { source: 'untrusted_source' },
  { status: 'unavailable' as const },
  { initiatingActor: undefined },
  { initiatingActor: { hash: authorHash } },
  { initiatingActor: { hash: authorHash, source: 'untrusted_source' } },
  { caller: undefined },
  { caller: { type: 'api_key', apiKeyId: 'key-id' } },
  { caller: { type: 'service_account', id: 'elastic/automation' } },
  { caller: { type: 'anonymous' } },
  { caller: { type: 'user', apiKeyId: 'key-id' } },
  { caller: { type: 'user', apiKeyHash: 'key-hash' } },
])('rejects incomplete or untrusted attribution: %j', (fields) => {
  expect(
    resolveAgentActor(conversation, {
      ...invocation,
      attribution: { ...attribution, ...fields },
    })
  ).toBeUndefined();
});

it('requires explicit initiating actor evidence rather than a reported user or current caller', () => {
  expect(
    resolveAgentActor(conversation, {
      ...invocation,
      attribution: undefined,
      reportedUser: { id: authorId, name: 'Alice Example' },
    })
  ).toBeUndefined();
  expect(
    resolveAgentActor(conversation, {
      ...invocation,
      attribution: {
        ...attribution,
        initiatingActor: undefined,
        caller: { type: 'user', id: authorId },
      },
    })
  ).toBeUndefined();
});

it.each([
  { id: 'other-profile' },
  { hash: 'other-hash' },
  { id: authorId, hash: 'other-hash' },
  { id: 'other-profile', hash: authorHash },
  { id: '', hash: authorHash },
  { id: authorId, hash: '' },
  { name: 'Alice Example' },
])('rejects absent or conflicting actor identifiers: %j', (identity) => {
  expect(
    resolveAgentActor(conversation, {
      ...invocation,
      attribution: {
        ...attribution,
        initiatingActor: { ...identity, source: 'kibana_authc' },
      },
    })
  ).toBeUndefined();
});

it.each(['wrong-conversation', undefined, ''])(
  'rejects an unrelated conversation reference: %s',
  (conversationReference) => {
    expect(
      resolveAgentActor(conversation, { ...invocation, conversationReference })
    ).toBeUndefined();
  }
);

it('requires exactly one round with the matching trace', () => {
  expect(resolveAgentActor({ ...conversation, rounds: [] }, invocation)).toBeUndefined();
  expect(
    resolveAgentActor(
      { ...conversation, rounds: [{ ...round, trace_id: 'another-trace' }] },
      invocation
    )
  ).toBeUndefined();
  expect(
    resolveAgentActor(
      { ...conversation, rounds: [round, { ...round, id: 'round-two' }] },
      invocation
    )
  ).toBeUndefined();
  expect(
    resolveAgentActor({ ...conversation, rounds: [{ ...round, trace_id: undefined }] }, invocation)
  ).toBeUndefined();
});

it('does not pick another round author or substitute a conversation owner for a mismatched author', () => {
  const ownerRound = { ...round, author: { id: 'profile-owner', username: 'owner' } };
  expect(
    resolveAgentActor(
      {
        ...conversation,
        rounds: [ownerRound, { ...round, id: 'other-round', trace_id: 'other-trace' }],
      },
      invocation
    )
  ).toBeUndefined();
});

it.each([
  { author: undefined },
  { author: { id: authorId } },
  { author: { id: authorId, username: ' ', full_name: '\t' } },
  { author: { id: '', username: 'alice' } },
  { author: { id: ' ', username: 'alice' } },
  { origin: { type: 'slack' } },
  { origin: { type: 'unrecognized-external-system' } },
  { id: '' },
])('rejects an author without sufficient evidence: %j', (fields) => {
  expect(
    resolveAgentActor({ ...conversation, rounds: [{ ...round, ...fields }] }, invocation)
  ).toBeUndefined();
});

it('rejects blank trace and conversation identifiers', () => {
  expect(resolveAgentActor(conversation, { ...invocation, traceId: '' })).toBeUndefined();
  expect(
    resolveAgentActor({ ...conversation, id: '' }, { ...invocation, conversationReference: '' })
  ).toBeUndefined();
});

it('leaves the recorded pseudonym and conversation evidence unchanged', () => {
  const beforeConversation = JSON.stringify(conversation);
  const beforeInvocation = JSON.stringify(invocation);
  resolveAgentActor(conversation, invocation);
  expect(JSON.stringify(conversation)).toBe(beforeConversation);
  expect(JSON.stringify(invocation)).toBe(beforeInvocation);
  expect(invocation.attribution?.initiatingActor).toEqual({
    hash: authorHash,
    source: 'kibana_authc',
  });
});
