/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { TestProviders } from '../../../../../common/mock';
import { useFlyoutApi } from '../../../../use_flyout_api';
import { createFlyoutApiMock } from '../../../../use_flyout_api.mock';
import { useAiAgentActivity } from '../../../../../entity_analytics/components/ai_agents/hooks/use_ai_agents';
import type { AgentActivityResult } from '../../../../../entity_analytics/components/ai_agents/hooks/use_ai_agents';
import { buildAgentActivity } from '../../../../../entity_analytics/components/ai_agents/activity/build_agent_activity';
import type { ProcessRecord } from '../../../../../entity_analytics/components/ai_agents/activity/types';
import type { AgentIdentity } from '../../../../../entity_analytics/components/ai_agents/types';
import { AgentActivity } from './agent_activity';
import { AI_AGENT_TEST_IDS } from '../test_ids';

jest.mock('../../../../use_flyout_api');
jest.mock('../../../../../entity_analytics/components/ai_agents/hooks/use_ai_agents');

const claude: AgentIdentity = {
  entityId: 'ai_agent:claude_code@host-1@ec2-user',
  agentName: 'claude_code',
  hostId: 'host-1',
  userName: 'ec2-user',
};
const cursor: AgentIdentity = {
  ...claude,
  entityId: 'ai_agent:cursor@host-1@ec2-user',
  agentName: 'cursor',
};

const proc = (overrides: Partial<ProcessRecord> & { entityId: string }): ProcessRecord => ({
  timestamp: '2026-11-26T10:00:00.000Z',
  ancestry: [],
  unorderedArgs: [],
  isDescendant: true,
  hasExec: true,
  userName: 'ec2-user',
  ...overrides,
});

const mockActivity = (activity: Omit<AgentActivityResult, 'otelFailed'>) =>
  jest.mocked(useAiAgentActivity).mockReturnValue({
    data: { ...activity, otelFailed: false },
    isLoading: false,
    isError: false,
  } as unknown as ReturnType<typeof useAiAgentActivity>);

const renderActivity = (agent: AgentIdentity = claude) =>
  render(
    <TestProviders>
      <AgentActivity agent={agent} />
    </TestProviders>
  );

