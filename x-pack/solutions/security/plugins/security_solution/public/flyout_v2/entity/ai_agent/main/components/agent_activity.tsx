/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
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
  EuiTextColor,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { PreferenceFormattedDate } from '../../../../../common/components/formatted_date';
import { useFlyoutApi } from '../../../../use_flyout_api';
import { FLYOUT_ORIGIN } from '../../../../../common/lib/telemetry';
import {
  useAiAgentSessionDetail,
  useAiAgentSessions,
} from '../../../../../entity_analytics/components/ai_security/hooks/use_ai_agent_sessions';
import type {
  ActivitySection,
  ActivityStep,
  AgentRun,
  AgentSession,
  AgentSessions,
  ModelUsage,
  ProcessStep,
  RunReach,
  RunStatus,
  SideEffects,
  ToolCallStep,
} from '../../../../../entity_analytics/components/ai_security/activity/types';
import type {
  AgentIdentity,
  AgentRow,
} from '../../../../../entity_analytics/components/ai_security/types';
import { getToolShellCommand } from '../../../../../entity_analytics/components/ai_security/utils';
import { buildActivityRows, getRootCommandLabel, type ActivityRow } from './activity_rows';
import { AskAiAboutRun } from './ask_ai_about_run';
import { formatSessionDuration, getLaunchLabel } from './session_labels';
import { SessionsSummary } from './sessions_summary';
import { AI_AGENT_TEST_IDS } from '../test_ids';

const SESSION_VIEW_LINK = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.activity.openProcessTree',
  { defaultMessage: 'Open in Session View' }
);
const UNNAMED_PROCESS = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.activity.unnamedProcess',
  { defaultMessage: 'Process with no name or command line recorded' }
);
const PROMPT_TEXT_NOT_LOGGED = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.activity.promptNotLogged',
  { defaultMessage: 'Prompt submitted, text not logged' }
);
const OTEL_BY_ACCOUNT = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.activity.otelByAccountTip',
  {
    defaultMessage:
      'Matched to this install by account and time. Steps from another install on the same account can show here.',
  }
);

/** Shortens a session ID for display; the full value is in the tooltip. */
const shortId = (id: string): string => (id.length > 12 ? `${id.slice(0, 8)}…` : id);

const MAX_LABEL_LENGTH = 300;

const getModelUsageLabel = ({ models, requests, inputTokens, outputTokens }: ModelUsage): string =>
  [
    models.join(', '),
    i18n.translate('xpack.securitySolution.flyout.entityDetails.aiAgent.activity.modelRequests', {
      defaultMessage: '{requests, plural, one {# request} other {# requests}}',
      values: { requests },
    }),
    i18n.translate('xpack.securitySolution.flyout.entityDetails.aiAgent.activity.modelTokens', {
      defaultMessage: '{tokens, plural, one {# token} other {# tokens}}',
      values: { tokens: inputTokens + outputTokens },
    }),
  ]
    .filter(Boolean)
    .join(' · ');

type OpenProcessTree = (step: ProcessStep) => void;

const CommandLabel = ({ label, fullText }: { label?: string; fullText?: string }) => {
  if (!label) {
    return (
      <EuiText size="xs" color="subdued">
        {UNNAMED_PROCESS}
      </EuiText>
    );
  }
  const code = (
    <EuiCode
      transparentBackground
      tabIndex={fullText ? 0 : undefined}
      css={css`
        word-break: break-all;
      `}
    >
      {label.length > MAX_LABEL_LENGTH ? `${label.slice(0, MAX_LABEL_LENGTH)}…` : label}
    </EuiCode>
  );
  return fullText ? <EuiToolTip content={fullText}>{code}</EuiToolTip> : code;
};

