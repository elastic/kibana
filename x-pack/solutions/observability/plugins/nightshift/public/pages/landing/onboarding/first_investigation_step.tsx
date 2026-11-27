/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIllustration,
  EuiPanel,
  EuiProgress,
  EuiSkeletonRectangle,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
  type IconType,
} from '@elastic/eui';
import { notFound } from '@elastic/eui-illustrations';
import { i18n } from '@kbn/i18n';
import { MAX_TEXT_LENGTH } from '@kbn/significant-events-schema';
import type {
  OnboardingProgressStep,
  OnboardingSuggestion,
  OnboardingSuggestionsExecution,
} from '@kbn/nightshift-investigations-plugin/common';
import { ShowMoreButton } from '../../../components/ui/show_more_button';
import { useStartInvestigation } from '../../../data/investigations/use_start_investigation';
import {
  ConnectSourcesGrid,
  isAdditionalType,
} from '../../../components/entities/sandbox_connector/connect_sources_grid';
import { NIGHTSHIFT_EBT_ELEMENTS } from '../../../common/ebt_constants';
import { IconMark } from '../../../components/ui/icon_mark';
import { CONNECT_SOURCES_TITLE } from './connect_sources_step';
import { useStartOnboardingSuggestions } from './use_onboarding';

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
const SKELETON_ROW_COUNT = 3;
const VISIBLE_PROGRESS_LINES = 4;
const ELAPSED_REFRESH_MS = 10_000;

const EXAMPLE_QUESTIONS = [
  i18n.translate('xpack.nightshift.onboarding.investigate.example.checkoutLatency', {
    defaultMessage: 'Why is checkout latency up?',
  }),
  i18n.translate('xpack.nightshift.onboarding.investigate.example.errorSpike', {
    defaultMessage: "What caused last night's error spike?",
  }),
  i18n.translate('xpack.nightshift.onboarding.investigate.example.topErrors', {
    defaultMessage: 'Which services have the most errors right now?',
  }),
  i18n.translate('xpack.nightshift.onboarding.investigate.example.recentDeployment', {
    defaultMessage: 'Did a recent deployment cause problems?',
  }),
];

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

  // A failed run and a run with nothing to suggest look the same: an empty state with a retry.
  const suggestions = useMemo(
    () => (execution.status === 'failed' ? [] : execution.suggestions ?? []),
    [execution.status, execution.suggestions]
  );
  const hasSuggestions = suggestions.length > 0;

  const start = useCallback(
    (prompt: string, title?: string) => {
      if (isStarting) return;
      setStartingPrompt(prompt);
      startInvestigation(prompt, title);
    },
    [isStarting, startInvestigation]
  );

  const compose = (
    <ComposeCard
      title={i18n.translate('xpack.nightshift.onboarding.investigate.customTitle', {
        defaultMessage: 'Ask your own question',
      })}
      value={message}
      onChange={setMessage}
      isStarting={isStarting}
      isLoading={isStarting && startingPrompt === message.trim()}
      onSubmit={() => start(message.trim())}
    />
  );

  // One tree for every state, so the sections below the suggestions slot stay mounted (and keep
  // what was typed and focused) when the run ends.
  return (
    <div
      data-test-subj="nightshiftOnboardingFirstInvestigationStep"
      css={css`
        display: flex;
        flex-direction: column;
        gap: ${euiTheme.size.xl};
      `}
    >
      <div
        css={css`
          display: flex;
          flex-direction: column;
          gap: ${euiTheme.size.base};
        `}
      >
        {isRunning ? (
          <>
            <AnalyzingBanner startedAt={execution.started_at} progress={execution.progress} />
            <SuggestionsSkeleton />
          </>
        ) : hasSuggestions ? (
          <SuggestionList
            suggestions={suggestions}
            isStarting={isStarting}
            startingPrompt={startingPrompt}
            onInvestigate={(suggestion) => start(suggestion.prompt, suggestion.title)}
          />
        ) : (
          <EuiPanel
            hasBorder
            paddingSize="none"
            data-test-subj="nightshiftOnboardingSuggestionsEmpty"
          >
            <EuiEmptyPrompt
              titleSize="xs"
              paddingSize="none"
              color="transparent"
              css={css`
                max-inline-size: none;
                width: 100%;
                padding-block: ${euiTheme.size.l};
                padding-inline: ${euiTheme.size.m};
              `}
              icon={
                <EuiIllustration
                  type={notFound}
                  alt=""
                  fullWidth={false}
                  css={css`
                    max-inline-size: 80px;
                    margin-inline: auto;
                  `}
                />
              }
              title={
                <h3>
                  {i18n.translate('xpack.nightshift.onboarding.investigate.emptyTitle', {
                    defaultMessage: 'No investigation suggestions found',
                  })}
                </h3>
              }
              body={
                <p>
                  {i18n.translate('xpack.nightshift.onboarding.investigate.emptySuggestionsBody', {
                    defaultMessage:
                      "Elastic nightshift couldn't find anything worth investigating in your data. Try again later, or ask your own question below.",
                  })}
                </p>
              }
              actions={
                <EuiButton
                  size="s"
                  iconType="refresh"
                  isLoading={retry.isLoading}
                  onClick={() => retry.mutate()}
                  data-test-subj="nightshiftOnboardingRetryButton"
                >
                  {i18n.translate('xpack.nightshift.onboarding.investigate.retryButton', {
                    defaultMessage: 'Try again',
                  })}
                </EuiButton>
              }
            />
          </EuiPanel>
        )}
      </div>
      {compose}
      <section data-test-subj="nightshiftOnboardingConnectSources">
        <EuiTitle size="xs">
          <h4>{CONNECT_SOURCES_TITLE}</h4>
        </EuiTitle>
        <EuiSpacer size="m" />
        <ConnectSourcesGrid
          ebtElement={NIGHTSHIFT_EBT_ELEMENTS.ONBOARDING_CONNECTORS}
          filter={isAdditionalType}
        />
      </section>
    </div>
  );
}

