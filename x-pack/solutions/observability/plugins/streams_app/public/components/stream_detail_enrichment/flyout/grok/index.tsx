/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiCallOut,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { ReadStreamDefinition } from '@kbn/streams-schema';
import { useFormContext, useWatch } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import { useDateRange } from '@kbn/observability-utils-browser/hooks/use_date_range';
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
import { convertFormStateToProcessing } from '../../utils';

export const GrokProcessorForm = ({
  samples,
  definition,
  onSimulate,
}: {
  samples?: Array<Record<PropertyKey, unknown>>;
  definition?: ReadStreamDefinition;
  onSimulate?: UseProcessingSimulatorReturnType['simulate'];
}) => {
  return (
    <>
      <ProcessorFieldSelector />
      <GrokPatternsEditor />
      <EuiSpacer size="m" />
      {samples && onSimulate && definition && (
        <GrokAiSuggestions samples={samples} definition={definition} onSimulate={onSimulate} />
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

function GrokAiSuggestions({
  samples,
  definition,
  onSimulate,
}: {
  samples: Array<Record<PropertyKey, unknown>>;
  definition: ReadStreamDefinition;
  onSimulate: UseProcessingSimulatorReturnType['simulate'];
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
          },
        },
      });
    },
    [definition.name, end, fieldValue, start, streamsRepositoryClient],
    { disableToastOnError: true }
  );
  if (isLoadingSuggestions) {
    return <EuiLoadingSpinner />;
  }

  const refreshButton = (
    <EuiButton
      size="s"
      data-test-subj="streamsAppGrokAiSuggestionsRefreshSuggestionsButton"
      iconType={'refresh'}
      onClick={refreshSuggestions}
    >
      {i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.refreshSuggestions',
        {
          defaultMessage: 'Refresh suggestions',
        }
      )}
    </EuiButton>
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

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiText size="s">
        {i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.noSuggestions',
          { defaultMessage: '✨ AI suggestions' }
        )}{' '}
        {refreshButton}
      </EuiText>
      {suggestions.patterns.map((pattern) => (
        <EuiFlexGroup responsive={false} wrap={false} key={pattern}>
          <EuiFlexItem grow>
            <EuiCodeBlock paddingSize="s">{pattern}</EuiCodeBlock>
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
              const newState = form.getValues();
              onSimulate(convertFormStateToProcessing(newState), newState.detected_fields);
            }}
            data-test-subj="streamsAppGrokAiSuggestionsButton"
            iconType="plusInCircle"
            aria-label={i18n.translate(
              'xpack.streams.grokAiSuggestions.euiButtonIcon.addPatternLabel',
              { defaultMessage: 'Add pattern' }
            )}
          />
        </EuiFlexGroup>
      ))}
    </EuiFlexGroup>
  );
}
