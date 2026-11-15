/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiNotificationBadge,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { MAX_TEXT_LENGTH } from '@kbn/significant-events-schema';
import type {
  OnboardingSuggestion,
  OnboardingSuggestionsExecution,
} from '@kbn/nightshift-investigations-plugin/common';
import { useStartInvestigation } from '../hooks/use_start_investigation';
import { useStartOnboardingSuggestions } from './use_onboarding';
import { useFetchCustomContext } from '../custom_context/use_fetch_custom_context';

/** Generic prompts offered when the suggestion run failed; they work on any cluster. */
const FALLBACK_SUGGESTIONS: OnboardingSuggestion[] = [
  {
    title: i18n.translate('xpack.nightshift.onboarding.fallback.errors.title', {
      defaultMessage: 'Noisiest errors in the last 24 hours',
    }),
    prompt: 'Which services logged the most errors in the last 24 hours, and why?',
    rationale: '',
    source: 'error_spike',
  },
  {
    title: i18n.translate('xpack.nightshift.onboarding.fallback.degrading.title', {
      defaultMessage: 'Anything degrading right now?',
    }),
    prompt:
      'Is anything in my system degrading right now? Check error rates and latency of the last hour against the day before.',
    rationale: '',
    source: 'latency',
  },
  {
    title: i18n.translate('xpack.nightshift.onboarding.fallback.changes.title', {
      defaultMessage: 'What changed in the last hour?',
    }),
    prompt: 'What changed in my system in the last hour, and did it cause any errors?',
    rationale: '',
    source: 'other',
  },
];

const SOURCE_LABELS: Record<OnboardingSuggestion['source'], string> = {
  alert: i18n.translate('xpack.nightshift.onboarding.source.alert', { defaultMessage: 'Alert' }),
  slo: i18n.translate('xpack.nightshift.onboarding.source.slo', { defaultMessage: 'SLO' }),
  case: i18n.translate('xpack.nightshift.onboarding.source.case', { defaultMessage: 'Case' }),
  error_spike: i18n.translate('xpack.nightshift.onboarding.source.errorSpike', {
    defaultMessage: 'Error spike',
  }),
  latency: i18n.translate('xpack.nightshift.onboarding.source.latency', {
    defaultMessage: 'Latency',
  }),
  code_change: i18n.translate('xpack.nightshift.onboarding.source.codeChange', {
    defaultMessage: 'Code change',
  }),
  discussion: i18n.translate('xpack.nightshift.onboarding.source.discussion', {
    defaultMessage: 'Discussion',
  }),
  other: i18n.translate('xpack.nightshift.onboarding.source.other', { defaultMessage: 'Signal' }),
};

const SOURCE_ICONS: Record<OnboardingSuggestion['source'], string> = {
  alert: 'bell',
  slo: 'visGauge',
  case: 'casesApp',
  error_spike: 'error',
  latency: 'clock',
  code_change: 'logoGithub',
  discussion: 'logoSlack',
  other: 'sparkles',
};

const useElapsedSeconds = (startedAt: string | undefined, isRunning: boolean): number => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isRunning]);
  return startedAt ? Math.max(0, Math.round((now - Date.parse(startedAt)) / 1000)) : 0;
};

