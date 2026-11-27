/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
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
} from '@elastic/eui';
import { css } from '@emotion/react';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { PreferenceFormattedDate } from '../../../../../common/components/formatted_date';
import { useFlyoutApi } from '../../../../use_flyout_api';
import { FLYOUT_ORIGIN } from '../../../../../common/lib/telemetry';
import { useAiAgentActivity } from '../../../../../entity_analytics/components/ai_security/hooks/use_ai_agents';
import type {
  ActivitySection,
  ActivityStep,
  AgentRun,
  LaunchMode,
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
import { AI_AGENT_TEST_IDS } from '../test_ids';

const LAUNCH_MODE_LABELS: Readonly<Record<LaunchMode, string>> = {
  interactive: i18n.translate(
    'xpack.securitySolution.flyout.entityDetails.aiAgent.activity.launch.interactive',
    { defaultMessage: 'Interactive' }
  ),
  scripted: i18n.translate(
    'xpack.securitySolution.flyout.entityDetails.aiAgent.activity.launch.scripted',
    { defaultMessage: 'Scripted' }
  ),
  scheduled: i18n.translate(
    'xpack.securitySolution.flyout.entityDetails.aiAgent.activity.launch.scheduled',
    { defaultMessage: 'Scheduled' }
  ),
  unknown: i18n.translate(
    'xpack.securitySolution.flyout.entityDetails.aiAgent.activity.launch.unknown',
    { defaultMessage: 'Launch mode unknown' }
  ),
};

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

const getLaunchLabel = ({ launchMode, root }: AgentRun): string =>
  root.entryLeaderName
    ? i18n.translate(
        'xpack.securitySolution.flyout.entityDetails.aiAgent.activity.launchWithLeader',
        {
          defaultMessage: '{mode} ({leader})',
          values: { mode: LAUNCH_MODE_LABELS[launchMode], leader: root.entryLeaderName },
        }
      )
    : LAUNCH_MODE_LABELS[launchMode];

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
                    id="xpack.securitySolution.flyout.entityDetails.aiAgent.activity.agentSession"
                    defaultMessage="Agent session {id}"
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
  const values = {
    files: filesOutside.length,
    destinations: destinations.length,
    directory: workingDirectory ?? '',
  };
  if (!workingDirectory) {
    return destinations.length > 0
      ? i18n.translate(
          'xpack.securitySolution.flyout.entityDetails.aiAgent.activity.reach.destinations',
          {
            defaultMessage:
              '{destinations, plural, one {# network destination} other {# network destinations}}',
            values,
          }
        )
      : undefined;
  }
  if (filesOutside.length > 0 && destinations.length > 0) {
    return i18n.translate(
      'xpack.securitySolution.flyout.entityDetails.aiAgent.activity.reach.filesAndDestinationsOutside',
      {
        defaultMessage:
          '{files, plural, one {# file} other {# files}} and {destinations, plural, one {# network destination} other {# network destinations}} outside {directory}',
        values,
      }
    );
  }
  if (filesOutside.length > 0) {
    return i18n.translate(
      'xpack.securitySolution.flyout.entityDetails.aiAgent.activity.reach.filesOutside',
      {
        defaultMessage: '{files, plural, one {# file} other {# files}} outside {directory}',
        values,
      }
    );
  }
  if (destinations.length > 0) {
    return i18n.translate(
      'xpack.securitySolution.flyout.entityDetails.aiAgent.activity.reach.destinationsOutside',
      {
        defaultMessage:
          '{destinations, plural, one {# network destination} other {# network destinations}} outside {directory}',
        values,
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

const RunView = memo(
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
            <RunStatusBadge status={run.status} />
          </EuiFlexItem>
          <EuiFlexItem />
          <EuiFlexItem grow={false}>
            <AskAiAboutRun identity={identity} agent={agentRow} run={run} />
          </EuiFlexItem>
        </EuiFlexGroup>
        <ReachLine run={run} />
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
      </EuiPanel>
    );
  }
);
RunView.displayName = 'RunView';

export interface AgentActivityProps {
  readonly agent: AgentRow | AgentIdentity;
}

/**
 * Agent activity: one panel per run (launch), with the steps from every source that exists. Tool
 * calls carry the processes they ran. Process steps open Session View for their terminal session.
 */
export const AgentActivity = memo(({ agent }: AgentActivityProps) => {
  const { data, isLoading, isError } = useAiAgentActivity(agent);
  const { openSessionView } = useFlyoutApi();
  const [showSetup, setShowSetup] = useState(false);

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
          { defaultMessage: 'Agent activity could not be loaded' }
        )}
      />
    );
  }

  const isMatchedByAccount = data.otelMatch === 'account';
  const agentRow = 'watchlistIds' in agent ? agent : undefined;

  return (
    <div data-test-subj={AI_AGENT_TEST_IDS.activity}>
      {!data.layers.defendRuns && (
        <EuiText size="s" color="subdued" data-test-subj={AI_AGENT_TEST_IDS.noProcessActivity}>
          <FormattedMessage
            id="xpack.securitySolution.flyout.entityDetails.aiAgent.activity.noProcessActivity"
            defaultMessage="No process activity since first seen"
          />
        </EuiText>
      )}
      {data.truncated && (
        <EuiText size="xs" color="warning">
          <FormattedMessage
            id="xpack.securitySolution.flyout.entityDetails.aiAgent.activity.truncated"
            defaultMessage="Only the first events are shown. This agent has more activity than one read returns."
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
      {data.runs.map((run) => (
        <React.Fragment key={run.id}>
          <RunView
            run={run}
            identity={agent}
            agentRow={agentRow}
            showSetup={showSetup}
            isMatchedByAccount={isMatchedByAccount}
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
          <Rows
            steps={data.unplacedSteps}
            showSetup={showSetup}
            onOpenProcessTree={onOpenProcessTree}
          />
        </EuiPanel>
      )}
    </div>
  );
});
AgentActivity.displayName = 'AgentActivity';