describe('AgentActivity', () => {
  let flyoutApi: ReturnType<typeof createFlyoutApiMock>;

  beforeEach(() => {
    flyoutApi = createFlyoutApiMock();
    jest.mocked(useFlyoutApi).mockReturnValue(flyoutApi);
  });

  it('shows a note with a gaps link for each missing layer of a Defend-only Claude agent', () => {
    mockActivity(
      buildAgentActivity({
        identity: claude,
        ownEvents: [proc({ entityId: 'agent', isDescendant: false, interactive: true })],
        descendantEvents: [proc({ entityId: 'git', parentEntityId: 'agent', name: 'git' })],
        sideEffects: new Map(),
        otelEvents: [],
        otelMatch: 'none',
      })
    );
    renderActivity();

    expect(screen.getByTestId(AI_AGENT_TEST_IDS.missingSessionId)).toHaveTextContent(
      'Defend reports no session ID'
    );
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.missingToolCalls)).toHaveTextContent(
      'Tool calls are not collected for this agent.'
    );
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.missingPrompts)).toHaveTextContent(
      'Prompts are not collected for this agent.'
    );
    expect(
      screen.getByTestId(`${AI_AGENT_TEST_IDS.gapLink}-claude_session_id_unmapped`)
    ).toBeInTheDocument();
    expect(
      screen.getAllByTestId(`${AI_AGENT_TEST_IDS.gapLink}-claude_otel_not_collected`)
    ).toHaveLength(2);
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.missingInteractivePrompt)).toBeInTheDocument();
    expect(screen.getAllByTestId(AI_AGENT_TEST_IDS.run)).toHaveLength(1);
  });

  it('opens the gaps row behind a note', () => {
    mockActivity(
      buildAgentActivity({
        identity: claude,
        ownEvents: [proc({ entityId: 'agent', isDescendant: false })],
        descendantEvents: [],
        sideEffects: new Map(),
        otelEvents: [],
        otelMatch: 'none',
      })
    );
    renderActivity();

    fireEvent.click(screen.getByTestId(`${AI_AGENT_TEST_IDS.gapLink}-claude_session_id_unmapped`));
    expect(
      screen.getByText('Defend Claude session ID unmapped in package 9.6.1')
    ).toBeInTheDocument();
  });

  it('points Cursor notes at the Cursor gaps rows', () => {
    mockActivity(
      buildAgentActivity({
        identity: cursor,
        ownEvents: [proc({ entityId: 'agent', isDescendant: false })],
        descendantEvents: [],
        sideEffects: new Map(),
        otelEvents: [],
        otelMatch: 'none',
      })
    );
    renderActivity(cursor);

    expect(
      screen.getByTestId(`${AI_AGENT_TEST_IDS.gapLink}-cursor_no_session_id`)
    ).toBeInTheDocument();
    expect(
      screen.getAllByTestId(`${AI_AGENT_TEST_IDS.gapLink}-cursor_no_prompt_source`)
    ).toHaveLength(2);
  });

  it('shows a step with no name or command line instead of hiding it', () => {
    mockActivity(
      buildAgentActivity({
        identity: claude,
        ownEvents: [proc({ entityId: 'agent', isDescendant: false, commandLine: 'claude' })],
        descendantEvents: [proc({ entityId: 'bare', parentEntityId: 'agent', hasExec: false })],
        sideEffects: new Map(),
        otelEvents: [],
        otelMatch: 'none',
      })
    );
    renderActivity();

    expect(screen.getByText('Process with no name or command line recorded')).toBeInTheDocument();
  });

  it('shows the headless prompt, sessions and OTel steps, with no missing-layer notes', () => {
    mockActivity(
      buildAgentActivity({
        identity: claude,
        ownEvents: [
          proc({
            entityId: 'agent',
            isDescendant: false,
            commandLine: 'claude -p Restart nginx --output-format json',
          }),
        ],
        descendantEvents: [
          proc({
            entityId: 'sudo',
            parentEntityId: 'gone',
            ancestry: ['agent'],
            userName: 'root',
            commandLine: 'sudo systemctl restart nginx',
            sessionId: 'session-1',
          }),
        ],
        sideEffects: new Map(),
        otelEvents: [
          {
            timestamp: '2026-11-26T10:00:01.000Z',
            conversationId: 'session-1',
            eventName: 'user_prompt',
            prompt: 'Restart nginx',
            isMock: true,
          },
          {
            timestamp: '2026-11-26T10:00:02.000Z',
            conversationId: 'session-1',
            eventName: 'tool_result',
            toolName: 'Bash',
            commandLine: 'sudo systemctl restart nginx',
            isMock: true,
          },
        ],
        otelMatch: 'session',
      })
    );
    renderActivity();

    expect(screen.getByTestId(AI_AGENT_TEST_IDS.headlessPrompt)).toHaveTextContent('Restart nginx');
    expect(screen.getByText('Ran as root')).toBeInTheDocument();
    expect(screen.getByText('Agent session session-1')).toBeInTheDocument();
    expect(screen.getByText('Tool call: Bash')).toBeInTheDocument();
    expect(screen.getAllByText('Mock data')).toHaveLength(2);
    expect(screen.queryByTestId(AI_AGENT_TEST_IDS.missingSessionId)).not.toBeInTheDocument();
    expect(screen.queryByTestId(AI_AGENT_TEST_IDS.missingToolCalls)).not.toBeInTheDocument();
    expect(screen.queryByTestId(AI_AGENT_TEST_IDS.missingPrompts)).not.toBeInTheDocument();
  });

  it('hides setup commands behind a toggle and counts them', () => {
    mockActivity(
      buildAgentActivity({
        identity: claude,
        ownEvents: [proc({ entityId: 'agent', isDescendant: false })],
        descendantEvents: [
          proc({ entityId: 'env', parentEntityId: 'agent', name: 'env', commandLine: 'env' }),
          proc({ entityId: 'npm', parentEntityId: 'agent', commandLine: 'npm test' }),
        ],
        sideEffects: new Map(),
        otelEvents: [],
        otelMatch: 'none',
      })
    );
    renderActivity();

    expect(screen.getByText('npm test')).toBeInTheDocument();
    expect(screen.queryByText('env')).not.toBeInTheDocument();
    expect(screen.getByText('1 setup command hidden')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId(AI_AGENT_TEST_IDS.setupToggle));
    expect(screen.getByText('env')).toBeInTheDocument();
  });

  it('opens Session View on the step terminal session, jumping to its process', () => {
    mockActivity(
      buildAgentActivity({
        identity: claude,
        ownEvents: [proc({ entityId: 'agent', isDescendant: false })],
        descendantEvents: [
          proc({
            entityId: 'npm',
            parentEntityId: 'agent',
            commandLine: 'npm test',
            documentId: 'doc-1',
            index: '.ds-logs-endpoint.events.process-default',
            entryLeaderEntityId: 'leader-1',
            entryLeaderStart: '2026-11-26T09:00:00.000Z',
          }),
        ],
        sideEffects: new Map(),
        otelEvents: [],
        otelMatch: 'none',
      })
    );
    renderActivity();

    fireEvent.click(screen.getByTestId(AI_AGENT_TEST_IDS.sessionViewLink));
    expect(flyoutApi.openSessionView).toHaveBeenCalledWith(
      expect.objectContaining({ jumpToEntityId: 'npm' })
    );
    const [{ hit }] = flyoutApi.openSessionView.mock.calls[0];
    expect(hit.flattened['process.entry_leader.entity_id']).toEqual(['leader-1']);
  });

  it('warns when Defend has no process events for the agent', () => {
    mockActivity(
      buildAgentActivity({
        identity: claude,
        ownEvents: [],
        descendantEvents: [],
        sideEffects: new Map(),
        otelEvents: [],
        otelMatch: 'none',
      })
    );
    renderActivity();

    expect(screen.getByTestId(AI_AGENT_TEST_IDS.missingDefend)).toBeInTheDocument();
  });

  it('lists steps that could not be tied to a run', () => {
    mockActivity(
      buildAgentActivity({
        identity: claude,
        ownEvents: [proc({ entityId: 'agent', isDescendant: false })],
        descendantEvents: [proc({ entityId: 'orphan', parentEntityId: 'gone', commandLine: 'ls' })],
        sideEffects: new Map(),
        otelEvents: [],
        otelMatch: 'none',
      })
    );
    renderActivity();

    expect(screen.getByTestId(AI_AGENT_TEST_IDS.unplacedSteps)).toHaveTextContent('ls');
  });
});
