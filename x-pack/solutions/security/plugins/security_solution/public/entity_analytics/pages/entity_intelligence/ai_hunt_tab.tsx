/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
  transparentize,
  useEuiTheme,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../common/lib/kibana';
import { SectionLabel } from './components';
import { hoverLift, staggeredEntrance } from './animations';
import { useStreamingConverse } from './hooks/use_streaming_converse';
import { useHuntHistory } from './hooks/use_hunt_history';
import type { ChatEntry } from './hunt_transcript';
import { AssistantMessage, TypingIndicator, useFollowUpSuggestions } from './hunt_transcript';
import type { IntelligenceEntity } from './common';
import type { HuntArtifact } from './hunt_artifacts';
import type { HuntActivity } from './hunt_stream_state';
import { HUNT_TEMPLATES, resolveHuntSubmission } from './hunt_prompt';
import type { HuntTemplate } from './hunt_prompt';
import { deriveHuntInputState } from './hunt_input_state';
import { HuntHistoryRail } from './hunt_history_panel';
import { buildCreateHuntRequest, fromPersistedStatus } from './hunt_history';
import type { HuntListItem } from '../../../../common/entity_analytics/ai_hunt_history/types';

const STOP_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.stop',
  { defaultMessage: 'Stop' }
);

const CANCELLED_NOTICE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.cancelled',
  { defaultMessage: 'Generation stopped.' }
);

export interface AiHuntTabProps {
  onDrillToExplorer: (entity: IntelligenceEntity) => void;
}

