/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiIconTip,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { PreferenceFormattedDate } from '../../../../../common/components/formatted_date';
import { useFlyoutApi } from '../../../../use_flyout_api';
import { FLYOUT_ORIGIN } from '../../../../../common/lib/telemetry';
import { useAiAgentActivity } from '../../../../../entity_analytics/components/ai_agents/hooks/use_ai_agents';
import type {
  ActivitySection,
  ActivityStep,
  AgentRun,
  LaunchMode,
  ProcessStep,
} from '../../../../../entity_analytics/components/ai_agents/activity/types';
import type {
  AgentIdentity,
  AgentRow,
} from '../../../../../entity_analytics/components/ai_agents/types';
import { isClaudeCode } from '../../../../../entity_analytics/components/ai_agents/utils';
import { GAP_IDS } from '../../../../../entity_analytics/components/ai_agents/gaps';
import {
  MOCK_DATA_BADGE,
  MOCK_DATA_TOOLTIP,
} from '../../../../../entity_analytics/components/ai_agents/translations';
import { GapLink, MissingLayerNote } from './missing_layer_note';
import { AI_AGENT_TEST_IDS } from '../test_ids';

const LAUNCH_MODE_LABELS: Readonly<Record<LaunchMode, string>> = {
  interactive: i18n.translate(
    'xpack.securitySolution.flyout.entityDetails.aiAgent.activity.launch.interactive',
    {
      defaultMessage: 'Interactive',
    }
  ),
  scripted: i18n.translate(
    'xpack.securitySolution.flyout.entityDetails.aiAgent.activity.launch.scripted',
    {
      defaultMessage: 'Scripted',
    }
  ),
  scheduled: i18n.translate(
    'xpack.securitySolution.flyout.entityDetails.aiAgent.activity.launch.scheduled',
    {
      defaultMessage: 'Scheduled',
    }
  ),
  unknown: i18n.translate(
    'xpack.securitySolution.flyout.entityDetails.aiAgent.activity.launch.unknown',
    {
      defaultMessage: 'Launch mode unknown',
    }
  ),
};

const SESSION_VIEW_LINK = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.activity.openProcessTree',
  { defaultMessage: 'Open in Session View' }
);
const SESSION_VIEW_UNAVAILABLE = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.activity.processTreeUnavailable',
  { defaultMessage: 'No terminal session data on this event, so Session View is not available.' }
);
const UNNAMED_PROCESS = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.activity.unnamedProcess',
  { defaultMessage: 'Process with no name or command line recorded' }
);
const PROMPT_TEXT_NOT_LOGGED = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.activity.promptNotLogged',
  { defaultMessage: 'Prompt submitted, text not logged' }
);

/** Shortens a session ID for display; the full value is in the tooltip. */
const shortId = (id: string): string => (id.length > 12 ? `${id.slice(0, 8)}…` : id);

const MockBadge = () => (
  <EuiToolTip content={MOCK_DATA_TOOLTIP}>
    <EuiBadge color="warning" tabIndex={0}>
      {MOCK_DATA_BADGE}
    </EuiBadge>
  </EuiToolTip>
);