/**
 * Banner-style layout (not EuiBanner) with Arturo's indeterminate EuiProgress.
 * AI accents on the Mark plate, icon, and progress only — body stays plain.
 */
function AnalyzingBanner({
  startedAt,
  progress,
}: {
  startedAt?: string;
  progress?: OnboardingProgressStep[];
}): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const title = i18n.translate('xpack.nightshift.onboarding.investigate.analyzingTitle', {
    defaultMessage: 'Gathering and triaging signals that can be investigated',
  });
  const description = i18n.translate(
    'xpack.nightshift.onboarding.investigate.analyzingDescription',
    {
      defaultMessage:
        'This usually takes 2 to 3 minutes and can take up to 5. Meanwhile, consider connecting additional knowledge sources.',
    }
  );
  // Same AI tokens as prototype analyzing chrome / Nightshift hero surfaces.
  const aiSurface = `linear-gradient(99.4deg, ${euiTheme.colors.backgroundLightPrimary} 3.97%, ${euiTheme.colors.backgroundLightAssistance} 65.6%)`;
  const aiProgressTrack = `linear-gradient(97.76deg, ${euiTheme.colors.borderBasePrimary} 17%, ${euiTheme.colors.borderBaseAssistance} 83%)`;
  const aiProgressFill = `linear-gradient(90deg, ${euiTheme.colors.backgroundFilledPrimary} 0%, ${euiTheme.colors.backgroundFilledAssistance} 100%)`;

  return (
    <div
      data-test-subj="nightshiftOnboardingAnalyzing"
      css={css`
        position: relative;
        overflow: hidden;
        border: ${euiTheme.border.thin};
        border-radius: ${euiTheme.border.radius.panel};
        background: ${euiTheme.colors.emptyShade};
      `}
    >
      <EuiProgress
        size="xs"
        color="primary"
        position="absolute"
        css={css`
          background-color: transparent;
          background-image: ${aiProgressTrack};

          /* EUI defaults to 1s — slow the sweep a bit for the analyzing state. */
          &::before {
            background-color: transparent !important;
            background-image: ${aiProgressFill};
            animation-duration: 2.75s;
            border-radius: ${euiTheme.border.radius.medium};
          }
        `}
      />
      <div
        css={css`
          display: flex;
          align-items: flex-start;
          gap: ${euiTheme.size.base};
          padding: ${euiTheme.size.base};
        `}
      >
        <IconMark icon="inspect" color="ai" surface={aiSurface} />
        <div
          css={css`
            flex: 1;
            min-width: 0;
          `}
        >
          <EuiText size="s">
            <p
              css={css`
                margin: 0;
              `}
            >
              <strong>{title}</strong>
              <span
                css={css`
                  display: inline-block;
                  inline-size: calc(${euiTheme.size.s} + ${euiTheme.size.xxs});
                  text-align: center;
                  color: ${euiTheme.colors.textHeading};
                `}
              >
                ·
              </span>
              <span
                css={css`
                  color: ${euiTheme.colors.textParagraph};
                `}
              >
                {description}
              </span>
            </p>
          </EuiText>
          <AnalyzingProgress startedAt={startedAt} progress={progress} />
        </div>
      </div>
    </div>
  );
}

