/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonIcon,
  EuiCallOut,
  EuiCodeBlock,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPopover,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useWatch, useFormContext } from 'react-hook-form';
import { useAbortController } from '@kbn/observability-utils-browser/hooks/use_abort_controller';
import { RecursiveRecord, StreamDefinition } from '@kbn/streams-schema';
import type { FindActionResult } from '@kbn/actions-plugin/server';
import { UseGenAIConnectorsResult } from '@kbn/observability-ai-assistant-plugin/public/hooks/use_genai_connectors';
import { useKibana } from '../../../../hooks/use_kibana';
import { GrokFormState, ProcessorFormState } from '../../types';
import { UseProcessingSimulatorReturn } from '../../hooks/use_processing_simulator';

const RefreshButton = ({
  generatePatterns,
  connectors,
  selectConnector,
  currentConnector,
}: {
  generatePatterns: () => void;
  selectConnector?: UseGenAIConnectorsResult['selectConnector'];
  connectors?: FindActionResult[];
  currentConnector?: string;
}) => {
  const [isPopoverOpen, setPopover] = useState(false);
  const splitButtonPopoverId = useGeneratedHtmlId({
    prefix: 'splitButtonPopover',
  });

  const onButtonClick = () => {
    setPopover(!isPopoverOpen);
  };

  const closePopover = () => {
    setPopover(false);
  };

  return (
    <EuiFlexGroup responsive={false} gutterSize="xs" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiButton
          size="s"
          data-test-subj="streamsAppGrokAiSuggestionsRefreshSuggestionsButton"
          onClick={generatePatterns}
          disabled={currentConnector === undefined}
        >
          {i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.refreshSuggestions',
            {
              defaultMessage: '✨ Generate patterns',
            }
          )}
        </EuiButton>
      </EuiFlexItem>
      {connectors && connectors.length > 1 && (
        <EuiFlexItem grow={false}>
          <EuiPopover
            id={splitButtonPopoverId}
            isOpen={isPopoverOpen}
            button={
              <EuiButtonIcon
                data-test-subj="streamsAppGrokAiPickConnectorButton"
                onClick={onButtonClick}
                display="base"
                size="s"
                iconType="boxesVertical"
                aria-label={i18n.translate('xpack.streams.refreshButton.euiButtonIcon.moreLabel', {
                  defaultMessage: 'More',
                })}
              />
            }
          >
            <EuiContextMenuPanel
              size="s"
              items={connectors.map((connector) => (
                <EuiContextMenuItem
                  key={connector.id}
                  icon={connector.id === currentConnector ? 'check' : 'empty'}
                  onClick={() => {
                    selectConnector?.(connector.id);
                    closePopover();
                  }}
                >
                  {connector.name}
                </EuiContextMenuItem>
              ))}
            />
          </EuiPopover>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

export function useAiEnabled() {
  const { dependencies } = useKibana();
  const { observabilityAIAssistant } = dependencies.start;

  const aiAssistantEnabled = observabilityAIAssistant?.service.isEnabled();

  const genAiConnectors = observabilityAIAssistant?.useGenAIConnectors();

  return aiAssistantEnabled && (genAiConnectors?.connectors || []).length > 0;
}

export function GrokAiSuggestions({
  definition,
  refreshSimulation,
  samples,
  extraButtons,
}: {
  definition: StreamDefinition;
  refreshSimulation: UseProcessingSimulatorReturn['refreshSimulation'];
  samples: RecursiveRecord[];
  extraButtons?: React.ReactNode;
}) {
  const { dependencies } = useKibana();
  const {
    streams: { streamsRepositoryClient },
    observabilityAIAssistant,
  } = dependencies.start;

  const fieldValue = useWatch<ProcessorFormState, 'field'>({ name: 'field' });
  const form = useFormContext<GrokFormState>();

  const genAiConnectors = observabilityAIAssistant?.useGenAIConnectors();
  const currentConnector = genAiConnectors?.selectedConnector;

  const [isLoadingSuggestions, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<Error | undefined>();
  const [suggestions, setSuggestions] = useState<
    { patterns: string[]; simulations: any[] } | undefined
  >();
  const [blocklist, setBlocklist] = useState<Set<string>>(new Set());

  const abortController = useAbortController();

  const refreshSuggestions = useCallback(() => {
    if (!currentConnector) {
      setSuggestions({ patterns: [], simulations: [] });
      return;
    }
    setSuggestionsLoading(true);
    setSuggestionsError(undefined);
    setSuggestions(undefined);
    streamsRepositoryClient
      .fetch('POST /api/streams/{id}/processing/_suggestions', {
        signal: abortController.signal,
        params: {
          path: { id: definition.name },
          body: {
            field: fieldValue,
            connectorId: currentConnector,
            samples,
          },
        },
      })
      .then((response) => {
        setSuggestions(response);
        setSuggestionsLoading(false);
      })
      .catch((error) => {
        setSuggestionsError(error);
        setSuggestionsLoading(false);
      });
  }, [
    abortController.signal,
    currentConnector,
    definition.name,
    fieldValue,
    samples,
    streamsRepositoryClient,
  ]);

  let content: React.ReactNode = null;

  if (isLoadingSuggestions) {
    content = <EuiLoadingSpinner />;
  }

  if (suggestionsError) {
    content = <EuiCallOut color="danger">{suggestionsError.message}</EuiCallOut>;
  }

  if (suggestions && !suggestions.patterns.length) {
    content = (
      <>
        <EuiText size="s">
          {i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.noSuggestions',
            { defaultMessage: 'No AI suggestions found' }
          )}{' '}
        </EuiText>
      </>
    );
  }

  const currentPatterns = form.getValues().patterns;
  const filteredSuggestions = suggestions?.patterns
    .map((pattern, i) => ({
      pattern,
      success_rate: suggestions.simulations[i].success_rate,
    }))
    .filter(
      (suggestion) =>
        !blocklist.has(suggestion.pattern) &&
        !currentPatterns.some(({ value }) => value === suggestion.pattern)
    );

  if (filteredSuggestions && !filteredSuggestions.length) {
    // if all suggestions are in the blocklist or already in the patterns, just show the generation button, but no message
    content = null;
  }

  if (filteredSuggestions && filteredSuggestions.length) {
    content = (
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiText size="xs">
          {i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.suggestions',
            {
              defaultMessage: 'Generated patterns',
            }
          )}
        </EuiText>
        {filteredSuggestions.map((suggestion) => {
          return (
            <EuiFlexGroup responsive={false} wrap={false} key={suggestion.pattern}>
              <EuiFlexItem grow>
                <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
                  <EuiCodeBlock paddingSize="s">{suggestion.pattern}</EuiCodeBlock>
                  <EuiBadge color="hollow">
                    {i18n.translate(
                      'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.matchRate',
                      {
                        defaultMessage: 'Match rate: {matchRate}%',
                        values: {
                          matchRate: (suggestion.success_rate * 100).toFixed(2),
                        },
                      }
                    )}
                  </EuiBadge>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
                  <EuiButtonIcon
                    onClick={() => {
                      const currentState = form.getValues();
                      const hasNoPatterns =
                        !currentState.patterns || !currentState.patterns.some(({ value }) => value);
                      if (hasNoPatterns) {
                        form.setValue('patterns', [{ value: suggestion.pattern }]);
                      } else {
                        form.setValue('patterns', [
                          ...currentState.patterns,
                          { value: suggestion.pattern },
                        ]);
                      }
                      refreshSimulation();
                    }}
                    data-test-subj="streamsAppGrokAiSuggestionsButton"
                    iconType="plusInCircle"
                    aria-label={i18n.translate(
                      'xpack.streams.grokAiSuggestions.euiButtonIcon.addPatternLabel',
                      { defaultMessage: 'Add pattern' }
                    )}
                  />
                  <EuiButtonIcon
                    onClick={() => {
                      setBlocklist(new Set([...blocklist, suggestion.pattern]));
                    }}
                    data-test-subj="hideSuggestionButton"
                    iconType="cross"
                    aria-label={i18n.translate(
                      'xpack.streams.grokAiSuggestions.euiButtonIcon.hidePatternSuggestionLabel',
                      { defaultMessage: 'Hide pattern suggestion' }
                    )}
                  />
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        })}
      </EuiFlexGroup>
    );
  }
  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      {content}
      <EuiFlexGroup direction="row" gutterSize="m" justifyContent="flexStart" alignItems="center">
        <RefreshButton
          generatePatterns={refreshSuggestions}
          connectors={genAiConnectors?.connectors}
          selectConnector={genAiConnectors?.selectConnector}
          currentConnector={currentConnector}
        />
        {extraButtons}
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
}
