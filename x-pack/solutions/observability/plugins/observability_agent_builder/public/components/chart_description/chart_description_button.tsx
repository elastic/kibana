/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiHorizontalRule,
  EuiPopover,
  EuiPopoverTitle,
  EuiScreenReaderOnly,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useUiSetting$ } from '@kbn/kibana-react-plugin/public';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { AI_CHAT_EXPERIENCE_TYPE } from '@kbn/management-settings-ids';
import { buildDeterministicChartSummary } from '../../../common/chart_description/build_deterministic_chart_summary';
import type { ChartDescriptionSeries } from '../../../common/chart_description/types';
import { useApiClient } from '../../hooks/use_api_client';
import { useGenAIConnectors } from '../../hooks/use_genai_connectors';
import { useKibana } from '../../hooks/use_kibana';
import { useLicense } from '../../hooks/use_license';
import { useStreamingAiInsight } from '../../hooks/use_streaming_ai_insight';
import { LoadingCursor } from '../ai_insight/loading_cursor';

export interface ChartDescriptionButtonProps {
  chartTitle: string;
  series: ChartDescriptionSeries[];
  start?: string;
  end?: string;
  timestampFormatter?: (timestamp: number) => string;
  valueFormatter?: (value: number) => string;
  isLoading?: boolean;
  hasError?: boolean;
  dataTestSubj?: string;
}