const toProgressLabel = ({ intent, tool_id: toolId }: OnboardingProgressStep): string =>
  intent ||
  i18n.translate('xpack.nightshift.onboarding.investigate.progressFallback', {
    defaultMessage: 'Running {toolId}',
    values: { toolId },
  });

/** The agent's newest lines first, repeated consecutive ones folded into one. */
const toProgressLines = (
  progress: OnboardingProgressStep[]
): Array<{ id: string; label: string }> => {
  const lines: Array<{ id: string; label: string }> = [];
  for (const step of progress) {
    const label = toProgressLabel(step);
    const last = lines[lines.length - 1];
    if (last?.label === label) {
      last.id = step.tool_call_id;
    } else {
      lines.push({ id: step.tool_call_id, label });
    }
  }
  return lines.slice(-VISIBLE_PROGRESS_LINES).reverse();
};

/** What the agent is doing, or how long it has been at it before its first tool call. */
function AnalyzingProgress({
  startedAt,
  progress,
}: {
  startedAt?: string;
  progress?: OnboardingProgressStep[];
}): React.ReactElement | null {
  const { euiTheme } = useEuiTheme();
  const lines = useMemo(() => toProgressLines(progress ?? []), [progress]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), ELAPSED_REFRESH_MS);
    return () => clearInterval(interval);
  }, []);

  if (lines.length === 0) {
    const startedAtMs = startedAt ? Date.parse(startedAt) : NaN;
    if (Number.isNaN(startedAtMs)) return null;
    const minutes = Math.max(0, Math.floor((now - startedAtMs) / 60_000));
    return (
      <EuiText
        size="xs"
        color="subdued"
        css={css`
          margin-top: ${euiTheme.size.s};
        `}
        data-test-subj="nightshiftOnboardingAnalyzingElapsed"
      >
        <p>
          {i18n.translate('xpack.nightshift.onboarding.investigate.elapsed', {
            defaultMessage:
              '{minutes, plural, =0 {Started less than a minute ago} one {Started # minute ago} other {Started # minutes ago}}',
            values: { minutes },
          })}
        </p>
      </EuiText>
    );
  }

  return (
    <div role="status" aria-live="polite" data-test-subj="nightshiftOnboardingAnalyzingProgress">
      <ul
        css={css`
          list-style: none;
          margin: ${euiTheme.size.s} 0 0;
          padding: 0;
          font-size: ${euiTheme.size.m};
          line-height: ${euiTheme.size.base};
          color: ${euiTheme.colors.textSubdued};
        `}
      >
        {lines.map(({ id, label }, index) => (
          <li
            key={id}
            data-test-subj="nightshiftOnboardingAnalyzingProgressLine"
            css={css`
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              ${index === 0 &&
              `font-weight: ${euiTheme.font.weight.medium}; color: ${euiTheme.colors.textHeading};`}
            `}
            title={label}
          >
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Placeholder rows in the layout of the suggestion list, for the time the agent is looking. */
function SuggestionsSkeleton(): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      data-test-subj="nightshiftOnboardingSuggestionsSkeleton"
      aria-hidden={true}
      css={css`
        overflow: hidden;
        border: ${euiTheme.border.thin};
        border-radius: ${euiTheme.border.radius.panel};
        background: ${euiTheme.colors.emptyShade};
      `}
    >
      {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
        <div
          key={index}
          data-test-subj="nightshiftOnboardingSuggestionSkeletonRow"
          css={css`
            display: flex;
            align-items: center;
            gap: ${euiTheme.size.l};
            padding: ${euiTheme.size.base} ${euiTheme.size.base} ${euiTheme.size.base}
              ${euiTheme.size.l};
            & + & {
              border-top: ${euiTheme.border.thin};
            }
          `}
        >
          <EuiSkeletonRectangle
            width={euiTheme.size.xxl}
            height={euiTheme.size.xxl}
            borderRadius="m"
            isLoading
            contentAriaLabel=""
          />
          <div
            css={css`
              flex: 1;
              min-width: 0;
            `}
          >
            <EuiSkeletonText lines={2} size="s" isLoading contentAriaLabel="" />
          </div>
        </div>
      ))}
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
        <ShowMoreButton
          count={SUGGESTIONS_PAGE_SIZE}
          remaining={remaining}
          onClick={() => setVisibleCount((n) => n + SUGGESTIONS_PAGE_SIZE)}
          data-test-subj="nightshiftOnboardingSuggestionsShowMore"
        />
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
      <IconMark icon={mark.icon} isLogo={mark.isLogo} />
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

/** A free-text question, with its own Investigate. */
function ComposeCard({
  title,
  value,
  onChange,
  isStarting,
  isLoading,
  onSubmit,
}: {
  title: string;
  value: string;
  onChange: (value: string) => void;
  isStarting: boolean;
  isLoading: boolean;
  onSubmit: () => void;
}): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const [showHint, setShowHint] = useState(false);
  const hintId = useGeneratedHtmlId({ prefix: 'nightshiftOnboardingComposeHint' });

  const submit = () => {
    if (value.trim().length === 0) {
      // Never an empty investigation: point at the input instead.
      setShowHint(true);
      textAreaRef.current?.focus();
      return;
    }
    onSubmit();
  };

  const fill = (example: string) => {
    onChange(example);
    setShowHint(false);
    textAreaRef.current?.focus();
  };

  return (
    <div
      data-test-subj="nightshiftOnboardingCompose"
      css={css`
        display: flex;
        align-items: flex-start;
        /* Match SuggestionRow: 24px left + gap, 16px other sides. */
        gap: ${euiTheme.size.l};
        padding: ${euiTheme.size.base} ${euiTheme.size.base} ${euiTheme.size.base}
          ${euiTheme.size.l};
        border: ${euiTheme.border.thin};
        border-radius: ${euiTheme.border.radius.panel};
        background: ${euiTheme.colors.emptyShade};
      `}
    >
      <IconMark icon="reporter" />
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
            isDisabled={isStarting}
            isLoading={isLoading}
            onClick={submit}
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
          inputRef={(element) => {
            textAreaRef.current = element;
          }}
          aria-describedby={showHint ? hintId : undefined}
          onChange={(event) => {
            onChange(event.target.value);
            setShowHint(false);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              submit();
            }
          }}
          placeholder={i18n.translate('xpack.nightshift.onboarding.investigate.customPlaceholder', {
            defaultMessage:
              "For example, why is checkout latency up? Or what caused last night's error spike?",
          })}
        />
        <div role="status" id={hintId}>
          {showHint && (
            <EuiText size="xs" color="danger" data-test-subj="nightshiftOnboardingComposeHint">
              {i18n.translate('xpack.nightshift.onboarding.investigate.emptyQuestionHint', {
                defaultMessage: 'Describe a question first, or pick an example.',
              })}
            </EuiText>
          )}
        </div>
        <EuiFlexGroup
          wrap
          responsive={false}
          gutterSize="s"
          data-test-subj="nightshiftOnboardingExamples"
        >
          {EXAMPLE_QUESTIONS.map((example) => (
            <EuiFlexItem grow={false} key={example}>
              <EuiBadge
                color="hollow"
                onClick={() => fill(example)}
                onClickAriaLabel={i18n.translate(
                  'xpack.nightshift.onboarding.investigate.exampleAriaLabel',
                  {
                    defaultMessage: 'Use the example question: {example}',
                    values: { example },
                  }
                )}
                isDisabled={isStarting}
                data-test-subj="nightshiftOnboardingExample"
              >
                {example}
              </EuiBadge>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </div>
    </div>
  );
}
