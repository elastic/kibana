/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  RCA_END_PROCESS_TOOL_NAME,
  RCA_INVESTIGATE_ENTITY_TOOL_NAME,
  RCA_OBSERVE_TOOL_NAME,
} from '@kbn/observability-ai-common/root_cause_analysis';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AssistantMessage, MessageRole, ToolMessage } from '@kbn/inference-common';
import type {
  RootCauseAnalysisEvent,
  RootCauseAnalysisToolMessage,
  RootCauseAnalysisToolRequest,
  ToolErrorMessage,
} from '@kbn/observability-ai-server/root_cause_analysis';
import { findLast } from 'lodash';
import React from 'react';
import { css } from '@emotion/css';
import { EntityBadge } from '../entity_badge';
import { RootCauseAnalysisCallout } from '../rca_callout';
import { RootCauseAnalysisEntityInvestigation } from '../rca_entity_investigation';
import { RootCauseAnalysisObservationPanel } from '../rca_observation_panel';
import { RootCauseAnalysisReport } from '../rca_report';
import { RootCauseAnalysisStepItem } from '../rca_step';
import { RootCauseAnalysisStopButton } from '../rca_stop_button';

export function RootCauseAnalysisContainer({
  events,
  completeInBackground,
  onStartAnalysisClick,
  onStopAnalysisClick,
  onResetAnalysisClick,
  onClearAnalysisClick,
  onCompleteInBackgroundClick,
  loading,
  error,
}: {
  events?: RootCauseAnalysisEvent[];
  completeInBackground: boolean;
  onStartAnalysisClick: () => void;
  onStopAnalysisClick: () => void;
  onResetAnalysisClick: () => void;
  onClearAnalysisClick: () => void;
  onCompleteInBackgroundClick: () => void;
  loading: boolean;
  error?: Error;
}) {
  const theme = useEuiTheme();

  if (!events?.length && !loading && !error) {
    return (
      <RootCauseAnalysisCallout
        onClick={onStartAnalysisClick}
        completeInBackground={completeInBackground}
        onCompleteInBackgroundClick={onCompleteInBackgroundClick}
      />
    );
  }

  const elements: React.ReactElement[] = [];

  const toolResponsesById = new Map(
    events
      ?.filter(
        (event): event is Extract<RootCauseAnalysisEvent, ToolMessage> =>
          event.role === MessageRole.Tool
      )
      .map((event) => [event.toolCallId, event])
  );

  events?.forEach((event) => {
    if (event.role === MessageRole.Assistant) {
      event.toolCalls.forEach((toolCall) => {
        switch (toolCall.function.name) {
          case RCA_OBSERVE_TOOL_NAME:
            elements.push(
              getObservationItem(
                toolCall.function.arguments.title,
                toolResponsesById.get(toolCall.toolCallId)
              )
            );
            break;

          case RCA_INVESTIGATE_ENTITY_TOOL_NAME:
          case RCA_END_PROCESS_TOOL_NAME:
            const response = toolResponsesById.get(toolCall.toolCallId);
            const element = response ? getToolResponseItem(response) : undefined;
            if (element) {
              elements.push(element);
            }
            break;
        }
      });
    }
  });

  const clearButton = (
    <EuiButton
      data-test-subj="observabilityAiAssistantAppRootCauseAnalysisClearButton"
      color={error ? 'danger' : 'primary'}
      onClick={() => {
        onClearAnalysisClick();
      }}
      iconType="crossInCircle"
    >
      {i18n.translate('xpack.observabilityAiAssistant.rca.clearButtonLabel', {
        defaultMessage: 'Clear',
      })}
    </EuiButton>
  );

  const restartButton = (
    <EuiButton
      data-test-subj="observabilityAiAssistantAppRootCauseAnalysisRestartButton"
      color={error ? 'danger' : 'primary'}
      fill={!!error}
      onClick={() => {
        onResetAnalysisClick();
      }}
      iconType="refresh"
    >
      {i18n.translate('xpack.observabilityAiAssistant.rca.restartButtonLabel', {
        defaultMessage: 'Restart',
      })}
    </EuiButton>
  );

  if (loading) {
    const label = getLoadingLabel(events);
    elements.push(
      <RootCauseAnalysisStepItem
        label={label}
        button={
          completeInBackground ? undefined : (
            <RootCauseAnalysisStopButton
              onClick={() => {
                onStopAnalysisClick();
              }}
            />
          )
        }
        loading
      />
    );
  } else if (error) {
    elements.push(
      <RootCauseAnalysisStepItem
        label={i18n.translate('xpack.observabilityAiAssistant.rca.analysisError', {
          defaultMessage: 'Failed to complete analysis: {errorMessage}',
          values: {
            errorMessage: error.message,
          },
        })}
        iconType="alert"
        color="danger"
        button={
          <EuiFlexGroup direction="row" gutterSize="s">
            {clearButton}
            {restartButton}
          </EuiFlexGroup>
        }
      />
    );
  } else {
    // completed
    elements.push(
      <RootCauseAnalysisStepItem
        label={
          <EuiText
            size="m"
            className={css`
              font-weight: ${theme.euiTheme.font.weight.bold};
            `}
          >
            {i18n.translate('xpack.observabilityAiAssistant.rca.analysisCompleted', {
              defaultMessage: 'Completed analysis',
            })}
          </EuiText>
        }
        iconType="checkInCircleFilled"
        color="primary"
        button={
          <EuiFlexGroup direction="row" gutterSize="s">
            {clearButton}
            {restartButton}
          </EuiFlexGroup>
        }
      />
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      {elements.map((element, index) => {
        return React.cloneElement(element, { key: index });
      })}
    </EuiFlexGroup>
  );
}

function getLoadingLabel(events?: RootCauseAnalysisEvent[]) {
  const lastAssistantMessage = findLast(
    events,
    (event): event is Extract<RootCauseAnalysisEvent, AssistantMessage> =>
      event.role === MessageRole.Assistant
  );

  if (lastAssistantMessage) {
    const toolResponsesByToolCallId = new Map(
      events
        ?.filter(
          (event): event is Extract<RootCauseAnalysisEvent, ToolMessage> =>
            event.role === MessageRole.Tool
        )
        .map((event) => [event.toolCallId, event])
    );
    const pendingToolCalls = lastAssistantMessage.toolCalls.filter((event) => {
      const response = toolResponsesByToolCallId.get(event.toolCallId);

      return !response;
    });

    const allInvestigateEntityToolCalls = pendingToolCalls.filter(
      (event): event is RootCauseAnalysisToolRequest<typeof RCA_INVESTIGATE_ENTITY_TOOL_NAME> =>
        event.function.name === RCA_INVESTIGATE_ENTITY_TOOL_NAME
    );

    if (allInvestigateEntityToolCalls.length) {
      return (
        <EuiFlexGroup direction="row" gutterSize="m" alignItems="center">
          <EuiText size="s">
            {i18n.translate('xpack.observabilityAiAssistant.rca.investigatingEntitiesTextLabel', {
              defaultMessage: 'Investigating entities',
            })}
          </EuiText>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
              {allInvestigateEntityToolCalls.map((toolCall) => {
                return (
                  <EuiFlexItem key={toolCall.toolCallId}>
                    <EntityBadge
                      entity={{
                        [toolCall.function.arguments.entity.field]:
                          toolCall.function.arguments.entity.value,
                      }}
                    />
                  </EuiFlexItem>
                );
              })}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    if (pendingToolCalls[0]?.function.name === RCA_END_PROCESS_TOOL_NAME) {
      return i18n.translate('xpack.observabilityAiAssistant.rca.finalizingReport', {
        defaultMessage: 'Finalizing report',
      });
    }
  }

  return i18n.translate('xpack.observabilityAiAssistant.rca.analysisLoadingLabel', {
    defaultMessage: 'Thinking...',
  });
}

function getToolResponseErrorItem(response: ToolErrorMessage['response']) {
  return (
    <RootCauseAnalysisStepItem
      label={i18n.translate('xpack.observabilityAiAssistant.rca.toolResponseError', {
        defaultMessage: 'Failed to execute task: {errorMessage}',
        values: {
          errorMessage: response.error.message,
        },
      })}
      iconType="alert"
      color="danger"
    />
  );
}

function getToolResponseItem(
  message: RootCauseAnalysisToolMessage | ToolErrorMessage
): React.ReactElement | null {
  if (message.name === 'observe') {
    return null;
  }

  if (message.name === 'error') {
    return getToolResponseErrorItem(message.response);
  }

  if (message.name === 'investigateEntity') {
    return (
      <RootCauseAnalysisEntityInvestigation
        summary={message.response.summary}
        entity={message.response.entity}
        ownPatterns={message.data.attachments.ownPatterns}
        patternsFromOtherEntities={message.data.attachments.patternsFromOtherEntities}
      />
    );
  }

  return (
    <RootCauseAnalysisReport
      report={message.response.report}
      timeline={message.response.timeline}
    />
  );
}

function getObservationItem(
  title: React.ReactNode,
  toolResponse?: RootCauseAnalysisToolMessage | ToolErrorMessage
) {
  let content: string | undefined;
  switch (toolResponse?.name) {
    case 'observe':
      content = toolResponse.response.content;
      break;

    case 'error':
      content = i18n.translate('xpack.observabilityAiAssistant.rca.failedObservation', {
        defaultMessage: 'Failed to generate observations',
      });
      break;
  }

  return (
    <RootCauseAnalysisObservationPanel title={title} content={content} loading={!toolResponse} />
  );
}