const StepBadges = ({
  isToolShell,
  ranAsOtherUser,
  sideEffects,
}: {
  isToolShell: boolean;
  ranAsOtherUser?: string;
  sideEffects?: SideEffects;
}) => {
  const hasSideEffects =
    !!sideEffects && (sideEffects.fileEvents > 0 || sideEffects.networkEvents > 0);
  if (!isToolShell && !ranAsOtherUser && !hasSideEffects) return null;
  return (
    <EuiFlexGroup gutterSize="xs" wrap responsive={false} alignItems="center">
      {isToolShell && (
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">
            <FormattedMessage
              id="xpack.securitySolution.flyout.entityDetails.aiAgent.activity.toolShell"
              defaultMessage="Tool shell"
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
      {sideEffects && hasSideEffects && (
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={[
              ...sideEffects.files,
              ...sideEffects.domains,
              ...sideEffects.destinations,
            ].join('\n')}
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
    </EuiFlexGroup>
  );
};

const ProcessStepRow = memo(
  ({
    step,
    label: labelOverride,
    onOpenProcessTree,
  }: {
    step: ProcessStep;
    /** Shown instead of the command line, which then moves to a tooltip. */
    label?: string;
    onOpenProcessTree: OpenProcessTree;
  }) => {
    const { process, sideEffects, ranAsOtherUser } = step;
    const toolCommand = getToolShellCommand(process.commandLine);
    const label = labelOverride ?? toolCommand ?? process.commandLine ?? process.name;
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
          <CommandLabel
            label={label}
            fullText={label !== process.commandLine ? process.commandLine : undefined}
          />
          <StepBadges
            isToolShell={toolCommand !== undefined}
            ranAsOtherUser={ranAsOtherUser}
            sideEffects={sideEffects}
          />
        </EuiFlexItem>
        {canOpenTree && (
          <EuiFlexItem grow={false}>
            <EuiToolTip content={SESSION_VIEW_LINK} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="commandLine"
                size="xs"
                aria-label={SESSION_VIEW_LINK}
                onClick={() => onOpenProcessTree(step)}
                data-test-subj={AI_AGENT_TEST_IDS.sessionViewLink}
              />
            </EuiToolTip>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }
);
ProcessStepRow.displayName = 'ProcessStepRow';

const ToolCallContent = memo(
  ({
    step,
    nested,
    onOpenProcessTree,
  }: {
    step: ToolCallStep;
    nested: readonly ProcessStep[];
    onOpenProcessTree: OpenProcessTree;
  }) => {
    const { euiTheme } = useEuiTheme();
    return (
      <>
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
        </EuiFlexGroup>
        {nested.length > 0 && (
          <EuiFlexGroup
            direction="column"
            gutterSize="xs"
            data-test-subj={AI_AGENT_TEST_IDS.toolCallProcesses}
            css={css`
              margin-top: ${euiTheme.size.xs};
              margin-left: ${euiTheme.size.s};
              padding-left: ${euiTheme.size.m};
              border-left: ${euiTheme.border.thin};
            `}
          >
            {nested.map((child) => (
              <EuiFlexItem key={child.process.entityId}>
                <ProcessStepRow step={child} onOpenProcessTree={onOpenProcessTree} />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        )}
      </>
    );
  }
);
ToolCallContent.displayName = 'ToolCallContent';

const StepContent = ({
  step,
  onOpenProcessTree,
}: {
  step: ActivityStep;
  onOpenProcessTree: OpenProcessTree;
}) => {
  switch (step.kind) {
    case 'process':
      return <ProcessStepRow step={step} onOpenProcessTree={onOpenProcessTree} />;
    case 'prompt':
      return (
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
        </EuiFlexGroup>
      );
    case 'tool_call':
      return <ToolCallContent step={step} nested={[]} onOpenProcessTree={onOpenProcessTree} />;
    case 'otel_event':
      return (
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
        </EuiFlexGroup>
      );
  }
};

const RowView = memo(
  ({ row, onOpenProcessTree }: { row: ActivityRow; onOpenProcessTree: OpenProcessTree }) => {
    const { euiTheme } = useEuiTheme();
    return (
      <EuiFlexGroup
        gutterSize="s"
        responsive={false}
        alignItems="flexStart"
        data-test-subj={`${AI_AGENT_TEST_IDS.step}-${row.step.kind}`}
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
            <PreferenceFormattedDate value={new Date(row.step.timestamp)} dateFormat="HH:mm:ss" />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem
          css={css`
            min-width: 0;
          `}
        >
          {row.kind === 'tool_call' ? (
            <ToolCallContent
              step={row.step}
              nested={row.children}
              onOpenProcessTree={onOpenProcessTree}
            />
          ) : (
            <StepContent step={row.step} onOpenProcessTree={onOpenProcessTree} />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
RowView.displayName = 'RowView';

const visibleSteps = (steps: readonly ActivityStep[], showSetup: boolean): ActivityStep[] =>
  showSetup ? [...steps] : steps.filter((step) => step.kind !== 'process' || !step.isSetup);

const Rows = ({
  steps,
  showSetup,
  headlessPrompt,
  onOpenProcessTree,
}: {
  steps: readonly ActivityStep[];
  showSetup: boolean;
  headlessPrompt?: string;
  onOpenProcessTree: OpenProcessTree;
}) => {
  const rows = useMemo(
    () => buildActivityRows(visibleSteps(steps, showSetup), headlessPrompt),
    [steps, showSetup, headlessPrompt]
  );
  return (
    <>
      {rows.map((row, index) => (
        <RowView
          key={`${row.step.kind}-${row.step.timestamp}-${index}`}
          row={row}
          onOpenProcessTree={onOpenProcessTree}
        />
      ))}
    </>
  );
};

const SectionView = memo(
  ({
    section,
    showSetup,
    headlessPrompt,
    isMatchedByAccount,
    onOpenProcessTree,
  }: {
    section: ActivitySection;
    showSetup: boolean;
    headlessPrompt?: string;
    isMatchedByAccount: boolean;
    onOpenProcessTree: OpenProcessTree;
  }) => (
    <>
      {section.sessionId && (
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <EuiToolTip content={section.sessionId}>
              <EuiText size="xs" tabIndex={0}>
                <strong>
                  <FormattedMessage
                    id="xpack.securitySolution.flyout.entityDetails.aiAgent.activity.conversation"
                    defaultMessage="Conversation {id}"
                    values={{ id: shortId(section.sessionId) }}
                  />
                </strong>
              </EuiText>
            </EuiToolTip>
          </EuiFlexItem>
          {isMatchedByAccount && (
            <EuiFlexItem grow={false}>
              <EuiIconTip
                type="info"
                color="subdued"
                content={OTEL_BY_ACCOUNT}
                aria-label={OTEL_BY_ACCOUNT}
                iconProps={{ 'data-test-subj': AI_AGENT_TEST_IDS.otelByAccount }}
              />
            </EuiFlexItem>
          )}
          {section.modelUsage && (
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {getModelUsageLabel(section.modelUsage)}
              </EuiText>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      )}
      <Rows
        steps={section.steps}
        showSetup={showSetup}
        headlessPrompt={headlessPrompt}
        onOpenProcessTree={onOpenProcessTree}
      />
      <EuiSpacer size="s" />
    </>
  )
);
SectionView.displayName = 'SectionView';

const RunStatusBadge = ({ status }: { status?: RunStatus }) => {
  if (status?.kind === 'running') {
    return (
      <EuiBadge color="accent" data-test-subj={AI_AGENT_TEST_IDS.runStatus}>
        <FormattedMessage
          id="xpack.securitySolution.flyout.entityDetails.aiAgent.activity.runningNow"
          defaultMessage="Running now"
        />
      </EuiBadge>
    );
  }
  if (status?.kind === 'stale') {
    return (
      <EuiBadge color="hollow" data-test-subj={AI_AGENT_TEST_IDS.runStatus}>
        <FormattedMessage
          id="xpack.securitySolution.flyout.entityDetails.aiAgent.activity.noEndEventSince"
          defaultMessage="No end event since {time}"
          values={{ time: <PreferenceFormattedDate value={new Date(status.since)} /> }}
        />
      </EuiBadge>
    );
  }
  return null;
};

const getOutsideLabel = ({ filesOutside, destinations, workingDirectory }: RunReach) => {
  const files = filesOutside.length;
  const destinationCount = destinations.length;
  if (!workingDirectory) {
    return destinationCount > 0
      ? i18n.translate(
          'xpack.securitySolution.flyout.entityDetails.aiAgent.activity.reach.destinations',
          {
            defaultMessage:
              '{destinations, plural, one {# network destination} other {# network destinations}}',
            values: { destinations: destinationCount },
          }
        )
      : undefined;
  }
  if (files > 0 && destinationCount > 0) {
    return i18n.translate(
      'xpack.securitySolution.flyout.entityDetails.aiAgent.activity.reach.filesAndDestinationsOutside',
      {
        defaultMessage:
          '{files, plural, one {# file} other {# files}} and {destinations, plural, one {# network destination} other {# network destinations}} outside {directory}',
        values: { files, destinations: destinationCount, directory: workingDirectory },
      }
    );
  }
  if (files > 0) {
    return i18n.translate(
      'xpack.securitySolution.flyout.entityDetails.aiAgent.activity.reach.filesOutside',
      {
        defaultMessage: '{files, plural, one {# file} other {# files}} outside {directory}',
        values: { files, directory: workingDirectory },
      }
    );
  }
  if (destinationCount > 0) {
    return i18n.translate(
      'xpack.securitySolution.flyout.entityDetails.aiAgent.activity.reach.destinationsOutside',
      {
        defaultMessage:
          '{destinations, plural, one {# network destination} other {# network destinations}} outside {directory}',
        values: { destinations: destinationCount, directory: workingDirectory },
      }
    );
  }
  return undefined;
};

const HEADLESS = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.activity.reach.headless',
  { defaultMessage: 'headless' }
);
const PERMISSION_PROMPTS_OFF = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.activity.reach.permissionPromptsOff',
  { defaultMessage: 'permission prompts off' }
);
const HEADLESS_BADGE = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.activity.headlessBadge',
  { defaultMessage: 'Headless' }
);
const PERMISSION_PROMPTS_OFF_BADGE = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.activity.permissionPromptsOffBadge',
  { defaultMessage: 'Permission prompts off' }
);

/**
 * One line under the run header: how it was launched, whether it was headless or ran with
 * permission prompts off, and what it touched outside its working directory. Parts with no data
 * are left out rather than shown as zero.
 */
const ReachLine = ({ run }: { run: AgentRun }) => {
  const { reach } = run;
  const outside = getOutsideLabel(reach);
  const parts: Array<{ key: string; node: React.ReactNode }> = [
    ...(run.launchMode !== 'unknown' || run.root.entryLeaderName
      ? [{ key: 'launch', node: getLaunchLabel(run) }]
      : []),
    ...(run.isHeadless ? [{ key: 'headless', node: HEADLESS }] : []),
    ...(reach.permissionPromptsOff
      ? [
          {
            key: 'permissions',
            node: <EuiTextColor color="danger">{PERMISSION_PROMPTS_OFF}</EuiTextColor>,
          },
        ]
      : []),
    ...(outside
      ? [
          {
            key: 'outside',
            node: (
              <EuiToolTip
                content={[...reach.filesOutside, ...reach.destinations].slice(0, 20).join('\n')}
              >
                <span tabIndex={0}>{outside}</span>
              </EuiToolTip>
            ),
          },
        ]
      : []),
  ];
  if (parts.length === 0) return null;
  return (
    <EuiText size="xs" color="subdued" data-test-subj={AI_AGENT_TEST_IDS.reachLine}>
      {parts.map(({ key, node }, index) => (
        <React.Fragment key={key}>
          {index > 0 && ' · '}
          {node}
        </React.Fragment>
      ))}
    </EuiText>
  );
};

/** What a session did: Ask AI, the reach line, the headless prompt and the steps. */
const RunBody = memo(
  ({
    run,
    identity,
    agentRow,
    showSetup,
    isMatchedByAccount,
    onOpenProcessTree,
  }: {
    run: AgentRun;
    identity: AgentIdentity;
    agentRow?: AgentRow;
    showSetup: boolean;
    isMatchedByAccount: boolean;
    onOpenProcessTree: OpenProcessTree;
  }) => {
    const rootStep: ProcessStep = {
      kind: 'process',
      timestamp: run.root.timestamp,
      process: run.root,
      isAgentProcess: true,
      isSetup: false,
    };
    const headlessPrompt = run.isHeadless ? run.headlessPrompt : undefined;
    return (
      <>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem
            css={css`
              min-width: 0;
            `}
          >
            <ReachLine run={run} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <AskAiAboutRun identity={identity} agent={agentRow} run={run} />
          </EuiFlexItem>
        </EuiFlexGroup>
        {headlessPrompt && (
          <>
            <EuiSpacer size="xs" />
            <EuiPanel
              color="subdued"
              paddingSize="s"
              hasShadow={false}
              data-test-subj={AI_AGENT_TEST_IDS.headlessPrompt}
            >
              <EuiText size="xs">
                <strong>
                  <FormattedMessage
                    id="xpack.securitySolution.flyout.entityDetails.aiAgent.activity.headlessPromptLabel"
                    defaultMessage="Prompt"
                  />
                </strong>
                <p>{headlessPrompt}</p>
              </EuiText>
            </EuiPanel>
          </>
        )}
        <EuiSpacer size="xs" />
        <ProcessStepRow
          step={rootStep}
          label={
            run.isHeadless ? getRootCommandLabel(run.root.commandLine, headlessPrompt) : undefined
          }
          onOpenProcessTree={onOpenProcessTree}
        />
        <EuiSpacer size="s" />
        {run.sections.map((section, index) => (
          <SectionView
            key={section.sessionId ?? `no-session-${index}`}
            section={section}
            showSetup={showSetup}
            headlessPrompt={headlessPrompt}
            isMatchedByAccount={isMatchedByAccount}
            onOpenProcessTree={onOpenProcessTree}
          />
        ))}
      </>
    );
  }
);
RunBody.displayName = 'RunBody';

const isSetupStep = (step: ActivityStep): boolean => step.kind === 'process' && step.isSetup;

interface SessionProps {
  readonly agent: AgentRow | AgentIdentity;
  readonly sessions: AgentSessions;
  readonly session: AgentSession;
  readonly onOpenProcessTree: OpenProcessTree;
}

/** The second read: what one session did, loaded when its row is expanded. */
const SessionDetail = ({ agent, sessions, session, onOpenProcessTree }: SessionProps) => {
  const { data, isLoading, isError } = useAiAgentSessionDetail({ agent, sessions, session });
  const [showSetup, setShowSetup] = useState(false);
  const setupCount = useMemo(
    () =>
      data
        ? [
            ...(data.run?.sections.flatMap((section) => section.steps) ?? []),
            ...data.unplacedSteps,
          ].filter(isSetupStep).length
        : 0,
    [data]
  );

  if (isLoading) return <EuiSkeletonText lines={3} size="s" />;
  if (isError || !data) {
    return (
      <KbnDangerCallout
        announceOnMount
        size="s"
        title={i18n.translate(
          'xpack.securitySolution.flyout.entityDetails.aiAgent.activity.detailError',
          { defaultMessage: 'What this session did could not be loaded' }
        )}
      />
    );
  }

  const agentRow = 'watchlistIds' in agent ? agent : undefined;
  return (
    <div data-test-subj={AI_AGENT_TEST_IDS.sessionDetail}>
      {data.truncated && (
        <EuiText size="xs" color="warning">
          <FormattedMessage
            id="xpack.securitySolution.flyout.entityDetails.aiAgent.activity.detailTruncated"
            defaultMessage="Only the newest steps are shown. This session has more activity than one read returns."
          />
        </EuiText>
      )}
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
      {data.run && (
        <RunBody
          run={data.run}
          identity={agent}
          agentRow={agentRow}
          showSetup={showSetup}
          isMatchedByAccount={data.otelMatch === 'account'}
          onOpenProcessTree={onOpenProcessTree}
        />
      )}
      {data.unplacedSteps.length > 0 && (
        <EuiPanel
          color="subdued"
          hasShadow={false}
          paddingSize="s"
          data-test-subj={AI_AGENT_TEST_IDS.unplacedSteps}
        >
          <EuiTitle size="xxs">
            <h4>
              <FormattedMessage
                id="xpack.securitySolution.flyout.entityDetails.aiAgent.activity.unplacedTitle"
                defaultMessage="Steps not tied to a session"
              />
            </h4>
          </EuiTitle>
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.securitySolution.flyout.entityDetails.aiAgent.activity.unplacedBody"
              defaultMessage="Descendants of this install in this session's time range whose parent process was not recorded."
            />
          </EuiText>
          <Rows
            steps={data.unplacedSteps}
            showSetup={showSetup}
            onOpenProcessTree={onOpenProcessTree}
          />
        </EuiPanel>
      )}
    </div>
  );
};

const SessionLength = ({ session }: { session: AgentSession }) => {
  if (session.status?.kind === 'running' || session.status?.kind === 'stale') {
    return <RunStatusBadge status={session.status} />;
  }
  if (!session.end) return null;
  return (
    <EuiText size="xs" color="subdued" data-test-subj={AI_AGENT_TEST_IDS.sessionDuration}>
      {formatSessionDuration(new Date(session.end).getTime() - new Date(session.start).getTime())}
    </EuiText>
  );
};

/** The collapsed row: start, length or status, launch mode, flags and alert count. */
const SessionRowHeader = ({ session }: { session: AgentSession }) => (
  <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
    <EuiFlexItem grow={false}>
      <EuiText size="s">
        <strong>
          <PreferenceFormattedDate value={new Date(session.start)} />
        </strong>
      </EuiText>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <SessionLength session={session} />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiText size="xs" color="subdued">
        {getLaunchLabel(session)}
      </EuiText>
    </EuiFlexItem>
    {(session.isHeadless || session.permissionPromptsOff) && (
      <EuiFlexItem grow={false} data-test-subj={AI_AGENT_TEST_IDS.sessionFlags}>
        <EuiFlexGroup gutterSize="xs" responsive={false}>
          {session.isHeadless && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">{HEADLESS_BADGE}</EuiBadge>
            </EuiFlexItem>
          )}
          {session.permissionPromptsOff && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="warning">{PERMISSION_PROMPTS_OFF_BADGE}</EuiBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
    )}
    {session.alertIds.length > 0 && (
      <EuiFlexItem grow={false}>
        <EuiBadge color="danger" data-test-subj={AI_AGENT_TEST_IDS.sessionAlerts}>
          <FormattedMessage
            id="xpack.securitySolution.flyout.entityDetails.aiAgent.activity.sessionAlerts"
            defaultMessage="{count, plural, one {# alert} other {# alerts}}"
            values={{ count: session.alertIds.length }}
          />
        </EuiBadge>
      </EuiFlexItem>
    )}
  </EuiFlexGroup>
);

/** Sessions with alerts and sessions still running start expanded. */
const SessionRow = memo(({ agent, sessions, session, onOpenProcessTree }: SessionProps) => {
  const [isOpen, setIsOpen] = useState(
    () => session.alertIds.length > 0 || session.status?.kind === 'running'
  );
  const accordionId = useGeneratedHtmlId({ prefix: 'aiAgentSession' });
  return (
    <EuiPanel hasBorder paddingSize="s" data-test-subj={AI_AGENT_TEST_IDS.session}>
      <EuiAccordion
        id={accordionId}
        buttonContent={<SessionRowHeader session={session} />}
        forceState={isOpen ? 'open' : 'closed'}
        onToggle={setIsOpen}
        buttonProps={{ 'data-test-subj': AI_AGENT_TEST_IDS.sessionToggle }}
      >
        {isOpen && (
          <>
            <EuiSpacer size="s" />
            <SessionDetail
              agent={agent}
              sessions={sessions}
              session={session}
              onOpenProcessTree={onOpenProcessTree}
            />
          </>
        )}
      </EuiAccordion>
    </EuiPanel>
  );
});
SessionRow.displayName = 'SessionRow';

export const SESSIONS_PAGE_SIZE = 20;

export interface AgentActivityProps {
  readonly agent: AgentRow | AgentIdentity;
}

/**
 * Agent activity: the agent's sessions in the last 30 days. A summary and a sessions-per-day
 * histogram sit above one collapsed row per session, newest first. Expanding a row reads what that
 * session did. Process steps open Session View for their terminal session.
 */
export const AgentActivity = memo(({ agent }: AgentActivityProps) => {
  const { data, isLoading, isError } = useAiAgentSessions(agent);
  const { openSessionView } = useFlyoutApi();
  const [visibleCount, setVisibleCount] = useState(SESSIONS_PAGE_SIZE);

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

  if (isLoading) return <EuiSkeletonText lines={6} />;
  if (isError || !data) {
    return (
      <KbnDangerCallout
        announceOnMount
        title={i18n.translate(
          'xpack.securitySolution.flyout.entityDetails.aiAgent.activity.error',
          { defaultMessage: 'Agent activity could not be loaded' }
        )}
      />
    );
  }

  const { sessions } = data;
  const shown = sessions.slice(0, visibleCount);

  return (
    <div data-test-subj={AI_AGENT_TEST_IDS.activity}>
      <SessionsSummary data={data} />
      <EuiSpacer size="m" />
      {data.truncated && (
        <>
          <EuiText size="xs" color="warning" data-test-subj={AI_AGENT_TEST_IDS.sessionsTruncated}>
            <FormattedMessage
              id="xpack.securitySolution.flyout.entityDetails.aiAgent.activity.truncated"
              defaultMessage="Only the newest sessions are shown. This agent has more activity in 30 days than one read returns."
            />
          </EuiText>
          <EuiSpacer size="s" />
        </>
      )}
      {shown.map((session) => (
        <React.Fragment key={session.id}>
          <SessionRow
            agent={agent}
            sessions={data}
            session={session}
            onOpenProcessTree={onOpenProcessTree}
          />
          <EuiSpacer size="s" />
        </React.Fragment>
      ))}
      {sessions.length > shown.length && (
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              flush="left"
              onClick={() => setVisibleCount((count) => count + SESSIONS_PAGE_SIZE)}
              data-test-subj={AI_AGENT_TEST_IDS.sessionsShowMore}
            >
              <FormattedMessage
                id="xpack.securitySolution.flyout.entityDetails.aiAgent.activity.showMore"
                defaultMessage="Show more"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              <FormattedMessage
                id="xpack.securitySolution.flyout.entityDetails.aiAgent.activity.showingCount"
                defaultMessage="Showing {shown} of {total}"
                values={{ shown: shown.length, total: sessions.length }}
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </div>
  );
});
AgentActivity.displayName = 'AgentActivity';