export function ChartDescriptionButton({
  chartTitle,
  series,
  start,
  end,
  timestampFormatter,
  valueFormatter,
  isLoading = false,
  hasError = false,
  dataTestSubj = 'observabilityChartDescriptionButton',
}: ChartDescriptionButtonProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const popoverTitleId = useGeneratedHtmlId({ prefix: 'chartDescriptionTitle' });
  const summaryId = useId();

  const {
    services: { agentBuilder, application },
  } = useKibana();
  const apiClient = useApiClient();
  const { getLicense } = useLicense();
  const license = getLicense();
  const [chatExperience] = useUiSetting$<AIChatExperience>(AI_CHAT_EXPERIENCE_TYPE);
  const { hasConnectors } = useGenAIConnectors();

  const hasEnterpriseLicense = license?.hasAtLeast('enterprise');
  const hasAgentBuilderAccess = application?.capabilities.agentBuilder?.show === true;
  const isAgentChatExperienceEnabled = chatExperience === AIChatExperience.Agent;
  const hasAiInsightAccess = Boolean(
    hasConnectors &&
      agentBuilder &&
      isAgentChatExperienceEnabled &&
      hasAgentBuilderAccess &&
      hasEnterpriseLicense
  );

  const createStream = useCallback(
    (signal: AbortSignal) =>
      apiClient.stream('POST /internal/observability_agent_builder/ai_insights/chart', {
        signal,
        params: {
          body: {
            chartTitle,
            series,
            start,
            end,
          },
        },
      }),
    [apiClient, chartTitle, end, series, start]
  );

  const {
    isLoading: isAiLoading,
    error: aiError,
    summary: aiSummary,
    fetch: fetchAiSummary,
    stop: stopAiSummary,
    regenerate: regenerateAiSummary,
  } = useStreamingAiInsight(createStream);

  const deterministicSummary = useMemo(() => {
    return buildDeterministicChartSummary({
      chartTitle,
      series,
      timestampFormatter,
      locale: i18n.getLocale(),
      valueFormatter,
    });
  }, [chartTitle, series, timestampFormatter, valueFormatter]);

  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
    stopAiSummary();
  }, [stopAiSummary]);

  useEffect(() => {
    if (!isPopoverOpen || hasError || isLoading || !hasAiInsightAccess) {
      return;
    }

    fetchAiSummary();
  }, [fetchAiSummary, hasAiInsightAccess, hasError, isLoading, isPopoverOpen]);

  const buttonLabel = i18n.translate(
    'xpack.observabilityAgentBuilder.chartDescription.buttonLabel',
    {
      defaultMessage: 'Describe chart: {chartTitle}',
      values: { chartTitle },
    }
  );

  const chartDataMessage = useMemo(() => {
    if (hasError) {
      return i18n.translate('xpack.observabilityAgentBuilder.chartDescription.loadError', {
        defaultMessage:
          'The chart data could not be loaded. Try refreshing the page or changing the time range.',
      });
    }

    if (isLoading) {
      return i18n.translate('xpack.observabilityAgentBuilder.chartDescription.loading', {
        defaultMessage: 'Loading chart summary.',
      });
    }

    return undefined;
  }, [hasError, isLoading]);

  const isUsingAiSummary = hasAiInsightAccess && Boolean(aiSummary) && !aiError;
  const isAwaitingAiSummary = hasAiInsightAccess && !chartDataMessage && !aiError && !aiSummary;
  const isStreamingAiSummary = hasAiInsightAccess && isAiLoading && !chartDataMessage;
  const isUsingDeterministicFallback =
    !chartDataMessage &&
    (!hasAiInsightAccess || Boolean(aiError) || (!isAwaitingAiSummary && !aiSummary));

  const generatingAiSummaryMessage = i18n.translate(
    'xpack.observabilityAgentBuilder.chartDescription.generatingAiSummary',
    {
      defaultMessage: 'Generating AI summary.',
    }
  );

  const showScreenReaderLiveRegion =
    hasAiInsightAccess &&
    !chartDataMessage &&
    (isStreamingAiSummary || isAwaitingAiSummary || isUsingAiSummary);

  const screenReaderStatus = useMemo(() => {
    if (!showScreenReaderLiveRegion) {
      return undefined;
    }

    if (isStreamingAiSummary || isAwaitingAiSummary) {
      return generatingAiSummaryMessage;
    }

    return aiSummary;
  }, [
    aiSummary,
    generatingAiSummaryMessage,
    isAwaitingAiSummary,
    isStreamingAiSummary,
    showScreenReaderLiveRegion,
  ]);

  const hideStreamingSummaryFromScreenReader = isStreamingAiSummary && Boolean(aiSummary);

  const summary = chartDataMessage
    ? chartDataMessage
    : isUsingAiSummary
    ? aiSummary
    : isAwaitingAiSummary
    ? generatingAiSummaryMessage
    : deterministicSummary;

  const summaryNote = chartDataMessage
    ? undefined
    : isUsingAiSummary
    ? i18n.translate('xpack.observabilityAgentBuilder.chartDescription.aiSummaryNote', {
        defaultMessage: 'AI-generated summary from chart data.',
      })
    : isUsingDeterministicFallback
    ? hasAiInsightAccess && aiError
      ? i18n.translate(
          'xpack.observabilityAgentBuilder.chartDescription.basicSummaryFallbackNote',
          {
            defaultMessage: 'Showing basic summary because the AI summary could not be generated.',
          }
        )
      : i18n.translate('xpack.observabilityAgentBuilder.chartDescription.basicSummaryNote', {
          defaultMessage: 'Basic summary generated from chart data.',
        })
    : undefined;

  const popover = (
    <div
      role="region"
      aria-labelledby={popoverTitleId}
      aria-describedby={summaryId}
      data-test-subj={`${dataTestSubj}Panel`}
    >
      {screenReaderStatus ? (
        <EuiScreenReaderOnly>
          <p aria-live="polite" data-test-subj={`${dataTestSubj}ScreenReaderStatus`}>
            {screenReaderStatus}
          </p>
        </EuiScreenReaderOnly>
      ) : null}
      <EuiPopoverTitle id={popoverTitleId}>
        {i18n.translate('xpack.observabilityAgentBuilder.chartDescription.popoverTitle', {
          defaultMessage: 'Chart summary',
        })}
      </EuiPopoverTitle>
      <EuiText size="s" id={summaryId}>
        <p aria-hidden={hideStreamingSummaryFromScreenReader}>{summary}</p>
        {isAiLoading && hasAiInsightAccess && !chartDataMessage && <LoadingCursor />}
      </EuiText>
      {summaryNote ? (
        <EuiText size="xs" color="subdued">
          {summaryNote}
        </EuiText>
      ) : null}
      {hasAiInsightAccess && !chartDataMessage && (isAiLoading || aiSummary || aiError) ? (
        <>
          <EuiSpacer size="s" />
          <EuiHorizontalRule margin="none" />
          <EuiSpacer size="xs" />
          {isAiLoading ? (
            <EuiButtonEmpty
              data-test-subj={`${dataTestSubj}StopGeneratingButton`}
              color="text"
              iconType="stop"
              size="s"
              onClick={stopAiSummary}
            >
              {i18n.translate('xpack.observabilityAgentBuilder.chartDescription.stopGenerating', {
                defaultMessage: 'Stop generating',
              })}
            </EuiButtonEmpty>
          ) : (
            <EuiButtonEmpty
              data-test-subj={`${dataTestSubj}RegenerateButton`}
              color="text"
              iconType="sparkles"
              size="s"
              onClick={regenerateAiSummary}
            >
              {i18n.translate('xpack.observabilityAgentBuilder.chartDescription.regenerate', {
                defaultMessage: 'Regenerate AI summary',
              })}
            </EuiButtonEmpty>
          )}
        </>
      ) : null}
    </div>
  );

  return (
    <EuiPopover
      aria-labelledby={popoverTitleId}
      button={
        <EuiToolTip content={buttonLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            data-test-subj={dataTestSubj}
            iconType="inspect"
            aria-label={buttonLabel}
            aria-expanded={isPopoverOpen}
            onClick={() => setIsPopoverOpen((open) => !open)}
          />
        </EuiToolTip>
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="m"
      anchorPosition="downLeft"
    >
      {popover}
    </EuiPopover>
  );
}
