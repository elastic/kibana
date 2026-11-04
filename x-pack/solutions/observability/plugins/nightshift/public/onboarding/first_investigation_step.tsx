/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiIcon,
  EuiProgress,
  EuiSpacer,
  EuiTextArea,
  EuiTitle,
  useEuiShadow,
  useEuiTheme,
  type IconType,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { MAX_TEXT_LENGTH } from '@kbn/significant-events-schema';
import type {
  OnboardingSuggestion,
  OnboardingSuggestionsExecution,
} from '@kbn/nightshift-investigations-plugin/common';
import { useStartInvestigation } from '../data/investigations/use_start_investigation';
import { ConnectSourcesGrid } from '../sandbox_connectors/connect_sources_grid';
import { useStartOnboardingSuggestions } from './use_onboarding';

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

const SOURCE_MARKS: Record<OnboardingSuggestion['source'], { icon: IconType; isLogo?: boolean }> = {
  alert: { icon: 'warning' },
  slo: { icon: 'visGauge' },
  case: { icon: 'casesApp' },
  error_spike: { icon: 'stats' },
  latency: { icon: 'stats' },
  code_change: { icon: 'logoGithub', isLogo: true },
  discussion: { icon: 'logoSlack', isLogo: true },
  other: { icon: 'stats' },
};

const SUGGESTIONS_PAGE_SIZE = 5;

const INVESTIGATE_LABEL = i18n.translate('xpack.nightshift.onboarding.investigate.button', {
  defaultMessage: 'Investigate',
});

export function OnboardingFirstInvestigationStep({
  execution,
  onInvestigationStarted,
}: {
  execution: OnboardingSuggestionsExecution;
  onInvestigationStarted: (investigationId: string) => void;
}): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const [message, setMessage] = useState('');
  // The prompt whose investigation is starting, to show that control loading.
  const [startingPrompt, setStartingPrompt] = useState<string | undefined>();
  const { startInvestigation, isStarting } = useStartInvestigation({
    onStarted: onInvestigationStarted,
  });
  const retry = useStartOnboardingSuggestions();
  const isRunning = execution.status === 'running';

  const suggestions = useMemo(
    () =>
      execution.status === 'failed' || execution.suggestions?.length === 0
        ? FALLBACK_SUGGESTIONS
        : execution.suggestions ?? [],
    [execution.status, execution.suggestions]
  );

  const start = useCallback(
    (prompt: string, title?: string) => {
      if (isStarting) return;
      setStartingPrompt(prompt);
      startInvestigation(prompt, title);
    },
    [isStarting, startInvestigation]
  );

  if (isRunning) {
    return (
      <div
        data-test-subj="nightshiftOnboardingFirstInvestigationStep"
        css={css`
          display: flex;
          flex-direction: column;
          gap: ${euiTheme.size.xl};
        `}
      >
        <AnalyzingBanner />
        <section data-test-subj="nightshiftOnboardingAnalyzingSources">
          <EuiTitle size="xs">
            <h4>
              {i18n.translate('xpack.nightshift.onboarding.investigate.knowledgeSourcesTitle', {
                defaultMessage: 'Additional knowledge sources',
              })}
            </h4>
          </EuiTitle>
          <EuiSpacer size="m" />
          <ConnectSourcesGrid group="additional" />
        </section>
      </div>
    );
  }

  return (
    <div
      data-test-subj="nightshiftOnboardingFirstInvestigationStep"
      css={css`
        display: flex;
        flex-direction: column;
        gap: ${euiTheme.size.base};
      `}
    >
      {execution.status === 'failed' && (
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
      )}
      <SuggestionList
        suggestions={suggestions}
        isStarting={isStarting}
        startingPrompt={startingPrompt}
        onInvestigate={(suggestion) => start(suggestion.prompt, suggestion.title)}
      />
      <ComposeCard
        value={message}
        onChange={setMessage}
        isStarting={isStarting}
        isLoading={isStarting && startingPrompt === message.trim()}
        onSubmit={() => {
          const prompt = message.trim();
          if (prompt) start(prompt);
        }}
      />
    </div>
  );
}

