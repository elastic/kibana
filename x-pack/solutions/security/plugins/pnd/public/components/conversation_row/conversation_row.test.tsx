/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import type { PndConversation } from '@kbn/pnd-common';
import { renderWithPndProviders } from '../test_utils/render_with_pnd_providers';
import { ConversationRow } from './conversation_row';
import * as i18n from './translations';

const conversation: PndConversation = {
  correlationId: 'ad-alert-1',
  createdAt: '2026-08-03T17:14:00.000Z',
  id: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
  kind: 'investigation',
  title: 'Suspicious PowerShell on host-1',
  updatedAt: '2026-08-03T17:31:00.000Z',
};

describe('ConversationRow', () => {
  it('renders the row with the conversation id, so a list can be targeted per row', () => {
    renderWithPndProviders(<ConversationRow conversation={conversation} />);

    expect(screen.getByTestId('pndConversationRow')).toHaveAttribute(
      'data-conversation-id',
      conversation.id
    );
  });

  it('renders the title', () => {
    renderWithPndProviders(<ConversationRow conversation={conversation} />);

    expect(screen.getByTestId('pndConversationRowTitle')).toHaveTextContent(conversation.title);
  });

  it('renders the kind badge', () => {
    renderWithPndProviders(<ConversationRow conversation={conversation} />);

    expect(screen.getByTestId('pndConversationKindBadge')).toHaveAttribute(
      'data-kind',
      'investigation'
    );
  });

  it('renders the attack discovery alert id', () => {
    renderWithPndProviders(<ConversationRow conversation={conversation} />);

    expect(screen.getByTestId('pndConversationRowAttackDiscoveryAlertId')).toHaveTextContent(
      'ad-alert-1'
    );
  });

  it('renders the conversation id', () => {
    renderWithPndProviders(<ConversationRow conversation={conversation} />);

    expect(screen.getByTestId('pndConversationRowId')).toHaveTextContent(conversation.id);
  });

  it('renders createdAt as a machine-readable timestamp', () => {
    renderWithPndProviders(<ConversationRow conversation={conversation} />);

    expect(screen.getByTestId('pndConversationRowCreatedAt')).toHaveAttribute(
      'datetime',
      conversation.createdAt
    );
  });

  it('renders updatedAt as a machine-readable timestamp', () => {
    renderWithPndProviders(<ConversationRow conversation={conversation} />);

    expect(screen.getByTestId('pndConversationRowUpdatedAt')).toHaveAttribute(
      'datetime',
      conversation.updatedAt
    );
  });

  it('renders all six projected fields', () => {
    renderWithPndProviders(<ConversationRow conversation={conversation} />);

    ['Title', 'KindBadge', 'AttackDiscoveryAlertId', 'Id', 'CreatedAt', 'UpdatedAt'].forEach(
      (field) => {
        const testSubj =
          field === 'KindBadge' ? 'pndConversationKindBadge' : `pndConversationRow${field}`;
        expect(screen.getByTestId(testSubj)).toBeInTheDocument();
      }
    );
  });

  it('opens the conversation when the title is clicked', () => {
    const onOpen = jest.fn();
    renderWithPndProviders(<ConversationRow conversation={conversation} onOpen={onOpen} />);

    fireEvent.click(screen.getByTestId('pndConversationRowTitle'));

    expect(onOpen).toHaveBeenCalledWith(conversation);
  });

  it('renders the title as a button only when it can be opened', () => {
    renderWithPndProviders(<ConversationRow conversation={conversation} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders the title as a real link when given an href, so Cmd+click opens a new tab', () => {
    renderWithPndProviders(
      <ConversationRow
        conversation={conversation}
        href="/app/agent_builder/conversations/3f2504e0-4f89-11d3-9a0c-0305e82c3301"
      />
    );

    expect(screen.getByTestId('pndConversationRowTitle')).toHaveAttribute(
      'href',
      '/app/agent_builder/conversations/3f2504e0-4f89-11d3-9a0c-0305e82c3301'
    );
  });

  it('prefers the in-app handler over the href on a plain click', () => {
    const onOpen = jest.fn();
    renderWithPndProviders(
      <ConversationRow conversation={conversation} href="/app/agent_builder" onOpen={onOpen} />
    );

    const clicked = fireEvent.click(screen.getByTestId('pndConversationRowTitle'));

    expect(onOpen).toHaveBeenCalledWith(conversation);
    expect(clicked).toBe(false); // preventDefault() was called, so the browser did not navigate
  });

  it('lets the href navigate when there is no in-app handler', () => {
    renderWithPndProviders(
      <ConversationRow conversation={conversation} href="/app/agent_builder" />
    );

    expect(fireEvent.click(screen.getByTestId('pndConversationRowTitle'))).toBe(true);
  });

  it('falls back to an explicit untitled label rather than rendering a blank row', () => {
    renderWithPndProviders(<ConversationRow conversation={{ ...conversation, title: '   ' }} />);

    expect(screen.getByTestId('pndConversationRowTitle')).toHaveTextContent(/untitled/i);
  });

  it('renders a tuning conversation, the kind Phase 4 adds', () => {
    renderWithPndProviders(
      <ConversationRow
        conversation={{ ...conversation, kind: 'tuning' as PndConversation['kind'] }}
      />
    );

    expect(screen.getByTestId('pndConversationKindBadge')).toHaveAttribute('data-kind', 'tuning');
  });

  it('renders a thread conversation, the kind a parked HITL gate adds', () => {
    renderWithPndProviders(
      <ConversationRow
        conversation={{
          ...conversation,
          gateId: 'apply_tuning',
          kind: 'thread' as PndConversation['kind'],
        }}
      />
    );

    expect(screen.getByTestId('pndConversationKindBadge')).toHaveAttribute('data-kind', 'thread');
  });

  it('renders the gate a thread belongs to, which is the only thing that says which proposal it is', () => {
    renderWithPndProviders(
      <ConversationRow conversation={conversation} gate="Apply a rule tuning" />
    );

    expect(screen.getByTestId('pndConversationRowGate')).toHaveTextContent('Apply a rule tuning');
  });

  it('labels the gate, so the value is not an unexplained string in the row', () => {
    renderWithPndProviders(
      <ConversationRow conversation={conversation} gate="Apply a rule tuning" />
    );

    expect(screen.getByTestId('pndConversationRowGate').parentElement).toHaveTextContent(
      `${i18n.GATE}: Apply a rule tuning`
    );
  });

  it('renders no gate line for a conversation that has no gate', () => {
    renderWithPndProviders(<ConversationRow conversation={conversation} />);

    expect(screen.queryByTestId('pndConversationRowGate')).not.toBeInTheDocument();
  });

  it('renders a "view lifecycle" action when the row can open one', () => {
    renderWithPndProviders(
      <ConversationRow conversation={conversation} onViewLifecycle={jest.fn()} />
    );

    expect(screen.getByTestId('pndConversationRowViewLifecycle')).toBeInTheDocument();
  });

  it('opens the lifecycle when the action is clicked', () => {
    const onViewLifecycle = jest.fn();
    renderWithPndProviders(
      <ConversationRow conversation={conversation} onViewLifecycle={onViewLifecycle} />
    );

    fireEvent.click(screen.getByTestId('pndConversationRowViewLifecycle'));

    expect(onViewLifecycle).toHaveBeenCalledTimes(1);
  });

  it('renders no lifecycle action when there is no lifecycle to open', () => {
    renderWithPndProviders(<ConversationRow conversation={conversation} />);

    expect(screen.queryByTestId('pndConversationRowViewLifecycle')).not.toBeInTheDocument();
  });

  it('names the lifecycle action after its conversation, so a list of rows is navigable by name', () => {
    renderWithPndProviders(
      <ConversationRow conversation={conversation} onViewLifecycle={jest.fn()} />
    );

    expect(screen.getByTestId('pndConversationRowViewLifecycle')).toHaveAccessibleName(
      i18n.viewLifecycleAriaLabel(conversation.title)
    );
  });

  it('never offers rename or delete, which require access: owner and would 404 for an analyst', () => {
    renderWithPndProviders(
      <ConversationRow
        conversation={conversation}
        href="/app/agent_builder"
        onOpen={jest.fn()}
        onViewLifecycle={jest.fn()}
      />
    );

    expect(screen.queryByText(/rename|delete/i)).not.toBeInTheDocument();
  });
});