const ProcessStepRow = memo(
  ({
    step,
    onOpenProcessTree,
  }: {
    step: ProcessStep;
    onOpenProcessTree: (step: ProcessStep) => void;
  }) => {
    const { process, sideEffects, ranAsOtherUser, isAgentProcess } = step;
    const label = process.commandLine ?? process.name;
    const canOpenTree = !!process.documentId && !!process.index && !!process.entryLeaderEntityId;
    return (
      <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="commandLine" size="s" aria-hidden={true} />
        </EuiFlexItem>
        <EuiFlexItem
          css={css`
            min-width: 0;
          `}
        >
          {label ? (
            <EuiCode
              transparentBackground
              css={css`
                word-break: break-all;
              `}
            >
              {label.length > 300 ? `${label.slice(0, 300)}…` : label}
            </EuiCode>
          ) : (
            <EuiText size="xs" color="subdued">
              {UNNAMED_PROCESS}
            </EuiText>
          )}
          <EuiFlexGroup gutterSize="xs" wrap responsive={false} alignItems="center">
            {isAgentProcess && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">
                  <FormattedMessage
                    id="xpack.securitySolution.flyout.entityDetails.aiAgent.activity.agentProcess"
                    defaultMessage="Agent process"
                  />
                </EuiBadge>
              </EuiFlexItem>
            )}
            {ranAsOtherUser && (
              <EuiFlexItem grow={false}>
                <EuiBadge color={ranAsOtherUser === 'root' ? 'danger' : 'warning'}>
                  <FormattedMessage
                    id="xpack.securitySolution.flyout.entityDetails.aiAgent.activity.ranAs"
                    defaultMessage="Ran as {user}"
                    values={{ user: ranAsOtherUser }}
                  />
                </EuiBadge>
              </EuiFlexItem>
            )}
            {sideEffects && (sideEffects.fileEvents > 0 || sideEffects.networkEvents > 0) && (
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  content={[...sideEffects.files, ...sideEffects.destinations].join('\n')}
                >
                  <EuiText size="xs" color="subdued" tabIndex={0}>
                    <FormattedMessage
                      id="xpack.securitySolution.flyout.entityDetails.aiAgent.activity.sideEffects"
                      defaultMessage="{files, plural, one {# file event} other {# file events}}, {connections, plural, one {# connection} other {# connections}}"
                      values={{
                        files: sideEffects.fileEvents,
                        connections: sideEffects.networkEvents,
                      }}
                    />
                  </EuiText>
                </EuiToolTip>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              {canOpenTree ? (
                <EuiButtonEmpty
                  size="xs"
                  flush="left"
                  iconType="commandLine"
                  onClick={() => onOpenProcessTree(step)}
                  data-test-subj={AI_AGENT_TEST_IDS.sessionViewLink}
                >
                  {SESSION_VIEW_LINK}
                </EuiButtonEmpty>
              ) : (
                <EuiIconTip
                  type="commandLine"
                  color="subdued"
                  content={SESSION_VIEW_UNAVAILABLE}
                  aria-label={SESSION_VIEW_UNAVAILABLE}
                />
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
ProcessStepRow.displayName = 'ProcessStepRow';

const StepRow = memo(
  ({
    step,
    onOpenProcessTree,
  }: {
    step: ActivityStep;
    onOpenProcessTree: (step: ProcessStep) => void;
  }) => {
    const { euiTheme } = useEuiTheme();
    let content: React.ReactNode;
    switch (step.kind) {
      case 'process':
        content = <ProcessStepRow step={step} onOpenProcessTree={onOpenProcessTree} />;
        break;
      case 'prompt':
        content = (
          <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type="comment" size="s" aria-hidden={true} />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="xs">
                <strong>
                  <FormattedMessage
                    id="xpack.securitySolution.flyout.entityDetails.aiAgent.activity.prompt"
                    defaultMessage="Prompt"
                  />
                </strong>{' '}
                {step.text ?? <em>{PROMPT_TEXT_NOT_LOGGED}</em>}
              </EuiText>
            </EuiFlexItem>
            {step.isMock && (
              <EuiFlexItem grow={false}>
                <MockBadge />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        );
        break;
      case 'tool_call':
        content = (
          <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type="wrench" size="s" aria-hidden={true} />
            </EuiFlexItem>
            <EuiFlexItem
              css={css`
                min-width: 0;
              `}
            >
              <EuiText size="xs">
                <strong>
                  <FormattedMessage
                    id="xpack.securitySolution.flyout.entityDetails.aiAgent.activity.toolCall"
                    defaultMessage="Tool call: {tool}"
                    values={{ tool: step.toolName ?? '?' }}
                  />
                </strong>{' '}
                {step.mcpServer && (
                  <FormattedMessage
                    id="xpack.securitySolution.flyout.entityDetails.aiAgent.activity.mcpServer"
                    defaultMessage="(MCP server {server})"
                    values={{ server: step.mcpServer }}
                  />
                )}
              </EuiText>
              {step.commandLine && <EuiCode transparentBackground>{step.commandLine}</EuiCode>}
            </EuiFlexItem>
            {step.decision === 'reject' && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="danger">
                  <FormattedMessage
                    id="xpack.securitySolution.flyout.entityDetails.aiAgent.activity.rejected"
                    defaultMessage="Rejected"
                  />
                </EuiBadge>
              </EuiFlexItem>
            )}
            {step.isMock && (
              <EuiFlexItem grow={false}>
                <MockBadge />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        );
        break;
      case 'otel_event':
        content = (
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type="dot" size="s" aria-hidden={true} />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="xs">
                {step.eventName}
                {step.mcpServer ? ` (${step.mcpServer})` : ''}
              </EuiText>
            </EuiFlexItem>
            {step.isMock && (
              <EuiFlexItem grow={false}>
                <MockBadge />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        );
        break;
    }
    return (
      <EuiFlexGroup
        gutterSize="s"
        responsive={false}
        alignItems="flexStart"
        data-test-subj={`${AI_AGENT_TEST_IDS.step}-${step.kind}`}
        css={css`
          padding: ${euiTheme.size.xs} 0;
          border-bottom: ${euiTheme.border.thin};
        `}
      >
        <EuiFlexItem
          grow={false}
          css={css`
            min-width: 70px;
          `}
        >
          <EuiText size="xs" color="subdued">
            <PreferenceFormattedDate value={new Date(step.timestamp)} dateFormat="HH:mm:ss" />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem
          css={css`
            min-width: 0;
          `}
        >
          {content}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
StepRow.displayName = 'StepRow';

const visibleSteps = (steps: readonly ActivityStep[], showSetup: boolean): ActivityStep[] =>
  showSetup ? [...steps] : steps.filter((step) => step.kind !== 'process' || !step.isSetup);

const SectionView = memo(
  ({
    section,
    showSetup,
    onOpenProcessTree,
  }: {
    section: ActivitySection;
    showSetup: boolean;
    onOpenProcessTree: (step: ProcessStep) => void;
  }) => {
    const steps = visibleSteps(section.steps, showSetup);
    const hidden = section.steps.length - steps.length;
    return (
      <>
        {section.sessionId && (
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <EuiToolTip content={section.sessionId}>
                <EuiText size="xs" tabIndex={0}>
                  <strong>
                    <FormattedMessage
                      id="xpack.securitySolution.flyout.entityDetails.aiAgent.activity.agentSession"
                      defaultMessage="Agent session {id}"
                      values={{ id: shortId(section.sessionId) }}
                    />
                  </strong>
                </EuiText>
              </EuiToolTip>
            </EuiFlexItem>
            {section.modelUsage && (
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  <FormattedMessage
                    id="xpack.securitySolution.flyout.entityDetails.aiAgent.activity.modelUsage"
                    defaultMessage="{requests, plural, one {# model request} other {# model requests}} ({models}), {input} input and {output} output tokens"
                    values={{
                      requests: section.modelUsage.requests,
                      models: section.modelUsage.models.join(', '),
                      input: section.modelUsage.inputTokens,
                      output: section.modelUsage.outputTokens,
                    }}
                  />
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        )}
        {steps.map((step, index) => (
          <StepRow
            key={`${step.kind}-${step.timestamp}-${index}`}
            step={step}
            onOpenProcessTree={onOpenProcessTree}
          />
        ))}
        {hidden > 0 && (
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.securitySolution.flyout.entityDetails.aiAgent.activity.hiddenSetup"
              defaultMessage="{count, plural, one {# setup command hidden} other {# setup commands hidden}}"
              values={{ count: hidden }}
            />
          </EuiText>
        )}
        <EuiSpacer size="s" />
      </>
    );
  }
);
SectionView.displayName = 'SectionView';

const RunView = memo(
  ({
    run,
    showSetup,
    showInteractivePromptNote,
    onOpenProcessTree,
  }: {
    run: AgentRun;
    showSetup: boolean;
    showInteractivePromptNote: boolean;
    onOpenProcessTree: (step: ProcessStep) => void;
  }) => {
    const rootStep: ProcessStep = {
      kind: 'process',
      timestamp: run.root.timestamp,
      process: run.root,
      isAgentProcess: true,
      isSetup: false,
    };
    return (
      <EuiPanel hasBorder paddingSize="s" data-test-subj={AI_AGENT_TEST_IDS.run}>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xxs">
              <h4>
                <FormattedMessage
                  id="xpack.securitySolution.flyout.entityDetails.aiAgent.activity.runTitle"
                  defaultMessage="Run started {time}"
                  values={{ time: <PreferenceFormattedDate value={new Date(run.start)} /> }}
                />
              </h4>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{LAUNCH_MODE_LABELS[run.launchMode]}</EuiBadge>
          </EuiFlexItem>
          {run.root.entryLeaderName && (
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                <FormattedMessage
                  id="xpack.securitySolution.flyout.entityDetails.aiAgent.activity.terminalSession"
                  defaultMessage="Terminal session from {leader}"
                  values={{ leader: run.root.entryLeaderName }}
                />
              </EuiText>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <EuiSpacer size="xs" />
        <ProcessStepRow step={rootStep} onOpenProcessTree={onOpenProcessTree} />
        <EuiSpacer size="xs" />
        {run.isHeadless ? (
          <EuiText size="xs" data-test-subj={AI_AGENT_TEST_IDS.headlessPrompt}>
            <strong>
              <FormattedMessage
                id="xpack.securitySolution.flyout.entityDetails.aiAgent.activity.headlessPrompt"
                defaultMessage="Prompt from the command line:"
              />
            </strong>{' '}
            {run.headlessPrompt ?? (
              <em>
                <FormattedMessage
                  id="xpack.securitySolution.flyout.entityDetails.aiAgent.activity.headlessPromptUnreadable"
                  defaultMessage="headless run, but the prompt could not be read from the arguments"
                />
              </em>
            )}
          </EuiText>
        ) : (
          showInteractivePromptNote && (
            <EuiText
              size="xs"
              color="subdued"
              data-test-subj={AI_AGENT_TEST_IDS.missingInteractivePrompt}
            >
              <FormattedMessage
                id="xpack.securitySolution.flyout.entityDetails.aiAgent.activity.interactiveNoPrompt"
                defaultMessage="Interactive run: the prompt is not on the command line."
              />{' '}
              <GapLink gapId={GAP_IDS.defendHeadlessOnly} />
            </EuiText>
          )
        )}
        <EuiSpacer size="s" />
        {run.sections.map((section, index) => (
          <SectionView
            key={section.sessionId ?? `no-session-${index}`}
            section={section}
            showSetup={showSetup}
            onOpenProcessTree={onOpenProcessTree}
          />
        ))}
      </EuiPanel>
    );
  }
);
RunView.displayName = 'RunView';

export interface AgentActivityProps {
  readonly agent: AgentRow | AgentIdentity;
}

/**
 * Agent activity: one panel per run (launch), with the steps from every source that exists.
 * Missing sources show a short note linking to their gaps row, and no step is hidden because a
 * field is missing. Process steps open the existing process tree tool for their terminal session.
 */
export const AgentActivity = memo(({ agent }: AgentActivityProps) => {
  const { data, isLoading, isError } = useAiAgentActivity(agent);
  const { openSessionView } = useFlyoutApi();
  const [showSetup, setShowSetup] = useState(false);
  const claude = isClaudeCode(agent.agentName);

  const onOpenProcessTree = useCallback(
    ({ process }: ProcessStep) => {
      if (!process.documentId || !process.index) return;
      const hit = buildDataTableRecord({
        _id: process.documentId,
        _index: process.index,
        fields: {
          '@timestamp': [process.timestamp],
          'process.entity_id': [process.entityId],
          ...(process.entryLeaderEntityId
            ? { 'process.entry_leader.entity_id': [process.entryLeaderEntityId] }
            : {}),
          ...(process.entryLeaderStart
            ? { 'process.entry_leader.start': [process.entryLeaderStart] }
            : {}),
          ...(process.name ? { 'process.name': [process.name] } : {}),
          'event.kind': ['event'],
        },
      });
      openSessionView({
        hit,
        jumpToEntityId: process.entityId,
        jumpToCursor: process.timestamp,
        origin: FLYOUT_ORIGIN.SESSION_VIEW_PROCESS,
      });
    },
    [openSessionView]
  );

  const setupCount = useMemo(
    () =>
      data
        ? [
            ...data.runs.flatMap((run) => run.sections.flatMap((s) => s.steps)),
            ...data.unplacedSteps,
          ].filter((step) => step.kind === 'process' && step.isSetup).length
        : 0,
    [data]
  );

  if (isLoading) return <EuiSkeletonText lines={6} />;
  if (isError || !data) {
    return (
      <KbnDangerCallout
        announceOnMount
        title={i18n.translate(
          'xpack.securitySolution.flyout.entityDetails.aiAgent.activity.error',
          {
            defaultMessage: 'Agent activity could not be loaded',
          }
        )}
      />
    );
  }

  const { layers } = data;
  const notes: Array<{
    testId: string;
    message: string;
    gapId: (typeof GAP_IDS)[keyof typeof GAP_IDS];
  }> = [];
  if (!layers.sessionIds) {
    notes.push({
      testId: AI_AGENT_TEST_IDS.missingSessionId,
      message: i18n.translate(
        'xpack.securitySolution.flyout.entityDetails.aiAgent.activity.noSessionId',
        {
          defaultMessage:
            'Defend reports no session ID for this agent, so runs are grouped by process tree only.',
        }
      ),
      gapId: claude ? GAP_IDS.claudeSessionIdUnmapped : GAP_IDS.cursorNoSessionId,
    });
  }
  if (!layers.otelToolCalls) {
    notes.push({
      testId: AI_AGENT_TEST_IDS.missingToolCalls,
      message: i18n.translate(
        'xpack.securitySolution.flyout.entityDetails.aiAgent.activity.noToolCalls',
        {
          defaultMessage: 'Tool calls are not collected for this agent.',
        }
      ),
      gapId: claude ? GAP_IDS.claudeOtelNotCollected : GAP_IDS.cursorNoPromptSource,
    });
  }
  if (!layers.otelPrompts) {
    notes.push({
      testId: AI_AGENT_TEST_IDS.missingPrompts,
      message: layers.headlessPrompts
        ? i18n.translate(
            'xpack.securitySolution.flyout.entityDetails.aiAgent.activity.onlyHeadlessPrompts',
            {
              defaultMessage:
                'Prompts are not collected for this agent. Headless runs show the prompt from the command line.',
            }
          )
        : i18n.translate('xpack.securitySolution.flyout.entityDetails.aiAgent.activity.noPrompts', {
            defaultMessage: 'Prompts are not collected for this agent.',
          }),
      gapId: !claude
        ? GAP_IDS.cursorNoPromptSource
        : layers.otelEvents
        ? GAP_IDS.claudePromptOptIn
        : GAP_IDS.claudeOtelNotCollected,
    });
  }
  if (data.otelMatch === 'account') {
    notes.push({
      testId: AI_AGENT_TEST_IDS.otelByAccount,
      message: i18n.translate(
        'xpack.securitySolution.flyout.entityDetails.aiAgent.activity.otelByAccount',
        {
          defaultMessage:
            'OTel is matched to this install by account and time, because Defend has no session ID. Another install on the same account could show here.',
        }
      ),
      gapId: GAP_IDS.claudeSessionIdUnmapped,
    });
  }

  return (
    <div data-test-subj={AI_AGENT_TEST_IDS.activity}>
      {!layers.defendRuns && (
        <>
          <KbnWarningCallout
            announceOnMount
            size="s"
            data-test-subj={AI_AGENT_TEST_IDS.missingDefend}
            title={i18n.translate(
              'xpack.securitySolution.flyout.entityDetails.aiAgent.activity.noDefendRuns',
              {
                defaultMessage:
                  'Elastic Defend has no process events for this agent since it was first seen.',
              }
            )}
          />
          <EuiSpacer size="s" />
        </>
      )}
      {notes.map((note) => (
        <React.Fragment key={note.testId}>
          <MissingLayerNote message={note.message} gapId={note.gapId} testId={note.testId} />
          <EuiSpacer size="xs" />
        </React.Fragment>
      ))}
      {data.truncated && (
        <EuiText size="xs" color="warning">
          <FormattedMessage
            id="xpack.securitySolution.flyout.entityDetails.aiAgent.activity.truncated"
            defaultMessage="Only the first events are shown. This agent has more activity than one read returns."
          />
        </EuiText>
      )}
      <EuiSpacer size="s" />
      {setupCount > 0 && (
        <>
          <EuiSwitch
            compressed
            label={i18n.translate(
              'xpack.securitySolution.flyout.entityDetails.aiAgent.activity.showSetup',
              {
                defaultMessage: 'Show setup commands ({count})',
                values: { count: setupCount },
              }
            )}
            checked={showSetup}
            onChange={(event) => setShowSetup(event.target.checked)}
            data-test-subj={AI_AGENT_TEST_IDS.setupToggle}
          />
          <EuiSpacer size="s" />
        </>
      )}
      {data.runs.map((run) => (
        <React.Fragment key={run.id}>
          <RunView
            run={run}
            showSetup={showSetup}
            showInteractivePromptNote={!layers.otelPrompts}
            onOpenProcessTree={onOpenProcessTree}
          />
          <EuiSpacer size="s" />
        </React.Fragment>
      ))}
      {data.unplacedSteps.length > 0 && (
        <EuiPanel hasBorder paddingSize="s" data-test-subj={AI_AGENT_TEST_IDS.unplacedSteps}>
          <EuiTitle size="xxs">
            <h4>
              <FormattedMessage
                id="xpack.securitySolution.flyout.entityDetails.aiAgent.activity.unplacedTitle"
                defaultMessage="Steps not tied to a run"
              />
            </h4>
          </EuiTitle>
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.securitySolution.flyout.entityDetails.aiAgent.activity.unplacedBody"
              defaultMessage="Descendants of this install whose parent process was not recorded."
            />
          </EuiText>
          {visibleSteps(data.unplacedSteps, showSetup).map((step, index) => (
            <StepRow
              key={`unplaced-${step.timestamp}-${index}`}
              step={step}
              onOpenProcessTree={onOpenProcessTree}
            />
          ))}
        </EuiPanel>
      )}
    </div>
  );
});
AgentActivity.displayName = 'AgentActivity';
