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
import {
  useAiAgentSessionCommands,
  useAiAgentSessionDetail,
  useAiAgentSessions,
} from '../../../../../entity_analytics/components/ai_security/hooks/use_ai_agent_sessions';
import { summariseSessionCommands } from '../../../../../entity_analytics/components/ai_security/activity/session_commands';
import {
  buildAgentSessions,
  buildSessionDetail,
  getSessionsWindow,
} from '../../../../../entity_analytics/components/ai_security/activity/build_agent_sessions';
import type { BuildAgentActivityParams } from '../../../../../entity_analytics/components/ai_security/activity/build_agent_activity';
import type {
  ProcessRecord,
  RunAlertRecord,
} from '../../../../../entity_analytics/components/ai_security/activity/types';
import type { AgentIdentity } from '../../../../../entity_analytics/components/ai_security/types';
import { AgentActivity, SESSIONS_PAGE_SIZE } from './agent_activity';
import { AI_AGENT_TEST_IDS } from '../test_ids';

jest.mock('../../../../use_flyout_api');
jest.mock('../../../../../entity_analytics/components/ai_security/hooks/use_ai_agent_sessions');
jest.mock('@elastic/charts', () => {
  const actual = jest.requireActual('@elastic/charts');
  return {
    ...actual,
    Chart: ({ title }: { title?: string }) => <div data-test-subj="mockChart">{title}</div>,
  };
});

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

const NOW = new Date('2026-11-27T12:00:00.000Z').getTime();

type MockParams = Partial<
  Pick<
    BuildAgentActivityParams,
    'descendantEvents' | 'sideEffects' | 'otelEvents' | 'otelMatch' | 'truncated'
  >
> & {
  readonly ownEvents: readonly ProcessRecord[];
  readonly endTimes?: ReadonlyMap<string, string>;
  readonly alerts?: readonly RunAlertRecord[];
  readonly now?: number;
  readonly sessionsTruncated?: boolean;
};

