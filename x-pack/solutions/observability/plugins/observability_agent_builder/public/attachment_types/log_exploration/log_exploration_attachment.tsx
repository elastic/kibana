/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { ActionButtonType, type ActionButton } from '@kbn/agent-builder-browser/attachments';
import type { LogExplorationData } from '../../../common/log_exploration';
import { logExplorationDataSchema } from '../../../common/log_exploration';
import { useLogExplorationState } from './use_log_exploration_state';
import type { FetchLogExplorationView } from './fetch_log_exploration_view';
import { ExplorationControls } from './exploration_controls';
import { PatternTable } from './pattern_table';
import { BaselineHistogram } from './baseline_histogram';

export interface LogExplorationAttachmentProps {
  attachment: Attachment<string, unknown>;
  charts: ChartsPluginStart;
  fetchView: FetchLogExplorationView;
  updateContent?: (data: unknown, description?: string) => Promise<void>;
  submitMessage?: (message: string) => void;
  registerActionButtons?: (buttons: ActionButton[]) => void;
}

export const LogExplorationAttachment: React.FC<LogExplorationAttachmentProps> = ({
  attachment,
  charts,
  fetchView,
  updateContent,
  submitMessage,
  registerActionButtons,
}) => {
  const parsed = useMemo(
    () => logExplorationDataSchema.safeParse(attachment.data),
    [attachment.data]
  );
  const [persistError, setPersistError] = useState<string | null>(null);

  // Rounds pin their own version, so an older round renders stale data. Writing from it would derive
  // a payload from that stale base and clobber everything since, so writes are disabled. Agent-turn
  // actions stay available: they only send a prompt, and the agent reads live state.
  const { version, versionCount } = attachment.versionData ?? {};
  const isReadOnly = version !== undefined && versionCount !== undefined && version < versionCount;

  const onPersistError = useCallback((error: Error) => setPersistError(error.message), []);

  const { data, dispatch, flushPendingWrites, isFetching, fetchError } = useLogExplorationState({
    initialData: (parsed.success ? parsed.data : EMPTY_DATA) as LogExplorationData,
    updateContent,
    // A superseded render must not write, and a refetch always ends in a write.
    fetchView: isReadOnly ? undefined : fetchView,
    onPersistError,
  });

  // The flush leaves a window in which a second click would submit a second message for the same
  // interaction, and for a comparison the two would disagree about which pattern is scoped.
  const isStartingTurnRef = useRef(false);

  const startTurn = useCallback(
    async (message: string) => {
      if (isStartingTurnRef.current) {
        return;
      }
      isStartingTurnRef.current = true;
      try {
        // The turn remounts this subtree from server state, so pending writes must land first.
        await flushPendingWrites();
        submitMessage?.(message);
      } finally {
        isStartingTurnRef.current = false;
      }
    },
    [flushPendingWrites, submitMessage]
  );

  useEffect(() => {
    if (!registerActionButtons || !submitMessage) {
      return;
    }
    // One action per lens, and never zero: `AttachmentHeader` returns null without buttons, taking
    // the title, icon and badges with it.
    const action =
      data.view.type === 'pattern-table'
        ? {
            label: i18n.translate(
              'xpack.observabilityAgentBuilder.logExploration.summarizePatternsLabel',
              { defaultMessage: 'Summarize top patterns' }
            ),
            message:
              'Summarize what the un-muted log patterns show: which ones dominate the cut, which are rising or falling, which look related, and what is worth investigating or muting next. Do not include muted patterns, and do not simply list the rows back.',
          }
        : {
            label: i18n.translate(
              'xpack.observabilityAgentBuilder.logExploration.explainVolumeChangeLabel',
              { defaultMessage: 'Explain this change' }
            ),
            message:
              'Explain how log volume in the current time range compares with the baseline epoch.',
          };

    registerActionButtons([
      {
        label: action.label,
        icon: 'sparkles',
        type: ActionButtonType.PRIMARY,
        handler: () => startTurn(action.message),
      },
    ]);
    // Re-register on every state change so the handler closes over current state, not stale state.
  }, [registerActionButtons, submitMessage, startTurn, data]);

  const onInvestigate = useCallback(
    (pattern: string) => startTurn(`Investigate why the log pattern "${pattern}" is occurring.`),
    [startTurn]
  );

  const onCompareBaseline = useCallback(
    (pattern: string) => {
      // The scope reaches the tool as loop state, never as pattern text in the message: a
      // paraphrased pattern would be a silently wrong filter rather than an error. `startTurn`
      // awaits the refetch this dispatch begins, so the refinement is written before the turn.
      dispatch({
        type: 'ADD_REFINEMENT',
        refinement: { kind: 'only-pattern', origin: 'user', pattern },
      });
      return startTurn(
        'Compare log volume against the baseline epoch for the pattern the view is now scoped to.'
      );
    },
    [dispatch, startTurn]
  );

  if (!parsed.success) {
    return (
      <EuiCallOut
        announceOnMount
        color="danger"
        iconType="error"
        size="s"
        title={i18n.translate('xpack.observabilityAgentBuilder.logExploration.invalidPayload', {
          defaultMessage: 'This log exploration view could not be rendered',
        })}
      >
        {parsed.error.message}
      </EuiCallOut>
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="s" css={{ padding: 12 }}>
      <EuiFlexItem grow={false}>
        <ExplorationControls
          data={data}
          dispatch={dispatch}
          isReadOnly={isReadOnly}
          isFetching={isFetching}
        />
      </EuiFlexItem>
      {fetchError && (
        <EuiFlexItem grow={false}>
          <EuiCallOut
            announceOnMount
            color="warning"
            size="s"
            title={i18n.translate('xpack.observabilityAgentBuilder.logExploration.fetchFailed', {
              defaultMessage: 'Could not refresh this view. The previous window has been restored.',
            })}
          >
            {fetchError}
          </EuiCallOut>
        </EuiFlexItem>
      )}
      {persistError && (
        <EuiFlexItem grow={false}>
          <EuiCallOut
            announceOnMount
            color="warning"
            size="s"
            title={i18n.translate('xpack.observabilityAgentBuilder.logExploration.persistFailed', {
              defaultMessage: 'Could not save that change. The view has been reverted.',
            })}
          />
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false} aria-busy={isFetching} css={{ opacity: isFetching ? 0.5 : 1 }}>
        {data.view.type === 'pattern-table' ? (
          <PatternTable
            data={data}
            dispatch={dispatch}
            charts={charts}
            onInvestigate={onInvestigate}
            onCompareBaseline={onCompareBaseline}
            isReadOnly={isReadOnly}
          />
        ) : (
          <BaselineHistogram
            data={data}
            dispatch={dispatch}
            charts={charts}
            isReadOnly={isReadOnly}
          />
        )}
      </EuiFlexItem>
      <EuiSpacer size="xs" />
    </EuiFlexGroup>
  );
};

const EMPTY_DATA: LogExplorationData = {
  source: { index: '', messageField: 'message', timeRange: { start: 'now-1h', end: 'now' } },
  refinements: [],
  view: { type: 'pattern-table' },
  result: { type: 'pattern-table', patterns: [], generatedAt: '' },
};
