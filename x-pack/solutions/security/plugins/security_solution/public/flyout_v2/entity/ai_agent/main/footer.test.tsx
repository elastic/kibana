/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { useIsInSecurityApp } from '../../../../common/hooks/is_in_security_app';
import { ENTITY_PROMPT } from '../../../../agent_builder/components/prompts';
import { mockAgentIdentity, mockAgentRow } from './mocks';
import { buildAgentEntityAttachment } from './chat_attachments';
import { useKillProcessItems } from './hooks/use_kill_process_items';
import { buildAgentTimelineQuery, Footer } from './footer';

const mockOpenChat = jest.fn();

jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: () => ({ services: { agentBuilder: { openChat: mockOpenChat } } }),
}));

jest.mock('../../../../common/hooks/is_in_security_app', () => ({
  useIsInSecurityApp: jest.fn(() => true),
}));

jest.mock('./hooks/use_kill_process_items', () => ({
  useKillProcessItems: jest.fn(() => () => [<div key="kill" data-test-subj="mockKillProcess" />]),
}));

jest.mock('../../../../agent_builder/components/new_agent_builder_attachment', () => ({
  NewAgentBuilderAttachment: ({ onClick }: { onClick: () => void }) => (
    <button type="button" data-test-subj="mockAddToChat" onClick={onClick}>
      {'Add to chat'}
    </button>
  ),
}));

jest.mock('../../shared/components/take_action', () => ({
  TakeAction: ({
    kqlQuery,
    isDisabled,
    additionalItems,
  }: {
    kqlQuery: string;
    isDisabled?: boolean;
    additionalItems?: (closePopover: () => void) => React.ReactElement[];
  }) => (
    <div data-test-subj="mockTakeAction" data-disabled={String(!!isDisabled)}>
      {kqlQuery}
      {additionalItems?.(() => {})}
    </div>
  ),
}));

describe('buildAgentTimelineQuery', () => {
  it("matches the install's agent, host ID and OS user", () => {
    expect(buildAgentTimelineQuery(mockAgentIdentity)).toBe(
      'process.ai_agent.name: "claude_code" and host.id: "host-1" and user.name: "ec2-user"'
    );
  });

  it('escapes quotes and backslashes in values', () => {
    expect(
      buildAgentTimelineQuery({ ...mockAgentIdentity, userName: 'CORP\\build "svc"' })
    ).toContain('user.name: "CORP\\\\build \\"svc\\""');
  });
});

describe('Footer', () => {
  beforeEach(() => jest.clearAllMocks());

  it('investigates the install in Timeline', () => {
    render(<Footer identity={mockAgentIdentity} />);
    const takeAction = screen.getByTestId('mockTakeAction');
    expect(takeAction).toHaveTextContent(buildAgentTimelineQuery(mockAgentIdentity));
    expect(takeAction).toHaveAttribute('data-disabled', 'false');
  });

  it('is disabled outside the Security app', () => {
    jest.mocked(useIsInSecurityApp).mockReturnValueOnce(false);
    render(<Footer identity={mockAgentIdentity} />);
    expect(screen.getByTestId('mockTakeAction')).toHaveAttribute('data-disabled', 'true');
  });

  it('adds the agent to a new chat with the entity attachment and the risk prompt', () => {
    render(<Footer identity={mockAgentIdentity} agent={mockAgentRow} />);
    fireEvent.click(screen.getByTestId('mockAddToChat'));
    expect(mockOpenChat).toHaveBeenCalledWith({
      newConversation: true,
      initialMessage: ENTITY_PROMPT,
      attachments: [buildAgentEntityAttachment(mockAgentIdentity, mockAgentRow)],
      sessionTag: 'security',
    });
  });

  it('puts Kill process for the running sessions in Take action', () => {
    render(<Footer identity={mockAgentIdentity} runningSessions={[]} />);
    expect(useKillProcessItems).toHaveBeenCalledWith([]);
    expect(screen.getByTestId('mockKillProcess')).toBeInTheDocument();
  });
});
