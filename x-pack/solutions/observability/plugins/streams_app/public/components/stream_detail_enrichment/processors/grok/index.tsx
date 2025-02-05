/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiButton,
  EuiButtonIcon,
  EuiCallOut,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { useFormContext, useWatch } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import { useDateRange } from '@kbn/observability-utils-browser/hooks/use_date_range';
import { StreamDefinition } from '@kbn/streams-schema';
import { useStreamsAppFetch } from '../../../../hooks/use_streams_app_fetch';
import { GrokPatternDefinition } from './grok_pattern_definition';
import { GrokPatternsEditor } from './grok_patterns_editor';
import { ProcessorFieldSelector } from '../processor_field_selector';
import { OptionalFieldsAccordion } from '../optional_fields_accordion';
import { ProcessorConditionEditor } from '../processor_condition_editor';
import { IgnoreFailureToggle, IgnoreMissingToggle } from '../ignore_toggles';
import { useKibana } from '../../../../hooks/use_kibana';
import { GrokFormState, ProcessorFormState } from '../../types';
import { UseProcessingSimulatorReturnType } from '../../hooks/use_processing_simulator';

export const GrokProcessorForm = ({
  definition,
  refreshSimulation,
  samples,
}: {
  definition?: StreamDefinition;
  refreshSimulation?: UseProcessingSimulatorReturnType['refreshSimulation'];
  samples?: Array<Record<PropertyKey, unknown>>;
}) => {
  return (
    <>
      <ProcessorFieldSelector />
      <GrokPatternsEditor />
      <EuiSpacer size="m" />
      {refreshSimulation && definition && samples && (
        <GrokAiSuggestions
          definition={definition}
          refreshSimulation={refreshSimulation}
          samples={samples}
        />
      )}
      <EuiSpacer size="m" />
      <OptionalFieldsAccordion>
        <GrokPatternDefinition />
        <EuiSpacer size="m" />
        <ProcessorConditionEditor />
      </OptionalFieldsAccordion>
      <EuiSpacer size="m" />
      <IgnoreFailureToggle />
      <IgnoreMissingToggle />
    </>
  );
};

function GrokAiSuggestions(props: {
  definition: StreamDefinition;
  refreshSimulation: UseProcessingSimulatorReturnType['refreshSimulation'];
  samples: Array<Record<PropertyKey, unknown>>;
}) {
  const forcedStateAccordionId = useGeneratedHtmlId({
    prefix: 'grokaisuggestions',
  });
  const [trigger, setTrigger] = useState<'closed' | 'open'>('closed');

  return (
    <EuiAccordion
      id={forcedStateAccordionId}
      forceState={trigger}
      onToggle={() => {
        setTrigger((t) => (t === 'closed' ? 'open' : 'closed'));
      }}
      buttonContent={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.noSuggestions',
        { defaultMessage: '✨ AI suggestions' }
      )}
    >
      {trigger === 'open' && <InnerGrokAiSuggestions {...props} />}
    </EuiAccordion>
  );
}

function InnerGrokAiSuggestions({
  definition,
  refreshSimulation,
  samples,
}: {
  definition: StreamDefinition;
  refreshSimulation: UseProcessingSimulatorReturnType['refreshSimulation'];
  samples: Array<Record<PropertyKey, unknown>>;
}) {
  const { dependencies } = useKibana();
  const {
    streams: { streamsRepositoryClient },
    data,
  } = dependencies.start;

  const {
    absoluteTimeRange: { start, end },
  } = useDateRange({ data });

  const fieldValue = useWatch<ProcessorFormState, 'field'>({ name: 'field' });
  const form = useFormContext<GrokFormState>();

  const {
    loading: isLoadingSuggestions,
    value: suggestions,
    error: suggestionsError,
    refresh: refreshSuggestions,
  } = useStreamsAppFetch(
    ({ signal }) => {
      return streamsRepositoryClient.fetch('POST /api/streams/{id}/processing/_suggestions', {
        signal,
        params: {
          path: { id: definition.name },
          body: {
            field: fieldValue,
            condition: { always: {} },
            start,
            end,
            samples,
          },
        },
      });
    },
    [definition.name, end, fieldValue, samples, start, streamsRepositoryClient],
    { disableToastOnError: true }
  );
  if (isLoadingSuggestions) {
    return <EuiLoadingSpinner />;
  }

  const refreshButton = (
    <EuiFlexGroup alignItems="flexStart">
      <EuiButton
        size="s"
        data-test-subj="streamsAppGrokAiSuggestionsRefreshSuggestionsButton"
        iconType={'refresh'}
        onClick={refreshSuggestions}
      >
        {i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.refreshSuggestions',
          {
            defaultMessage: 'Generate new suggestions',
          }
        )}
      </EuiButton>
    </EuiFlexGroup>
  );

  if (suggestionsError) {
    <EuiCallOut color="danger">
      {suggestionsError.message}
      {refreshButton}
    </EuiCallOut>;
  }

  if (!suggestions?.patterns.length) {
    return (
      <>
        <EuiText size="s">
          {i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.noSuggestions',
            { defaultMessage: 'No AI suggestions found' }
          )}{' '}
          {refreshButton}
        </EuiText>
      </>
    );
  }
  const currentPatterns = form.getValues().patterns;

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      {suggestions.patterns.map((pattern, i) => {
        if (currentPatterns && currentPatterns.some(({ value }) => value === pattern)) {
          return null;
        }
        return (
          <EuiFlexGroup responsive={false} wrap={false} key={pattern}>
            <EuiFlexItem grow>
              <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
                <EuiCodeBlock paddingSize="s">{pattern}</EuiCodeBlock>
                <EuiBadge color="hollow">
                  {i18n.translate(
                    'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.matchRate',
                    {
                      defaultMessage: 'Match rate: {matchRate}%',
                      values: {
                        matchRate: (suggestions.simuations[i].success_rate * 100).toFixed(2),
                      },
                    }
                  )}
                </EuiBadge>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiButtonIcon
              onClick={() => {
                const currentState = form.getValues();
                const hasNoPatterns =
                  !currentState.patterns || !currentState.patterns.some(({ value }) => value);
                if (hasNoPatterns) {
                  form.setValue('patterns', [{ value: pattern }]);
                } else {
                  form.setValue('patterns', [...currentState.patterns, { value: pattern }]);
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
          </EuiFlexGroup>
        );
      })}
      {refreshButton}
    </EuiFlexGroup>
  );
}