function AnalyzingBanner(): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      data-test-subj="nightshiftOnboardingAnalyzing"
      css={css`
        position: relative;
        overflow: hidden;
        border-radius: ${euiTheme.border.radius.panel};
        border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePrimary};
      `}
    >
      <EuiProgress size="xs" color="primary" position="absolute" />
      <EuiCallOut
        color="primary"
        size="s"
        title={i18n.translate('xpack.nightshift.onboarding.investigate.analyzingTitle', {
          defaultMessage: 'Gathering and triaging signals that can be investigated',
        })}
        css={css`
          border: none;
          border-radius: 0;
          box-shadow: none;
          padding-top: calc(${euiTheme.size.m} + 2px);
        `}
      >
        <p>
          {i18n.translate('xpack.nightshift.onboarding.investigate.analyzingDescription', {
            defaultMessage:
              'This might take a couple of minutes. Meanwhile, consider connecting additional knowledge sources.',
          })}
        </p>
      </EuiCallOut>
    </div>
  );
}

function SuggestionList({
  suggestions,
  isStarting,
  startingPrompt,
  onInvestigate,
}: {
  suggestions: OnboardingSuggestion[];
  isStarting: boolean;
  startingPrompt: string | undefined;
  onInvestigate: (suggestion: OnboardingSuggestion) => void;
}): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const [visibleCount, setVisibleCount] = useState(SUGGESTIONS_PAGE_SIZE);
  const shown = suggestions.slice(0, visibleCount);
  const remaining = suggestions.length - shown.length;

  return (
    <div
      data-test-subj="nightshiftOnboardingSuggestions"
      css={css`
        overflow: hidden;
        border: ${euiTheme.border.thin};
        border-radius: ${euiTheme.border.radius.panel};
        background: ${euiTheme.colors.emptyShade};
      `}
    >
      <ul
        css={css`
          list-style: none;
          margin: 0;
          padding: 0;

          > li + li {
            border-top: ${euiTheme.border.thin};
          }
        `}
      >
        {shown.map((suggestion) => (
          <SuggestionRow
            key={suggestion.title}
            suggestion={suggestion}
            isDisabled={isStarting}
            isLoading={isStarting && startingPrompt === suggestion.prompt}
            onInvestigate={() => onInvestigate(suggestion)}
          />
        ))}
      </ul>
      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setVisibleCount((count) => count + SUGGESTIONS_PAGE_SIZE)}
          data-test-subj="nightshiftOnboardingSuggestionsShowMore"
          css={css`
            display: flex;
            align-items: center;
            justify-content: center;
            gap: ${euiTheme.size.xs};
            width: 100%;
            padding: ${euiTheme.size.m};
            border: none;
            border-top: ${euiTheme.border.thin};
            background: ${euiTheme.colors.emptyShade};
            cursor: pointer;
            font-size: ${euiTheme.size.m};
            line-height: ${euiTheme.size.base};
            font-weight: ${euiTheme.font.weight.bold};
            color: ${euiTheme.colors.textParagraph};

            &:hover {
              background: ${euiTheme.colors.backgroundBaseSubdued};
            }
          `}
        >
          <EuiIcon type="chevronSingleDown" size="s" aria-hidden={true} />
          {i18n.translate('xpack.nightshift.onboarding.investigate.showMore', {
            defaultMessage: 'Show {count} more',
            values: { count: Math.min(SUGGESTIONS_PAGE_SIZE, remaining) },
          })}
          <span
            css={css`
              font-weight: ${euiTheme.font.weight.regular};
              color: ${euiTheme.colors.textDisabled};
            `}
          >
            {i18n.translate('xpack.nightshift.onboarding.investigate.showMoreOf', {
              defaultMessage: 'of {count}',
              values: { count: remaining },
            })}
          </span>
        </button>
      )}
    </div>
  );
}

function SuggestionRow({
  suggestion,
  isDisabled,
  isLoading,
  onInvestigate,
}: {
  suggestion: OnboardingSuggestion;
  isDisabled: boolean;
  isLoading: boolean;
  onInvestigate: () => void;
}): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const mark = SOURCE_MARKS[suggestion.source];
  return (
    <li
      data-test-subj="nightshiftOnboardingSuggestion"
      css={css`
        display: flex;
        align-items: center;
        gap: ${euiTheme.size.l};
        padding: ${euiTheme.size.base} ${euiTheme.size.base} ${euiTheme.size.base}
          ${euiTheme.size.l};
      `}
    >
      <Mark icon={mark.icon} isLogo={mark.isLogo} />
      <div
        css={css`
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: ${euiTheme.size.xs};
        `}
      >
        <div
          css={css`
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: ${euiTheme.size.s};
          `}
        >
          <EuiBadge color="hollow">{SOURCE_LABELS[suggestion.source]}</EuiBadge>
          <EuiButtonEmpty
            size="xs"
            iconType="inspect"
            isDisabled={isDisabled}
            isLoading={isLoading}
            onClick={onInvestigate}
            aria-label={`${INVESTIGATE_LABEL}: ${suggestion.title}`}
            data-test-subj="nightshiftOnboardingSuggestionInvestigateButton"
          >
            {INVESTIGATE_LABEL}
          </EuiButtonEmpty>
        </div>
        <p
          title={suggestion.title}
          css={css`
            margin: 0;
            font-size: 14px;
            line-height: 20px;
            font-weight: ${euiTheme.font.weight.medium};
            color: ${euiTheme.colors.textParagraph};
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          `}
        >
          {suggestion.title}
        </p>
        <p
          data-test-subj="nightshiftOnboardingSuggestionDetails"
          css={css`
            margin: 0;
            font-size: ${euiTheme.size.m};
            line-height: ${euiTheme.size.base};
            color: ${euiTheme.colors.textSubdued};
            display: -webkit-box;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 2;
            overflow: hidden;
          `}
        >
          {suggestion.rationale || suggestion.prompt}
        </p>
      </div>
    </li>
  );
}

