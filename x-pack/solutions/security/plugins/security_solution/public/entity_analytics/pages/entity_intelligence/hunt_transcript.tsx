/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiAccordion, EuiText, transparentize, useEuiTheme } from '@elastic/eui';
import { css, keyframes } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { IntelligenceEntity } from './common';
import type { HuntArtifact } from './hunt_artifacts';
import type { HuntActivity } from './hunt_stream_state';
import { HuntResultCanvas } from './hunt_result_canvas';

const REDUCED_MOTION_QUERY = '@media (prefers-reduced-motion: reduce)';

export interface ChatEntry {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  /** True while tokens are still streaming into this assistant entry. */
  isStreaming?: boolean;
  artifacts?: HuntArtifact[];
  activities?: HuntActivity[];
  huntPrompt?: string;
  /** Fully scoped prompt sent to the agent (used to rerun a saved hunt). */
  scopedPrompt?: string;
  startedAt?: number;
  status?: 'running' | 'completed' | 'partial' | 'failed';
}

/** Stage labels cycled while the agent is working, before tokens arrive. */
export const useProgressStages = (): string[] =>
  useMemo(
    () => [
      i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.aiHunt.stageSearching', {
        defaultMessage: 'Searching entity data…',
      }),
      i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.stageCorrelating',
        { defaultMessage: 'Correlating alerts and anomalies…' }
      ),
      i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.aiHunt.stageComposing', {
        defaultMessage: 'Composing analysis…',
      }),
    ],
    []
  );

const typingBounce = keyframes`
  0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
  40% { transform: translateY(-4px); opacity: 1; }
`;

/**
 * Animated typing indicator with a cycling stage label. `activityDetail`
 * (live tool progress from the stream) takes precedence over the synthetic
 * stage rotation when available.
 */
export const TypingIndicator: React.FC<{ activityDetail?: string }> = ({ activityDetail }) => {
  const { euiTheme } = useEuiTheme();
  const stages = useProgressStages();
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStageIndex((previous) => (previous + 1) % stages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [stages.length]);

  const wrapperStyle = css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.m};
    padding: ${euiTheme.size.m};
  `;

  const dotsStyle = css`
    display: inline-flex;
    gap: ${euiTheme.size.xs};
  `;

  const dotStyle = (delay: number) => css`
    width: ${euiTheme.size.s};
    height: ${euiTheme.size.s};
    border-radius: 50%;
    background: ${euiTheme.colors.primary};
    animation: ${typingBounce} 1.2s ease-in-out ${delay}ms infinite;

    ${REDUCED_MOTION_QUERY} {
      animation: none;
      opacity: 0.7;
    }
  `;

  return (
    <div css={wrapperStyle} data-test-subj="entityIntelligenceHuntTyping">
      <span css={dotsStyle}>
        <span css={dotStyle(0)} />
        <span css={dotStyle(150)} />
        <span css={dotStyle(300)} />
      </span>
      <EuiText size="xs" color="subdued">
        <span>{activityDetail ?? stages[stageIndex]}</span>
      </EuiText>
    </div>
  );
};

const revealKeyframes = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`;

export interface AssistantMessageProps {
  entry: ChatEntry;
  onOpenInAgentBuilder: () => void;
  followUps: string[];
  onFollowUp: (question: string) => void;
  isBusy: boolean;
  onInvestigateEntity: (entity: IntelligenceEntity) => void;
  isLatest: boolean;
}

/**
 * Assistant transcript bubble: markdown with inline code styled as chips, a
 * per-response action bar (copy / open in Agent Builder), and contextual
 * follow-up pills once the response is complete.
 */
export const AssistantMessage: React.FC<AssistantMessageProps> = ({
  entry,
  onOpenInAgentBuilder,
  followUps,
  onFollowUp,
  isBusy,
  onInvestigateEntity,
  isLatest,
}) => {
  const { euiTheme } = useEuiTheme();

  const bubbleStyle = css`
    animation: ${revealKeyframes} 240ms ease-out both;
    min-width: 0;
    max-width: 100%;
    overflow: hidden;
    overflow-wrap: anywhere;

    pre,
    code {
      max-width: 100%;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    ${REDUCED_MOTION_QUERY} {
      animation: none;
    }

    /* Inline code as quiet chips/pills. */
    code:not(pre code) {
      display: inline-block;
      padding: 0 ${euiTheme.size.s};
      border-radius: ${euiTheme.border.radius.small};
      background: ${transparentize(euiTheme.colors.primary, 0.1)};
      border: ${euiTheme.border.width.thin} solid ${transparentize(euiTheme.colors.primary, 0.25)};
      color: ${euiTheme.colors.primaryText};
      font-size: 0.85em;
      line-height: 1.6;
    }
  `;

  const canvas = (
    <HuntResultCanvas
      prompt={entry.huntPrompt ?? ''}
      content={entry.content}
      artifacts={entry.artifacts ?? []}
      activities={entry.activities ?? []}
      status={entry.status ?? (entry.isStreaming ? 'running' : 'completed')}
      startedAt={entry.startedAt ?? Date.now()}
      onInvestigateEntity={onInvestigateEntity}
      onOpenInAgentBuilder={onOpenInAgentBuilder}
      followUps={isLatest && !entry.isStreaming && !isBusy ? followUps : []}
      onFollowUp={onFollowUp}
    />
  );

  return (
    <div css={bubbleStyle} data-test-subj="entityIntelligenceHuntAssistantMessage">
      {isLatest ? (
        canvas
      ) : (
        <EuiAccordion
          id={`previous-hunt-${entry.id}`}
          buttonContent={i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.previousResultButtonLabel',
            {
              defaultMessage: 'Previous hunt: {title}',
              values: {
                title: `${entry.huntPrompt?.split(/[.:\n]/)[0].slice(0, 57) ?? ''}${
                  (entry.huntPrompt?.split(/[.:\n]/)[0].length ?? 0) > 57 ? '…' : ''
                }`,
              },
            }
          )}
          paddingSize="m"
        >
          {canvas}
        </EuiAccordion>
      )}
    </div>
  );
};

/** Heuristic follow-up suggestions based on the last assistant response. */
export const useFollowUpSuggestions = (content: string): string[] => {
  const buildSuggestions = useCallback((text: string): string[] => {
    const lower = text.toLowerCase();
    const suggestions: string[] = [];
    if (/\b(host|hosts|machine|server)\b/.test(lower)) {
      suggestions.push(
        i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.aiHunt.followUpHosts', {
          defaultMessage: 'Which hosts are affected?',
        })
      );
    }
    if (/\b(user|users|account|accounts)\b/.test(lower)) {
      suggestions.push(
        i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.followUpTimeline',
          { defaultMessage: 'Show the timeline of events' }
        )
      );
    }
    suggestions.push(
      i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.followUpContainment',
        { defaultMessage: 'Draft a containment plan' }
      )
    );
    if (suggestions.length < 3) {
      suggestions.push(
        i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.followUpEvidence',
          { defaultMessage: 'What evidence supports this?' }
        )
      );
    }
    return suggestions.slice(0, 3);
  }, []);

  return useMemo(() => buildSuggestions(content), [buildSuggestions, content]);
};