/** Step 2: wait for suggestions, then pick one or ask a custom question. */
export function OnboardingFirstInvestigationStep({
  execution,
  onInvestigationStarted,
  onChangeDeployment,
}: {
  execution: OnboardingSuggestionsExecution;
  onInvestigationStarted: (investigationId: string) => void;
  onChangeDeployment: () => void;
}): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const [message, setMessage] = useState('');
  const { startInvestigation, isStarting } = useStartInvestigation({
    onStarted: onInvestigationStarted,
  });
  const retry = useStartOnboardingSuggestions();
  const isRunning = execution.status === 'running';
  const hintCount = useFetchCustomContext().data?.snippets.length ?? 0;
  const elapsedSeconds = useElapsedSeconds(execution.started_at, isRunning);

  const suggestions = useMemo(
    () =>
      execution.status === 'failed' || execution.suggestions?.length === 0
        ? FALLBACK_SUGGESTIONS
        : execution.suggestions ?? [],
    [execution.status, execution.suggestions]
  );

  const trimmedMessage = message.trim();
  const submit = useCallback(() => {
    if (!trimmedMessage || isStarting) return;
    // A picked suggestion keeps its headline unless the user edited the prompt.
    const picked = suggestions.find(({ prompt }) => prompt === trimmedMessage);
    startInvestigation(trimmedMessage, picked?.title);
  }, [isStarting, startInvestigation, suggestions, trimmedMessage]);

  return (
    <div data-test-subj="nightshiftOnboardingFirstInvestigationStep">
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h3>
                  {i18n.translate('xpack.nightshift.onboarding.investigate.title', {
                    defaultMessage: 'Suggested to investigate',
                  })}
                </h3>
              </EuiTitle>
            </EuiFlexItem>
            {!isRunning && (
              <EuiFlexItem grow={false}>
                <EuiNotificationBadge color="subdued">{suggestions.length}</EuiNotificationBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
            {hintCount > 0 && (
              <EuiFlexItem grow={false}>
                <EuiBadge
                  iconType="documentation"
                  color="hollow"
                  data-test-subj="nightshiftOnboardingUsedHintsBadge"
                >
                  {i18n.translate('xpack.nightshift.onboarding.investigate.usedHintsBadge', {
                    defaultMessage: 'Using {count, plural, one {# hint} other {# hints}}',
                    values: { count: hintCount },
                  })}
                </EuiBadge>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="xs"
                onClick={onChangeDeployment}
                data-test-subj="nightshiftOnboardingChangeDeploymentButton"
              >
                {i18n.translate('xpack.nightshift.onboarding.investigate.changeDeployment', {
                  defaultMessage: 'Edit setup',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />

      <EuiPanel hasBorder paddingSize="m">
        <EuiFormRow
          fullWidth
          label={i18n.translate('xpack.nightshift.onboarding.investigate.customLabel', {
            defaultMessage: 'Describe what you want investigated, or pick a suggestion below',
          })}
        >
          <EuiTextArea
            data-test-subj="nightshiftOnboardingCustomPrompt"
            fullWidth
            rows={3}
            resize="vertical"
            maxLength={MAX_TEXT_LENGTH}
            disabled={isStarting}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                submit();
              }
            }}
            placeholder={i18n.translate(
              'xpack.nightshift.onboarding.investigate.customPlaceholder',
              { defaultMessage: 'For example: Why did checkout latency spike in the last hour?' }
            )}
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
        <EuiFlexGroup justifyContent="flexEnd" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              size="s"
              iconType="sparkles"
              isLoading={isStarting}
              disabled={!trimmedMessage}
              onClick={submit}
              data-test-subj="nightshiftOnboardingInvestigateButton"
            >
              {i18n.translate('xpack.nightshift.onboarding.investigate.submitButton', {
                defaultMessage: 'Investigate',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      <EuiSpacer size="m" />

      {isRunning && (
        <EuiPanel
          hasBorder
          paddingSize="none"
          data-test-subj="nightshiftOnboardingAnalyzing"
          css={css`
            overflow: hidden;
            position: relative;
            background: linear-gradient(
              99deg,
              ${euiTheme.colors.backgroundLightPrimary},
              ${euiTheme.colors.backgroundLightAssistance}
            );
          `}
        >
          <EuiProgress size="xs" color="primary" position="absolute" />
          <EuiFlexGroup
            alignItems="center"
            gutterSize="s"
            responsive={false}
            css={css`
              padding: ${euiTheme.size.m} ${euiTheme.size.base};
            `}
          >
            <EuiFlexItem grow={false}>
              <EuiIcon type="clock" aria-hidden={true} />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s">
                <strong>
                  {i18n.translate('xpack.nightshift.onboarding.investigate.analyzingTitle', {
                    defaultMessage: 'Analyzing your data',
                  })}
                </strong>
                {' · '}
                {i18n.translate('xpack.nightshift.onboarding.investigate.analyzingDescription', {
                  defaultMessage:
                    'The investigation agent is looking at your telemetry and tools for what to investigate first. This takes a few minutes.',
                })}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued" data-test-subj="nightshiftOnboardingElapsed">
                {`${elapsedSeconds}s`}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      )}

      {execution.status === 'failed' && (
        <>
          <EuiCallOut
            announceOnMount
            size="s"
            color="warning"
            iconType="warning"
            title={i18n.translate('xpack.nightshift.onboarding.investigate.failedTitle', {
              defaultMessage: 'Nightshift could not suggest investigations for your data',
            })}
          >
            <p>
              {i18n.translate('xpack.nightshift.onboarding.investigate.failedDescription', {
                defaultMessage:
                  'Start with one of these general questions, write your own, or try again.',
              })}
            </p>
            <EuiButton
              size="s"
              color="warning"
              iconType="refresh"
              isLoading={retry.isLoading}
              onClick={() => retry.mutate()}
              data-test-subj="nightshiftOnboardingRetryButton"
            >
              {i18n.translate('xpack.nightshift.onboarding.investigate.retryButton', {
                defaultMessage: 'Try again',
              })}
            </EuiButton>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      )}

      {!isRunning && (
        <EuiFlexGroup direction="column" gutterSize="s">
          {suggestions.map((suggestion) => (
            <EuiFlexItem key={suggestion.title}>
              <SuggestionCard
                suggestion={suggestion}
                isSelected={trimmedMessage === suggestion.prompt}
                isDisabled={isStarting}
                onSelect={() => setMessage(suggestion.prompt)}
                onInvestigate={() => startInvestigation(suggestion.prompt, suggestion.title)}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      )}
    </div>
  );
}

function SuggestionCard({
  suggestion,
  isSelected,
  isDisabled,
  onSelect,
  onInvestigate,
}: {
  suggestion: OnboardingSuggestion;
  isSelected: boolean;
  isDisabled: boolean;
  onSelect: () => void;
  onInvestigate: () => void;
}): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiPanel
      hasBorder
      paddingSize="m"
      color={isSelected ? 'primary' : 'plain'}
      data-test-subj="nightshiftOnboardingSuggestion"
      css={css`
        cursor: pointer;
        &:hover {
          background: ${isSelected ? '' : euiTheme.colors.backgroundBaseInteractiveHover};
        }
      `}
      onClick={onSelect}
    >
      <EuiFlexGroup alignItems="flexStart" gutterSize="m" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon
            type={SOURCE_ICONS[suggestion.source]}
            color="primary"
            size="m"
            aria-hidden={true}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s">
            <strong>{suggestion.title}</strong>
          </EuiText>
          <EuiText size="xs" color="subdued" data-test-subj="nightshiftOnboardingSuggestionDetails">
            <strong>{SOURCE_LABELS[suggestion.source]}</strong>
            {(suggestion.rationale || suggestion.prompt) &&
              ` · ${suggestion.rationale || suggestion.prompt}`}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            iconType="sparkles"
            isDisabled={isDisabled}
            onClick={(event: React.MouseEvent) => {
              event.stopPropagation();
              onInvestigate();
            }}
            data-test-subj="nightshiftOnboardingSuggestionInvestigateButton"
          >
            {i18n.translate('xpack.nightshift.onboarding.investigate.suggestionButton', {
              defaultMessage: 'Investigate',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
