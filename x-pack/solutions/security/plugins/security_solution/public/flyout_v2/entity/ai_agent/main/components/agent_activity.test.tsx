/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { TestProviders } from '../../../../../common/mock';
import { useFlyoutApi } from '../../../../use_flyout_api';
import { createFlyoutApiMock } from '../../../../use_flyout_api.mock';
import { useAiAgentActivity } from '../../../../../entity_analytics/components/ai_security/hooks/use_ai_agents';
import type { AgentActivityResult } from '../../../../../entity_analytics/components/ai_security/hooks/use_ai_agents';
import { buildAgentActivity } from '../../../../../entity_analytics/components/ai_security/activity/build_agent_activity';
import type { ProcessRecord } from '../../../../../entity_analytics/components/ai_security/activity/types';
import type { AgentIdentity } from '../../../../../entity_analytics/components/ai_security/types';
import { AgentActivity } from './agent_activity';
import { AI_AGENT_TEST_IDS } from '../test_ids';

jest.mock('../../../../use_flyout_api');
jest.mock('../../../../../entity_analytics/components/ai_security/hooks/use_ai_agents');

const claude: AgentIdentity = {
  entityId: 'ai_agent:claude_code@host-1@ec2-user',
  agentName: 'claude_code',
  hostId: 'host-1',
  userName: 'ec2-user',
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

  it('shows a Defend-only run without notes about missing layers', () => {
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

    expect(screen.getAllByTestId(AI_AGENT_TEST_IDS.run)).toHaveLength(1);
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.activity)).not.toHaveTextContent('not collected');
    expect(screen.queryByTestId(AI_AGENT_TEST_IDS.headlessPrompt)).not.toBeInTheDocument();
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

  it('shows the headless prompt, sessions and OTel steps', () => {
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

    expect(screen.getByTestId(AI_AGENT_TEST_IDS.headlessPrompt)).toHaveTextContent(
      'PromptRestart nginx'
    );
    expect(screen.getByText('claude -p … --output-format json')).toBeInTheDocument();
    expect(screen.queryByTestId(`${AI_AGENT_TEST_IDS.step}-prompt`)).not.toBeInTheDocument();
    expect(screen.getByText('Agent session session-1')).toBeInTheDocument();
    expect(screen.getByText('Tool call: Bash')).toBeInTheDocument();
    const processes = screen.getByTestId(AI_AGENT_TEST_IDS.toolCallProcesses);
    expect(within(processes).getByText('sudo systemctl restart nginx')).toBeInTheDocument();
    expect(within(processes).getByText('Ran as root')).toBeInTheDocument();
    expect(screen.queryAllByTestId(`${AI_AGENT_TEST_IDS.step}-process`)).toHaveLength(0);
    expect(screen.queryByText('Mock data')).not.toBeInTheDocument();
  });

  it('nests the processes a tool call ran and drops the tool shell around them', () => {
    mockActivity(
      buildAgentActivity({
        identity: claude,
        ownEvents: [proc({ entityId: 'agent', isDescendant: false, sessionId: 'session-1' })],
        descendantEvents: [
          proc({
            entityId: 'shell',
            parentEntityId: 'agent',
            commandLine:
              "bash -c source /home/ec2-user/.claude/shell-snapshots/snapshot.sh && eval 'npm test' < /dev/null && pwd -P >| /tmp/cwd",
          }),
          proc({ entityId: 'npm', parentEntityId: 'shell', commandLine: 'npm test' }),
        ],
        sideEffects: new Map([
          ['npm', { fileEvents: 3, networkEvents: 1, files: [], domains: [], destinations: [] }],
        ]),
        otelEvents: [
          {
            timestamp: '2026-11-26T10:00:05.000Z',
            conversationId: 'session-1',
            eventName: 'tool_result',
            toolName: 'Bash',
            commandLine: 'npm test',
            isMock: false,
          },
        ],
        otelMatch: 'session',
      })
    );
    renderActivity();

    expect(screen.queryByText('Tool shell')).not.toBeInTheDocument();
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.toolCallProcesses)).toHaveTextContent(
      'npm test3 file events, 1 connection'
    );
  });

  it('shows the launch mode with its terminal session on the reach line', () => {
    mockActivity(
      buildAgentActivity({
        identity: claude,
        ownEvents: [
          proc({
            entityId: 'agent',
            isDescendant: false,
            entryMetaType: 'init',
            entryLeaderName: 'crond',
          }),
        ],
        descendantEvents: [],
        sideEffects: new Map(),
        otelEvents: [],
        otelMatch: 'none',
      })
    );
    renderActivity();

    expect(screen.getByTestId(AI_AGENT_TEST_IDS.reachLine)).toHaveTextContent(
      /^Scheduled \(crond\)$/
    );
    expect(screen.queryByText(/Terminal session/)).not.toBeInTheDocument();
  });

  it('shows the reach line: launch, headless, permission prompts off and what is outside the directory', () => {
    mockActivity(
      buildAgentActivity({
        identity: claude,
        ownEvents: [
          proc({
            entityId: 'agent',
            isDescendant: false,
            entryMetaType: 'init',
            entryLeaderName: 'crond',
            workingDirectory: '/home/ec2-user/repo',
            commandLine: 'claude -p fix the build --dangerously-skip-permissions',
          }),
        ],
        descendantEvents: [
          proc({ entityId: 'curl', parentEntityId: 'agent', commandLine: 'curl' }),
        ],
        sideEffects: new Map([
          [
            'curl',
            {
              fileEvents: 2,
              networkEvents: 2,
              files: ['/home/ec2-user/Downloads/kit.tar.gz', '/home/ec2-user/.aws/credentials'],
              domains: ['dl.kit.example'],
              destinations: [],
            },
          ],
        ]),
        otelEvents: [],
        otelMatch: 'none',
      })
    );
    renderActivity();

    expect(screen.getByTestId(AI_AGENT_TEST_IDS.reachLine)).toHaveTextContent(
      'Scheduled (crond) · headless · permission prompts off · 2 files and 1 network destination outside /home/ec2-user/repo'
    );
  });

  it('leaves out reach parts that have no data rather than showing zero', () => {
    mockActivity(
      buildAgentActivity({
        identity: claude,
        ownEvents: [proc({ entityId: 'agent', isDescendant: false, interactive: true })],
        descendantEvents: [],
        sideEffects: new Map(),
        otelEvents: [],
        otelMatch: 'none',
      })
    );
    renderActivity();

    expect(screen.getByTestId(AI_AGENT_TEST_IDS.reachLine)).toHaveTextContent(/^Interactive$/);
  });

  it('shows "Running now" on a run whose root has no end event', () => {
    const now = Date.now();
    mockActivity(
      buildAgentActivity({
        identity: claude,
        ownEvents: [
          proc({
            entityId: 'agent',
            isDescendant: false,
            timestamp: new Date(now - 3_600_000).toISOString(),
          }),
        ],
        descendantEvents: [],
        sideEffects: new Map(),
        otelEvents: [],
        otelMatch: 'none',
        endedProcessIds: new Set(),
        now,
      })
    );
    renderActivity();

    expect(screen.getByTestId(AI_AGENT_TEST_IDS.runStatus)).toHaveTextContent('Running now');
  });

  it('says "No end event since" past the cap, and nothing for an ended run', () => {
    const now = new Date('2026-11-27T12:00:00.000Z').getTime();
    mockActivity(
      buildAgentActivity({
        identity: claude,
        ownEvents: [
          proc({ entityId: 'old', isDescendant: false, timestamp: '2026-11-25T10:00:00.000Z' }),
          proc({ entityId: 'done', isDescendant: false, timestamp: '2026-11-27T11:00:00.000Z' }),
        ],
        descendantEvents: [],
        sideEffects: new Map(),
        otelEvents: [],
        otelMatch: 'none',
        endedProcessIds: new Set(['done']),
        now,
      })
    );
    renderActivity();

    const statuses = screen.getAllByTestId(AI_AGENT_TEST_IDS.runStatus);
    expect(statuses).toHaveLength(1);
    expect(statuses[0]).toHaveTextContent(/^No end event since /);
  });

  it('summarises model use and marks sessions matched by account', () => {
    const request = {
      conversationId: 'session-1',
      eventName: 'api_request',
      model: 'claude-sonnet-5-5',
      inputTokens: 1000,
      outputTokens: 467,
      isMock: false,
    };
    mockActivity(
      buildAgentActivity({
        identity: claude,
        ownEvents: [proc({ entityId: 'agent', isDescendant: false })],
        descendantEvents: [],
        sideEffects: new Map(),
        otelEvents: [
          { ...request, timestamp: '2026-11-26T10:00:01.000Z' },
          { ...request, timestamp: '2026-11-26T10:00:02.000Z' },
        ],
        otelMatch: 'account',
      })
    );
    renderActivity();

    expect(screen.getByText('claude-sonnet-5-5 · 2 requests · 2,934 tokens')).toBeInTheDocument();
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.otelByAccount)).toBeInTheDocument();
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
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.setupToggle)).toBeInTheDocument();
    expect(screen.getByText('Show setup commands (1)')).toBeInTheDocument();
    expect(screen.queryByText(/hidden/)).not.toBeInTheDocument();

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

    expect(screen.getByTestId(AI_AGENT_TEST_IDS.sessionViewLink)).toHaveAttribute(
      'aria-label',
      'Open in Session View'
    );
    fireEvent.click(screen.getByTestId(AI_AGENT_TEST_IDS.sessionViewLink));
    expect(flyoutApi.openSessionView).toHaveBeenCalledWith(
      expect.objectContaining({ jumpToEntityId: 'npm' })
    );
    const [{ hit }] = flyoutApi.openSessionView.mock.calls[0];
    expect(hit.flattened['process.entry_leader.entity_id']).toEqual(['leader-1']);
  });

  it('says plainly when there is no process activity', () => {
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

    expect(screen.getByTestId(AI_AGENT_TEST_IDS.noProcessActivity)).toHaveTextContent(
      'No process activity since first seen'
    );
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