export const AiHuntTab: React.FC<AiHuntTabProps> = ({ onDrillToExplorer }) => {
  const { euiTheme } = useEuiTheme();
  const { agentBuilder, notifications } = useKibana().services;
  const { streamConverse, hasConnector } = useStreamingConverse();
  const huntHistory = useHuntHistory();

  const [input, setInput] = useState('');
  const [transcript, setTranscript] = useState<ChatEntry[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [isComposerManuallyOpen, setIsComposerManuallyOpen] = useState(false);
  // Id of the hunt currently open in the main area (highlighted in the rail).
  const [activeHuntId, setActiveHuntId] = useState<string | undefined>(undefined);
  // Analyst's explicit collapse preference for the history rail on wide screens.
  const [isRailManuallyCollapsed, setIsRailManuallyCollapsed] = useState(false);
  // On narrow screens the rail becomes an overlay flyout instead of squishing
  // the result; this tracks whether that flyout is open.
  const [isRailFlyoutOpen, setIsRailFlyoutOpen] = useState(false);
  const entryIdRef = useRef(0);
  const abortRef = useRef<AbortController | undefined>(undefined);
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);
  const hasAssistantOutputRef = useRef(false);
  // Entry ids that originate from a reopened saved hunt — never re-persisted.
  const reopenedEntryIdsRef = useRef<Set<number>>(new Set());

  const lastAssistantEntry = [...transcript].reverse().find((entry) => entry.role === 'assistant');
  const followUps = useFollowUpSuggestions(lastAssistantEntry?.content ?? '');

  // Auto-scroll to the newest content while a response streams in.
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    bottomAnchorRef.current?.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'end',
    });
  }, [transcript, isGenerating]);

  // Abort any in-flight stream when the tab unmounts.
  useEffect(() => () => abortRef.current?.abort(), []);

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const { saveHunt, getHunt } = huntHistory;

  // Persist a terminal hunt so analysts can recall it later. Reopened hunts are
  // skipped (they already exist) and failed hunts with no output are ignored.
  const persistCompletedHunt = useCallback(
    (entry: {
      id: number;
      huntPrompt?: string;
      scopedPrompt?: string;
      content: string;
      artifacts: HuntArtifact[];
      activities: HuntActivity[];
      status: 'running' | 'completed' | 'partial' | 'failed';
    }) => {
      if (reopenedEntryIdsRef.current.has(entry.id)) return;
      const question = entry.huntPrompt?.trim();
      if (!question) return;
      if (
        entry.status === 'failed' &&
        entry.content.trim() === '' &&
        entry.artifacts.length === 0
      ) {
        return;
      }
      saveHunt(
        buildCreateHuntRequest({
          question,
          scopedPrompt: entry.scopedPrompt,
          content: entry.content,
          artifacts: entry.artifacts,
          activities: entry.activities,
          status: entry.status,
        })
      ).catch(() => {
        // Persistence is best-effort; the hunt result is already on screen.
        notifications?.toasts?.addWarning({
          title: i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.history.saveError',
            { defaultMessage: 'Could not save this hunt to history.' }
          ),
        });
      });
    },
    [saveHunt, notifications]
  );

  // Escape cancels an in-flight generation.
  useEffect(() => {
    if (!isGenerating) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') stopGeneration();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isGenerating, stopGeneration]);

  const submitQuestion = useCallback(
    (question: string, template?: HuntTemplate) => {
      const trimmed = question.trim();
      if (trimmed === '' || isGenerating || !hasConnector) return;

      // The transcript and hunt canvas show the readable request; the agent
      // receives the same intent wrapped with evidence-scope instructions so it
      // hunts against `.alerts-security.alerts-*` / `logs-*` rather than the
      // entity store. Guided templates additionally keep their engineered
      // index/field text out of the analyst's view (only the readable intent is
      // displayed) while still sending the scoped request.
      const { displayText, scopedPrompt } = resolveHuntSubmission(trimmed, template);

      setError(undefined);
      setInput('');
      // A freshly-submitted hunt is not a saved-record reopen, so clear the
      // active highlight in the history rail.
      setActiveHuntId(undefined);
      // Collapse the composer so the result canvas owns the space once a hunt
      // is under way. The analyst re-opens it explicitly via "New hunt".
      setIsComposerManuallyOpen(false);
      hasAssistantOutputRef.current = false;

      const userEntryId = ++entryIdRef.current;
      const assistantEntryId = ++entryIdRef.current;
      const huntStartedAt = Date.now();
      setTranscript((previous) => [
        ...previous,
        { id: userEntryId, role: 'user', content: displayText },
      ]);
      setIsGenerating(true);

      const abortController = new AbortController();
      abortRef.current = abortController;

      const upsertAssistantEntry = (
        update: Partial<
          Pick<ChatEntry, 'content' | 'isStreaming' | 'artifacts' | 'activities' | 'status'>
        >
      ) => {
        hasAssistantOutputRef.current = true;
        setTranscript((previous) => {
          const existing = previous.find((entry) => entry.id === assistantEntryId);
          if (!existing) {
            return [
              ...previous,
              {
                id: assistantEntryId,
                role: 'assistant',
                content: '',
                isStreaming: true,
                status: 'running',
                huntPrompt: displayText,
                scopedPrompt,
                startedAt: huntStartedAt,
                ...update,
              },
            ];
          }
          return previous.map((entry) =>
            entry.id === assistantEntryId ? { ...entry, ...update } : entry
          );
        });
      };

      streamConverse({
        input: scopedPrompt,
        conversationId,
        signal: abortController.signal,
        callbacks: {
          onMessageUpdate: (accumulated) => {
            upsertAssistantEntry({ content: accumulated });
          },
          onActivitiesUpdate: (activities: HuntActivity[]) => {
            upsertAssistantEntry({ activities });
          },
          onArtifactsUpdate: (artifacts: HuntArtifact[]) => {
            upsertAssistantEntry({ artifacts });
          },
          onStatusUpdate: (status) => {
            upsertAssistantEntry({
              status,
              isStreaming: status === 'running',
            });
          },
          onConversationId: setConversationId,
        },
      })
        .then((result) => {
          if (result.conversationId) setConversationId(result.conversationId);
          if (result.message !== '') {
            upsertAssistantEntry({
              content: result.message,
              isStreaming: false,
              status: 'completed',
            });
          } else if (hasAssistantOutputRef.current) {
            upsertAssistantEntry({ isStreaming: false, status: 'completed' });
          }
        })
        .catch((streamError: Error) => {
          if (abortController.signal.aborted) {
            // Keep whatever partial content streamed in; mark it complete.
            if (hasAssistantOutputRef.current) {
              setTranscript((previous) =>
                previous.map((entry) =>
                  entry.id === assistantEntryId
                    ? { ...entry, isStreaming: false, status: 'partial' as const }
                    : entry
                )
              );
            } else {
              setError(CANCELLED_NOTICE);
            }
            return;
          }
          if (hasAssistantOutputRef.current) {
            upsertAssistantEntry({ isStreaming: false, status: 'failed' });
          }
          setError(streamError?.message ?? String(streamError));
        })
        .finally(() => {
          setIsGenerating(false);
          abortRef.current = undefined;
          // Persist the terminal hunt for later recall. Read the final entry
          // from state (functional read avoids a stale closure) and save it
          // once its content/artifacts/status are settled.
          setTranscript((previous) => {
            const finalEntry = previous.find((entry) => entry.id === assistantEntryId);
            if (
              finalEntry &&
              finalEntry.role === 'assistant' &&
              finalEntry.status &&
              finalEntry.status !== 'running'
            ) {
              persistCompletedHunt({
                id: finalEntry.id,
                huntPrompt: finalEntry.huntPrompt,
                scopedPrompt: finalEntry.scopedPrompt,
                content: finalEntry.content,
                artifacts: finalEntry.artifacts ?? [],
                activities: finalEntry.activities ?? [],
                status: finalEntry.status,
              });
            }
            return previous;
          });
        });
    },
    [isGenerating, hasConnector, streamConverse, conversationId, persistCompletedHunt]
  );

  const submit = useCallback(() => submitQuestion(input), [submitQuestion, input]);

  const openNewHunt = useCallback(() => {
    setIsComposerManuallyOpen(true);
    setError(undefined);
  }, []);

  const collapseComposer = useCallback(() => setIsComposerManuallyOpen(false), []);

  // Reopen a saved hunt: re-render its stored result in the canvas without
  // calling the LLM again. The reopened assistant entry is flagged so the
  // completion path never re-persists it.
  const reopenHunt = useCallback(
    (id: string) => {
      setError(undefined);
      setIsComposerManuallyOpen(false);
      setActiveHuntId(id);
      setIsRailFlyoutOpen(false);
      getHunt(id)
        .then((record) => {
          const userEntryId = ++entryIdRef.current;
          const assistantEntryId = ++entryIdRef.current;
          reopenedEntryIdsRef.current.add(assistantEntryId);
          const status = fromPersistedStatus(record.status);
          setTranscript((previous) => [
            ...previous,
            { id: userEntryId, role: 'user', content: record.question },
            {
              id: assistantEntryId,
              role: 'assistant',
              content: record.result.content ?? '',
              isStreaming: false,
              status,
              huntPrompt: record.question,
              scopedPrompt: record.scopedPrompt,
              startedAt: Date.parse(record.createdAt) || Date.now(),
              artifacts: (record.result.artifacts ?? []) as unknown as HuntArtifact[],
              activities: (record.result.activities ?? []) as unknown as HuntActivity[],
            },
          ]);
        })
        .catch(() => {
          notifications?.toasts?.addWarning({
            title: i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.history.reopenError',
              { defaultMessage: 'Could not reopen this hunt.' }
            ),
          });
        });
    },
    [getHunt, notifications]
  );

  // Rerun a saved hunt by re-submitting its question through the normal
  // scoped-prompt submission path (a fresh LLM call).
  const rerunHunt = useCallback(
    (hunt: HuntListItem) => {
      setIsRailFlyoutOpen(false);
      submitQuestion(hunt.question);
    },
    [submitQuestion]
  );

  const togglePinnedHunt = useCallback(
    (hunt: HuntListItem) => {
      huntHistory.setPinned(hunt.id, !hunt.pinned).catch(() => {
        notifications?.toasts?.addWarning({
          title: i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.history.pinError',
            { defaultMessage: 'Could not update the pinned state.' }
          ),
        });
      });
    },
    [huntHistory, notifications]
  );

  const renameHunt = useCallback(
    (id: string, name: string | null) => {
      huntHistory.renameHunt(id, name).catch(() => {
        notifications?.toasts?.addWarning({
          title: i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.history.renameError',
            { defaultMessage: 'Could not rename this hunt.' }
          ),
        });
      });
    },
    [huntHistory, notifications]
  );

  const deleteHunt = useCallback(
    (id: string) => {
      huntHistory.deleteHunt(id).catch(() => {
        notifications?.toasts?.addWarning({
          title: i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.history.deleteError',
            { defaultMessage: 'Could not delete this hunt.' }
          ),
        });
      });
    },
    [huntHistory, notifications]
  );

  const inputState = useMemo(
    () =>
      deriveHuntInputState({
        transcriptLength: transcript.length,
        isGenerating,
        isComposerManuallyOpen,
      }),
    [transcript.length, isGenerating, isComposerManuallyOpen]
  );

  // Below `l` the rail becomes an overlay flyout rather than squishing the
  // result; at/above `l` it is an inline, collapsible column.
  const isNarrow = useIsWithinBreakpoints(['xs', 's', 'm']);
  const isRailInlineCollapsed = isRailManuallyCollapsed;
  const toggleRail = useCallback(() => {
    if (isNarrow) {
      setIsRailFlyoutOpen((open) => !open);
    } else {
      setIsRailManuallyCollapsed((collapsed) => !collapsed);
    }
  }, [isNarrow]);

  // Shared props for the history rail across its inline and flyout renders.
  const railProps = useMemo(
    () => ({
      hunts: huntHistory.hunts,
      isLoading: huntHistory.isLoading,
      isError: huntHistory.isError,
      activeHuntId,
      disabled: isGenerating,
      onReopen: reopenHunt,
      onRerun: rerunHunt,
      onRename: renameHunt,
      onTogglePinned: togglePinnedHunt,
      onDelete: deleteHunt,
    }),
    [
      huntHistory.hunts,
      huntHistory.isLoading,
      huntHistory.isError,
      activeHuntId,
      isGenerating,
      reopenHunt,
      rerunHunt,
      renameHunt,
      togglePinnedHunt,
      deleteHunt,
    ]
  );

  const openInAgentBuilder = useCallback(() => {
    agentBuilder?.openChat({
      newConversation: true,
      initialMessage: input.trim() !== '' ? input : undefined,
      autoSendInitialMessage: false,
      sessionTag: 'security',
    });
  }, [agentBuilder, input]);

  const pageStyle = css`
    width: 100%;
    min-width: 0;
  `;

  const layoutStyle = css`
    display: flex;
    align-items: stretch;
    gap: 0;
    min-height: 0;
    width: 100%;
  `;

  const mainStyle = css`
    flex: 1;
    min-width: 0;
    max-width: 1400px;
    margin: 0 auto;
    padding: ${euiTheme.size.l};
  `;

  const composerStyle = css`
    max-width: 900px;
    margin: 0 auto;
  `;

  const composerPanelStyle = css`
    position: relative;
    overflow: hidden;
    border-radius: ${euiTheme.border.radius.medium};
    background: linear-gradient(
      135deg,
      ${transparentize(euiTheme.colors.primary, 0.08)},
      ${euiTheme.colors.backgroundBasePlain} 70%
    );
  `;

  const composerHeaderStyle = css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.s};
    margin-bottom: ${euiTheme.size.s};
    color: ${euiTheme.colors.textParagraph};
  `;

  const inputWrapperStyle = css`
    position: relative;
    border-radius: ${euiTheme.border.radius.medium};
    padding: ${euiTheme.size.xs};
    background: linear-gradient(
      135deg,
      ${transparentize(euiTheme.colors.primary, 0.3)},
      ${transparentize(euiTheme.colors.accent, 0.2)}
    );
  `;

  const newHuntBarStyle = css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${euiTheme.size.m};
    flex-wrap: wrap;
    padding: ${euiTheme.size.s} ${euiTheme.size.base};
    border: ${euiTheme.border.width.thin} solid ${transparentize(euiTheme.colors.primary, 0.25)};
    border-radius: ${euiTheme.size.xl};
    background: ${transparentize(euiTheme.colors.primary, 0.04)};
  `;

  const templateGridStyle = css`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: ${euiTheme.size.m};
  `;

  const templateCardStyle = css`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: ${euiTheme.size.xs};
    padding: ${euiTheme.size.m};
    border: ${euiTheme.border.thin};
    border-radius: ${euiTheme.border.radius.medium};
    background: ${euiTheme.colors.emptyShade};
    cursor: pointer;
    text-align: left;

    &:hover {
      border-color: ${euiTheme.colors.primary};
      background: ${transparentize(euiTheme.colors.primary, 0.05)};
    }
  `;

  const templateTitleStyle = css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.s};
    font-size: ${euiTheme.size.m};
    font-weight: ${euiTheme.font.weight.semiBold};
    color: ${euiTheme.colors.textParagraph};
  `;

  const templateDescriptionStyle = css`
    font-size: ${euiTheme.size.m};
    line-height: 1.4;
    color: ${euiTheme.colors.textSubdued};
  `;

  const templateUsesStyle = css`
    font-size: 10px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: ${euiTheme.colors.textSubdued};
    opacity: 0.8;
  `;

  const userBubbleStyle = css`
    max-width: 80%;
    min-width: 0;
    margin-left: auto;
    padding: ${euiTheme.size.m};
    border-radius: ${euiTheme.border.radius.medium};
    background: ${transparentize(euiTheme.colors.primary, 0.12)};
    border: ${euiTheme.border.width.thin} solid ${transparentize(euiTheme.colors.primary, 0.3)};
    overflow-wrap: anywhere;
  `;

  const transcriptStyle = css`
    display: flex;
    flex-direction: column;
    gap: ${euiTheme.size.m};
    margin-top: ${euiTheme.size.l};
    min-width: 0;
    max-width: 100%;
  `;

  const controlsRowStyle = css`
    display: flex;
    gap: ${euiTheme.size.s};
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
  `;

  const composerHintStyle = css`
    color: ${euiTheme.colors.textSubdued};
  `;

  return (
    <div css={pageStyle} data-test-subj="entityIntelligenceAiHuntTab">
      <div css={layoutStyle}>
        {!isNarrow ? (
          <HuntHistoryRail
            {...railProps}
            isCollapsed={isRailInlineCollapsed}
            onToggleCollapsed={toggleRail}
          />
        ) : null}
        <div css={mainStyle}>
          {isNarrow ? (
            <>
              <EuiFlexGroup
                gutterSize="s"
                alignItems="center"
                responsive={false}
                justifyContent="flexEnd"
              >
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    size="s"
                    iconType="clock"
                    onClick={toggleRail}
                    data-test-subj="entityIntelligenceHuntHistoryOpenFlyout"
                  >
                    {i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.history.openDrawer',
                      { defaultMessage: 'Recent hunts' }
                    )}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="s" />
            </>
          ) : null}
          {inputState.isComposerExpanded ? (
            <div css={composerStyle}>
              <EuiPanel
                paddingSize="l"
                hasBorder
                hasShadow={false}
                css={composerPanelStyle}
                data-test-subj="entityIntelligenceAiHuntComposer"
              >
                <div css={composerHeaderStyle}>
                  <EuiIcon type="sparkles" color="primary" aria-hidden={true} />
                  <EuiText size="s">
                    <strong>
                      {i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.composerTitle',
                        { defaultMessage: 'Ask the AI hunter' }
                      )}
                    </strong>
                  </EuiText>
                </div>
                <div css={inputWrapperStyle}>
                  <EuiTextArea
                    fullWidth
                    rows={3}
                    resize="none"
                    placeholder={i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.inputPlaceholder',
                      {
                        defaultMessage:
                          "Ask about entity behavior, e.g. 'Which users accessed unusual hosts this week?'",
                      }
                    )}
                    value={input}
                    disabled={isGenerating}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                        event.preventDefault();
                        submit();
                      }
                    }}
                    aria-label={i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.inputAriaLabel',
                      { defaultMessage: 'Describe the behavior to hunt for' }
                    )}
                    data-test-subj="entityIntelligenceAiHuntInput"
                  />
                </div>
                <EuiSpacer size="s" />
                <div css={controlsRowStyle}>
                  <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
                    {!hasConnector ? (
                      <EuiFlexItem grow={false}>
                        <EuiText size="xs" color="subdued">
                          <span>
                            {i18n.translate(
                              'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.noConnector',
                              { defaultMessage: 'Configure an AI connector to start hunting.' }
                            )}
                          </span>
                        </EuiText>
                      </EuiFlexItem>
                    ) : (
                      <EuiFlexItem grow={false}>
                        <EuiText size="xs" css={composerHintStyle}>
                          <span>
                            {i18n.translate(
                              'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.submitHint',
                              { defaultMessage: 'Press ⌘/Ctrl + Enter to run' }
                            )}
                          </span>
                        </EuiText>
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>
                  <EuiFlexGroup
                    gutterSize="s"
                    alignItems="center"
                    responsive={false}
                    wrap
                    justifyContent="flexEnd"
                  >
                    <EuiFlexItem grow={false}>
                      <EuiLink
                        color="primary"
                        onClick={openInAgentBuilder}
                        data-test-subj="entityIntelligenceAiHuntOpenAgentBuilder"
                      >
                        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                          <EuiFlexItem grow={false}>
                            <EuiIcon type="external" size="s" aria-hidden={true} />
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>
                            {i18n.translate(
                              'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.openInAgentBuilder',
                              { defaultMessage: 'Open in Agent Builder' }
                            )}
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </EuiLink>
                    </EuiFlexItem>
                    {inputState.lifecycle === 'active' ? (
                      <EuiFlexItem grow={false}>
                        <EuiButtonEmpty
                          size="s"
                          iconType="cross"
                          onClick={collapseComposer}
                          data-test-subj="entityIntelligenceAiHuntCancelNewHunt"
                        >
                          {i18n.translate(
                            'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.cancelNewHunt',
                            { defaultMessage: 'Cancel' }
                          )}
                        </EuiButtonEmpty>
                      </EuiFlexItem>
                    ) : null}
                    <EuiFlexItem grow={false}>
                      {isGenerating ? (
                        <EuiButton
                          size="s"
                          color="danger"
                          iconType="stopFill"
                          onClick={stopGeneration}
                          data-test-subj="entityIntelligenceAiHuntStop"
                        >
                          {STOP_LABEL}
                        </EuiButton>
                      ) : (
                        <EuiButton
                          fill
                          size="s"
                          iconType="sparkles"
                          onClick={submit}
                          disabled={!hasConnector || input.trim() === ''}
                          data-test-subj="entityIntelligenceAiHuntSubmit"
                        >
                          {i18n.translate(
                            'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.submit',
                            { defaultMessage: 'Hunt' }
                          )}
                        </EuiButton>
                      )}
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </div>
              </EuiPanel>
            </div>
          ) : null}

          {inputState.showNewHuntPill ? (
            <div css={composerStyle}>
              <div css={newHuntBarStyle} data-test-subj="entityIntelligenceAiHuntNewHuntBar">
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiIcon type="sparkles" color="primary" aria-hidden={true} />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="s" color="subdued">
                      <span>
                        {i18n.translate(
                          'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.newHuntPrompt',
                          { defaultMessage: 'Ask another question about entity behavior.' }
                        )}
                      </span>
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiButton
                  size="s"
                  iconType="plusCircle"
                  onClick={openNewHunt}
                  disabled={!hasConnector}
                  data-test-subj="entityIntelligenceAiHuntNewHunt"
                >
                  {i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.newHunt',
                    { defaultMessage: 'New hunt' }
                  )}
                </EuiButton>
              </div>
            </div>
          ) : null}

          {inputState.showTemplates ? (
            <>
              <EuiSpacer size="l" />
              <SectionLabel>
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.templatesTitle',
                  { defaultMessage: 'Guided hunts' }
                )}
              </SectionLabel>
              <EuiSpacer size="s" />
              <div css={templateGridStyle}>
                {HUNT_TEMPLATES.map((template, index) => (
                  <button
                    key={template.id}
                    type="button"
                    css={[templateCardStyle, hoverLift(euiTheme), staggeredEntrance(index)]}
                    onClick={() => submitQuestion(template.intent, template)}
                    disabled={isGenerating || !hasConnector}
                    data-test-subj={`entityIntelligenceHuntTemplate-${template.id}`}
                  >
                    <span css={templateTitleStyle}>
                      <EuiIcon type={template.icon} size="m" color="primary" aria-hidden={true} />
                      {template.title}
                    </span>
                    <span css={templateDescriptionStyle}>{template.description}</span>
                    <span css={templateUsesStyle}>{template.uses}</span>
                  </button>
                ))}
              </div>
            </>
          ) : null}

          <div css={transcriptStyle}>
            {transcript.map((entry) =>
              entry.role === 'user' ? (
                <div key={entry.id} css={userBubbleStyle}>
                  <EuiText size="s">
                    <p>{entry.content}</p>
                  </EuiText>
                </div>
              ) : (
                <AssistantMessage
                  key={entry.id}
                  entry={entry}
                  onOpenInAgentBuilder={openInAgentBuilder}
                  followUps={entry.id === lastAssistantEntry?.id && !isGenerating ? followUps : []}
                  onFollowUp={submitQuestion}
                  isBusy={isGenerating}
                  onInvestigateEntity={onDrillToExplorer}
                  isLatest={entry.id === lastAssistantEntry?.id}
                />
              )
            )}
            {isGenerating && !hasAssistantOutputRef.current ? <TypingIndicator /> : null}
            {error && !isGenerating ? (
              <EuiCallOut
                announceOnMount
                color="danger"
                size="s"
                title={i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.error',
                  { defaultMessage: 'Hunt request failed' }
                )}
              >
                <p>{error}</p>
              </EuiCallOut>
            ) : null}
            <div ref={bottomAnchorRef} />
          </div>
        </div>

        {isNarrow && isRailFlyoutOpen ? (
          <EuiFlyout
            ownFocus
            onClose={() => setIsRailFlyoutOpen(false)}
            size="s"
            paddingSize="none"
            data-test-subj="entityIntelligenceHuntHistoryFlyout"
            aria-labelledby="entityIntelligenceHuntHistoryFlyoutTitle"
          >
            <EuiFlyoutHeader hasBorder>
              <EuiTitle size="xs">
                <h2 id="entityIntelligenceHuntHistoryFlyoutTitle">
                  {i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.history.title',
                    { defaultMessage: 'Recent hunts' }
                  )}
                </h2>
              </EuiTitle>
            </EuiFlyoutHeader>
            <EuiFlyoutBody>
              <HuntHistoryRail
                {...railProps}
                isCollapsed={false}
                variant="flyout"
                onToggleCollapsed={() => setIsRailFlyoutOpen(false)}
              />
            </EuiFlyoutBody>
          </EuiFlyout>
        ) : null}
      </div>
    </div>
  );
};