/** Mocks both reads from the same rules the hooks use, so a row's detail is the real build. */
const mockActivity = ({
  ownEvents,
  endTimes,
  alerts,
  now = NOW,
  sessionsTruncated = false,
  descendantEvents = [],
  sideEffects = new Map(),
  otelEvents = [],
  otelMatch = 'none',
  truncated = false,
}: MockParams) => {
  const sessions = buildAgentSessions({
    identity: claude,
    window: getSessionsWindow(now),
    ownEvents,
    endTimes,
    alerts,
    now,
    truncated: sessionsTruncated,
  });
  jest.mocked(useAiAgentSessions).mockReturnValue({
    data: sessions,
    isLoading: false,
    isError: false,
  } as unknown as ReturnType<typeof useAiAgentSessions>);
  jest.mocked(useAiAgentSessionCommands).mockReturnValue({
    data: summariseSessionCommands(sessions, descendantEvents),
  } as unknown as ReturnType<typeof useAiAgentSessionCommands>);
  jest.mocked(useAiAgentSessionDetail).mockImplementation(
    ({ session }) =>
      ({
        data: {
          ...buildSessionDetail({
            identity: claude,
            sessions,
            session,
            descendantEvents,
            sideEffects,
            otelEvents,
            otelMatch,
            truncated,
          }),
          otelFailed: false,
        },
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useAiAgentSessionDetail>)
  );
};

const renderActivity = (agent: AgentIdentity = claude) =>
  render(
    <TestProviders>
      <AgentActivity agent={agent} />
    </TestProviders>
  );

/** Opens every collapsed session row. */
const expandAll = () =>
  screen.getAllByTestId(AI_AGENT_TEST_IDS.sessionToggle).forEach((toggle) => {
    if (toggle.getAttribute('aria-expanded') === 'false') fireEvent.click(toggle);
  });

describe('AgentActivity', () => {
  let flyoutApi: ReturnType<typeof createFlyoutApiMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    flyoutApi = createFlyoutApiMock();
    jest.mocked(useFlyoutApi).mockReturnValue(flyoutApi);
  });

  it('shows a Defend-only run without notes about missing layers', () => {
    mockActivity({
      ownEvents: [proc({ entityId: 'agent', isDescendant: false, interactive: true })],
      descendantEvents: [proc({ entityId: 'git', parentEntityId: 'agent', name: 'git' })],
      sideEffects: new Map(),
      otelEvents: [],
      otelMatch: 'none',
    });
    renderActivity();
    expandAll();

    expect(screen.getAllByTestId(AI_AGENT_TEST_IDS.session)).toHaveLength(1);
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.activity)).not.toHaveTextContent('not collected');
    expect(screen.queryByTestId(AI_AGENT_TEST_IDS.headlessPrompt)).not.toBeInTheDocument();
  });

  it('shows a step with no name or command line instead of hiding it', () => {
    mockActivity({
      ownEvents: [proc({ entityId: 'agent', isDescendant: false, commandLine: 'claude' })],
      descendantEvents: [proc({ entityId: 'bare', parentEntityId: 'agent', hasExec: false })],
      sideEffects: new Map(),
      otelEvents: [],
      otelMatch: 'none',
    });
    renderActivity();
    expandAll();

    expect(screen.getByText('Process with no name or command line recorded')).toBeInTheDocument();
  });

  it('shows a collapsed row with a short start time, the prompt and the commands run', () => {
    mockActivity({
      ownEvents: [
        proc({
          entityId: 'agent',
          isDescendant: false,
          timestamp: '2026-11-27T09:15:00.000Z',
          commandLine: 'claude -p Restart nginx --output-format json',
        }),
      ],
      endTimes: new Map([['agent', '2026-11-27T09:15:10.000Z']]),
      descendantEvents: [
        proc({ entityId: 'shell', parentEntityId: 'agent', ancestry: ['agent'], name: 'bash' }),
        proc({
          entityId: 'sudo',
          parentEntityId: 'shell',
          ancestry: ['shell', 'agent'],
          name: 'sudo',
        }),
        proc({
          entityId: 'ctl',
          parentEntityId: 'sudo',
          ancestry: ['sudo', 'shell', 'agent'],
          name: 'systemctl',
        }),
      ],
    });
    renderActivity();
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.sessionStart)).toHaveTextContent(
      /^Today \d{2}:\d{2}$/
    );
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.sessionSubject)).toHaveTextContent('Restart nginx');
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.sessionCommands)).toHaveTextContent(
      '2 commands: sudo systemctl'
    );
    expect(screen.queryByText('Headless')).not.toBeInTheDocument();
  });

  it('shows the headless prompt, sessions and OTel steps', () => {
    mockActivity({
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
    });
    renderActivity();
    expandAll();

    expect(screen.getByTestId(AI_AGENT_TEST_IDS.headlessPrompt)).toHaveTextContent(
      'PromptRestart nginx'
    );
    expect(screen.getByText('claude -p … --output-format json')).toBeInTheDocument();
    expect(screen.queryByTestId(`${AI_AGENT_TEST_IDS.step}-prompt`)).not.toBeInTheDocument();
    expect(screen.getByText('Conversation session-1')).toBeInTheDocument();
    expect(screen.getByText('Tool call: Bash')).toBeInTheDocument();
    const processes = screen.getByTestId(AI_AGENT_TEST_IDS.toolCallProcesses);
    expect(within(processes).getByText('sudo systemctl restart nginx')).toBeInTheDocument();
    expect(within(processes).getByText('Ran as root')).toBeInTheDocument();
    expect(screen.queryAllByTestId(`${AI_AGENT_TEST_IDS.step}-process`)).toHaveLength(0);
    expect(screen.queryByText('Mock data')).not.toBeInTheDocument();
  });

  it('nests the processes a tool call ran and drops the tool shell around them', () => {
    mockActivity({
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
    });
    renderActivity();
    expandAll();

    expect(screen.queryByText('Tool shell')).not.toBeInTheDocument();
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.toolCallProcesses)).toHaveTextContent(
      'npm test3 file events, 1 connection'
    );
  });

  it('shows the launch mode with its terminal session on the reach line', () => {
    mockActivity({
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
    });
    renderActivity();
    expandAll();

    expect(screen.getByTestId(AI_AGENT_TEST_IDS.reachLine)).toHaveTextContent(
      /^Scheduled \(crond\)$/
    );
    expect(screen.queryByText(/Terminal session/)).not.toBeInTheDocument();
  });

  it('shows the reach line: launch, headless, permission prompts off and what is outside the directory', () => {
    mockActivity({
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
      descendantEvents: [proc({ entityId: 'curl', parentEntityId: 'agent', commandLine: 'curl' })],
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
    });
    renderActivity();
    expandAll();

    expect(screen.getByTestId(AI_AGENT_TEST_IDS.reachLine)).toHaveTextContent(
      'Scheduled (crond) · headless · permission prompts off · 2 files and 1 network destination outside /home/ec2-user/repo'
    );
  });

  it('leaves out reach parts that have no data rather than showing zero', () => {
    mockActivity({
      ownEvents: [proc({ entityId: 'agent', isDescendant: false, interactive: true })],
      descendantEvents: [],
      sideEffects: new Map(),
      otelEvents: [],
      otelMatch: 'none',
    });
    renderActivity();
    expandAll();

    expect(screen.getByTestId(AI_AGENT_TEST_IDS.reachLine)).toHaveTextContent(/^Interactive$/);
  });

  it('shows "Running now" on a session whose root has no end event, expanded', () => {
    const now = Date.now();
    mockActivity({
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
      endTimes: new Map(),
      now,
    });
    renderActivity();

    expect(screen.getByTestId(AI_AGENT_TEST_IDS.runStatus)).toHaveTextContent('Running now');
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.sessionToggle)).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });

  it('says "No end event since" past the cap, and the duration for an ended session', () => {
    const now = new Date('2026-11-27T12:00:00.000Z').getTime();
    mockActivity({
      ownEvents: [
        proc({ entityId: 'old', isDescendant: false, timestamp: '2026-11-25T10:00:00.000Z' }),
        proc({ entityId: 'done', isDescendant: false, timestamp: '2026-11-27T11:00:00.000Z' }),
      ],
      descendantEvents: [],
      sideEffects: new Map(),
      otelEvents: [],
      otelMatch: 'none',
      endTimes: new Map([['done', '2026-11-27T11:04:12.000Z']]),
      now,
    });
    renderActivity();

    const statuses = screen.getAllByTestId(AI_AGENT_TEST_IDS.runStatus);
    expect(statuses).toHaveLength(1);
    expect(statuses[0]).toHaveTextContent(/^No end event since /);
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.sessionDuration)).toHaveTextContent('4m 12s');
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
    mockActivity({
      ownEvents: [proc({ entityId: 'agent', isDescendant: false })],
      descendantEvents: [],
      sideEffects: new Map(),
      otelEvents: [
        { ...request, timestamp: '2026-11-26T10:00:01.000Z' },
        { ...request, timestamp: '2026-11-26T10:00:02.000Z' },
      ],
      otelMatch: 'account',
    });
    renderActivity();
    expandAll();

    expect(screen.getByText('claude-sonnet-5-5 · 2 requests · 2,934 tokens')).toBeInTheDocument();
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.otelByAccount)).toBeInTheDocument();
  });

  it('hides setup commands behind a toggle and counts them', () => {
    mockActivity({
      ownEvents: [proc({ entityId: 'agent', isDescendant: false })],
      descendantEvents: [
        proc({ entityId: 'env', parentEntityId: 'agent', name: 'env', commandLine: 'env' }),
        proc({ entityId: 'npm', parentEntityId: 'agent', commandLine: 'npm test' }),
      ],
      sideEffects: new Map(),
      otelEvents: [],
      otelMatch: 'none',
    });
    renderActivity();
    expandAll();

    expect(screen.getByText('npm test')).toBeInTheDocument();
    expect(screen.queryByText('env')).not.toBeInTheDocument();
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.setupToggle)).toBeInTheDocument();
    expect(screen.getByText('Show setup commands (1)')).toBeInTheDocument();
    expect(screen.queryByText(/hidden/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId(AI_AGENT_TEST_IDS.setupToggle));
    expect(screen.getByText('env')).toBeInTheDocument();
  });

  it('opens Session View on the step terminal session, jumping to its process', () => {
    mockActivity({
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
    });
    renderActivity();
    expandAll();

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

  it('says plainly when there were no sessions in the last 30 days', () => {
    mockActivity({ ownEvents: [] });
    renderActivity();

    expect(screen.getByTestId(AI_AGENT_TEST_IDS.sessionsSummary)).toHaveTextContent(
      '0 sessions in the last 30 days'
    );
    expect(screen.queryByTestId(AI_AGENT_TEST_IDS.session)).not.toBeInTheDocument();
  });

  it('summarises the sessions: count, launch modes, flags and the histogram', () => {
    mockActivity({
      ownEvents: [
        proc({
          entityId: 'cron',
          isDescendant: false,
          entryMetaType: 'init',
          commandLine: 'claude -p nightly --dangerously-skip-permissions',
        }),
        proc({ entityId: 'tty', isDescendant: false, interactive: true }),
      ],
    });
    renderActivity();

    const summary = screen.getByTestId(AI_AGENT_TEST_IDS.sessionsSummary);
    expect(summary).toHaveTextContent('2 sessions in the last 30 days');
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.sessionsLaunchModes)).toHaveTextContent(
      'Interactive: 1 · Scheduled: 1'
    );
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.sessionsFlags)).toHaveTextContent(
      'Headless: 1 · Permission prompts off: 1'
    );
    expect(within(summary).getByTestId('mockChart')).toHaveTextContent('Sessions per day');
  });

  it('shows collapsed rows newest first and reads a session only when it is expanded', () => {
    mockActivity({
      ownEvents: [
        proc({ entityId: 'older', isDescendant: false, timestamp: '2026-11-25T10:00:00.000Z' }),
        proc({
          entityId: 'newer',
          isDescendant: false,
          entryMetaType: 'init',
          entryLeaderName: 'crond',
          commandLine: 'claude -p nightly',
        }),
      ],
      descendantEvents: [
        proc({ entityId: 'npm', parentEntityId: 'newer', commandLine: 'npm test' }),
      ],
    });
    renderActivity();

    const rows = screen.getAllByTestId(AI_AGENT_TEST_IDS.session);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Scheduled (crond)');
    expect(within(rows[0]).getByTestId(AI_AGENT_TEST_IDS.sessionSubject)).toHaveTextContent(
      'nightly'
    );
    expect(useAiAgentSessionDetail).not.toHaveBeenCalled();
    expect(screen.queryByText('npm test')).not.toBeInTheDocument();

    fireEvent.click(within(rows[0]).getByTestId(AI_AGENT_TEST_IDS.sessionToggle));
    expect(useAiAgentSessionDetail).toHaveBeenCalledWith(
      expect.objectContaining({ session: expect.objectContaining({ id: 'newer' }) })
    );
    expect(within(rows[0]).getByText('npm test')).toBeInTheDocument();
  });

  it('opens sessions with alerts and shows their alert count', () => {
    mockActivity({
      ownEvents: [
        proc({ entityId: 'quiet', isDescendant: false, timestamp: '2026-11-25T10:00:00.000Z' }),
        proc({ entityId: 'loud', isDescendant: false }),
      ],
      endTimes: new Map([
        ['quiet', '2026-11-25T10:01:00.000Z'],
        ['loud', '2026-11-26T10:01:00.000Z'],
      ]),
      alerts: [
        { id: 'a1', timestamp: '2026-11-26T10:05:00.000Z', processEntityId: 'loud', ancestry: [] },
        { id: 'a2', timestamp: '2026-11-26T10:05:00.000Z', parentEntityId: 'loud', ancestry: [] },
      ],
    });
    renderActivity();

    const [loud, quiet] = screen.getAllByTestId(AI_AGENT_TEST_IDS.sessionToggle);
    expect(loud).toHaveAttribute('aria-expanded', 'true');
    expect(quiet).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.sessionAlerts)).toHaveTextContent('2 alerts');
    expect(screen.getAllByTestId(AI_AGENT_TEST_IDS.sessionDetail)).toHaveLength(1);
  });

  it('shows 20 sessions, then more on request', () => {
    const start = new Date('2026-11-01T00:00:00.000Z').getTime();
    mockActivity({
      ownEvents: Array.from({ length: SESSIONS_PAGE_SIZE + 5 }, (_, index) =>
        proc({
          entityId: `launch-${index}`,
          isDescendant: false,
          timestamp: new Date(start + index * 3_600_000).toISOString(),
        })
      ),
    });
    renderActivity();

    expect(screen.getAllByTestId(AI_AGENT_TEST_IDS.session)).toHaveLength(SESSIONS_PAGE_SIZE);
    expect(screen.getByText('Showing 20 of 25')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId(AI_AGENT_TEST_IDS.sessionsShowMore));
    expect(screen.getAllByTestId(AI_AGENT_TEST_IDS.session)).toHaveLength(25);
    expect(screen.queryByTestId(AI_AGENT_TEST_IDS.sessionsShowMore)).not.toBeInTheDocument();
  });

  it('says when the sessions read hit its limit', () => {
    mockActivity({
      ownEvents: [proc({ entityId: 'agent', isDescendant: false })],
      sessionsTruncated: true,
    });
    renderActivity();

    expect(screen.getByTestId(AI_AGENT_TEST_IDS.sessionsTruncated)).toBeInTheDocument();
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.sessionsSummary)).toHaveTextContent(
      'At least 1 session in the last 30 days'
    );
  });

  it('lists steps in the session time range that could not be tied to a session', () => {
    mockActivity({
      ownEvents: [proc({ entityId: 'agent', isDescendant: false })],
      descendantEvents: [proc({ entityId: 'orphan', parentEntityId: 'gone', commandLine: 'ls' })],
      sideEffects: new Map(),
      otelEvents: [],
      otelMatch: 'none',
    });
    renderActivity();
    expandAll();

    expect(screen.getByTestId(AI_AGENT_TEST_IDS.unplacedSteps)).toHaveTextContent('ls');
  });
});
