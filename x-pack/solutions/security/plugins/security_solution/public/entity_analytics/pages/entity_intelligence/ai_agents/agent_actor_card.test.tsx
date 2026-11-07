/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { AgentActorCard } from './agent_actor_card';
import type { AgentResolvedActor } from './agent_actor_identity';
import type { AgentInvocation } from './types';

const invocation: AgentInvocation = {
  id: 'trace:span',
  traceId: 'trace',
  spanId: 'span',
  timestamp: '2026-10-13T12:00:00Z',
  outcome: 'success',
  source: { index: 'traces-agent_builder.otel-default', id: 'event' },
  attribution: {
    status: 'partial',
    source: 'kibana_authc',
    initiatingActor: { hash: '0123456789abcdef', source: 'kibana_authc' },
    caller: { type: 'user' },
    delegationStatus: 'unknown',
    downstreamCredentialStatus: 'unknown',
  },
};
const resolvedActor: AgentResolvedActor = {
  id: 'u_request_author_0',
  name: 'Request Author',
  username: 'request.author',
  provenance: 'conversation_author',
  conversationId: 'conversation',
  roundId: 'round',
};

it('shows the matched author and makes the original identity evidence inspectable', () => {
  render(<AgentActorCard invocation={invocation} resolvedActor={resolvedActor} />);
  const actor = screen.getByRole('button', { name: 'Inspect Initiating actor: Request Author' });
  expect(actor).not.toHaveTextContent('0123456789abcdef');
  fireEvent.click(actor);
  const evidence = screen.getByRole('dialog');
  expect(within(evidence).getByText('request.author')).toBeInTheDocument();
  expect(within(evidence).getByText('u_request_author_0')).toBeInTheDocument();
  expect(within(evidence).getByText('0123456789abcdef')).toBeInTheDocument();
  expect(evidence).toHaveTextContent('matches the authenticated actor');
});

it('identifies an unresolved reference without displaying it as a person name', () => {
  render(<AgentActorCard invocation={invocation} />);
  const actor = screen.getByRole('button', { name: 'Inspect Initiating actor: Name not resolved' });
  expect(actor).not.toHaveTextContent('0123456789abcdef');
  fireEvent.click(actor);
  expect(screen.getByRole('dialog')).toHaveTextContent(
    'current viewer are not used as substitutes'
  );
});

it('hides a previous match while access is being rechecked', () => {
  render(<AgentActorCard invocation={invocation} resolvedActor={resolvedActor} isLoading />);
  fireEvent.click(
    screen.getByRole('button', { name: 'Inspect Initiating actor: Resolving user…' })
  );
  expect(screen.getByRole('dialog')).not.toHaveTextContent('Request Author');
  expect(screen.getByRole('dialog')).not.toHaveTextContent('u_request_author_0');
});

it('uses a name recorded directly in the trace without inventing a profile match', () => {
  render(
    <AgentActorCard
      invocation={{
        ...invocation,
        attribution: {
          status: 'partial',
          source: 'kibana_authc',
          initiatingActor: { name: 'recorded.user', source: 'kibana_authc' },
          caller: { type: 'user' },
          delegationStatus: 'unknown',
          downstreamCredentialStatus: 'unknown',
        },
      }}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'Inspect Initiating actor: recorded.user' }));
  expect(screen.getByRole('dialog')).toHaveTextContent('recorded directly in the execution trace');
  expect(screen.getByRole('dialog')).not.toHaveTextContent('Matched profile ID');
});

it('keeps an API-key caller distinct from a human initiator', () => {
  render(
    <AgentActorCard
      invocation={{
        ...invocation,
        attribution: {
          status: 'partial',
          source: 'kibana_authc',
          caller: { type: 'api_key', hash: 'api-key-hash' },
          delegationStatus: 'unknown',
          downstreamCredentialStatus: 'unknown',
        },
      }}
    />
  );
  expect(
    screen.getByRole('button', { name: 'Inspect Kibana caller: API key' })
  ).toBeInTheDocument();
  expect(screen.queryByText('Initiating actor')).not.toBeInTheDocument();
});