/** "Want something else investigated?": a free-text question, with its own Investigate. */
function ComposeCard({
  value,
  onChange,
  isStarting,
  isLoading,
  onSubmit,
}: {
  value: string;
  onChange: (value: string) => void;
  isStarting: boolean;
  isLoading: boolean;
  onSubmit: () => void;
}): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const title = i18n.translate('xpack.nightshift.onboarding.investigate.customTitle', {
    defaultMessage: 'Want something else investigated?',
  });
  const hasDraft = value.trim().length > 0;

  return (
    <div
      data-test-subj="nightshiftOnboardingCompose"
      css={css`
        display: flex;
        align-items: flex-start;
        gap: ${euiTheme.size.l};
        margin-top: ${euiTheme.size.m};
        padding: ${euiTheme.size.base};
        border: ${euiTheme.border.thin};
        border-radius: ${euiTheme.border.radius.panel};
        background: ${euiTheme.colors.emptyShade};
      `}
    >
      <Mark icon="reporter" />
      <div
        css={css`
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: ${euiTheme.size.m};
        `}
      >
        <div
          css={css`
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: ${euiTheme.size.s};
          `}
        >
          <div
            css={css`
              min-width: 0;
              display: flex;
              flex-direction: column;
              gap: ${euiTheme.size.xs};
            `}
          >
            <h3
              css={css`
                margin: 0;
                font-size: 14px;
                line-height: 20px;
                font-weight: ${euiTheme.font.weight.semiBold};
                color: ${euiTheme.colors.textParagraph};
              `}
            >
              {title}
            </h3>
            <p
              css={css`
                margin: 0;
                font-size: ${euiTheme.size.m};
                line-height: ${euiTheme.size.base};
                color: ${euiTheme.colors.textSubdued};
              `}
            >
              {i18n.translate('xpack.nightshift.onboarding.investigate.customDescription', {
                defaultMessage:
                  'Describe the problem you want to look at. Any additional information about your system is helpful.',
              })}
            </p>
          </div>
          <EuiButtonEmpty
            size="xs"
            iconType="inspect"
            isDisabled={!hasDraft || isStarting}
            isLoading={isLoading}
            onClick={onSubmit}
            css={css`
              flex-shrink: 0;
              margin-top: -2px;
            `}
            data-test-subj="nightshiftOnboardingInvestigateButton"
          >
            {INVESTIGATE_LABEL}
          </EuiButtonEmpty>
        </div>
        <EuiTextArea
          data-test-subj="nightshiftOnboardingCustomPrompt"
          fullWidth
          rows={2}
          resize="vertical"
          maxLength={MAX_TEXT_LENGTH}
          disabled={isStarting}
          value={value}
          aria-label={title}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              onSubmit();
            }
          }}
          placeholder={i18n.translate('xpack.nightshift.onboarding.investigate.customPlaceholder', {
            defaultMessage:
              "For example, why is checkout latency up? Or what caused last night's error spike?",
          })}
        />
      </div>
    </div>
  );
}

/** The 40px leading plate of a row: tinted for glyphs, plain with a shadow for product logos. */
function Mark({ icon, isLogo = false }: { icon: IconType; isLogo?: boolean }): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const plateShadow = useEuiShadow('xs');
  return (
    <div
      aria-hidden={true}
      css={css`
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: ${euiTheme.size.s};
        ${isLogo
          ? `background: ${euiTheme.colors.backgroundBasePlain}; color: ${euiTheme.colors.textHeading}; ${plateShadow}`
          : `background: ${euiTheme.colors.backgroundLightText}; color: ${euiTheme.colors.textParagraph};`}
      `}
    >
      <EuiIcon type={icon} size="m" aria-hidden={true} />
    </div>
  );
}
