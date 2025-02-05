/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  useFormContext,
  useFieldArray,
  UseFormRegisterReturn,
  FieldError,
  FieldErrorsImpl,
} from 'react-hook-form';
import {
  DragDropContextProps,
  EuiFormRow,
  EuiPanel,
  EuiButtonEmpty,
  EuiDraggable,
  EuiFlexGroup,
  EuiIcon,
  EuiFieldText,
  EuiButtonIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { StreamDefinition } from '@kbn/streams-schema';
import React, { useCallback, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiCallOut,
  EuiCodeBlock,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiText,
} from '@elastic/eui';
import { useWatch } from 'react-hook-form';
import { useAbortController } from '@kbn/observability-utils-browser/hooks/use_abort_controller';
import { SortableList } from '../../sortable_list';
import { useKibana } from '../../../../hooks/use_kibana';
import { GrokFormState, ProcessorFormState } from '../../types';
import { UseProcessingSimulatorReturnType } from '../../hooks/use_processing_simulator';

export const GrokPatternsEditor = ({
  definition,
  refreshSimulation,
  samples,
}: {
  definition?: StreamDefinition;
  refreshSimulation?: UseProcessingSimulatorReturnType['refreshSimulation'];
  samples?: Array<Record<PropertyKey, unknown>>;
}) => {
  const {
    formState: { errors },
    register,
  } = useFormContext();
  const { fields, append, remove, move } = useFieldArray<Pick<GrokFormState, 'patterns'>>({
    name: 'patterns',
  });

  const { dependencies } = useKibana();
  const { observabilityAIAssistant } = dependencies.start;

  const aiAssistantEnabled = observabilityAIAssistant?.service.isEnabled();

  const fieldsWithError = fields.map((field, id) => {
    return {
      ...field,
      error: (errors.patterns as unknown as FieldErrorsImpl[])?.[id]?.value as
        | FieldError
        | undefined,
    };
  });

  const handlerPatternDrag: DragDropContextProps['onDragEnd'] = ({ source, destination }) => {
    if (source && destination) {
      move(source.index, destination.index);
    }
  };

  const handleAddPattern = () => {
    append({ value: '' });
  };

  const getRemovePatternHandler = (id: number) => (fields.length > 1 ? () => remove(id) : null);

  const addButton = (
    <EuiButtonEmpty
      data-test-subj="streamsAppGrokPatternsEditorAddPatternButton"
      onClick={handleAddPattern}
    >
      {i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.grokEditor.addPattern',
        { defaultMessage: 'Add pattern' }
      )}
    </EuiButtonEmpty>
  );

  return (
    <>
      <EuiFormRow
        label={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processor.grokEditorLabel',
          { defaultMessage: 'Grok patterns editor' }
        )}
      >
        <EuiPanel color="subdued" paddingSize="s">
          <SortableList onDragItem={handlerPatternDrag}>
            {fieldsWithError.map((field, idx) => (
              <DraggablePatternInput
                key={field.id}
                field={field}
                idx={idx}
                onRemove={getRemovePatternHandler(idx)}
                inputProps={register(`patterns.${idx}.value`, {
                  required: i18n.translate(
                    'xpack.streams.streamDetailView.managementTab.enrichment.processor.grokEditorRequiredError',
                    { defaultMessage: 'A pattern is required.' }
                  ),
                })}
              />
            ))}
          </SortableList>
        </EuiPanel>
      </EuiFormRow>
      {aiAssistantEnabled && refreshSimulation && definition && samples ? (
        <GrokAiSuggestions
          definition={definition}
          refreshSimulation={refreshSimulation}
          samples={samples}
          extraButtons={addButton}
        />
      ) : (
        addButton
      )}
    </>
  );
};

interface DraggablePatternInputProps {
  field: GrokFormState['patterns'][number] & { id: string; error?: FieldError };
  idx: number;
  inputProps: UseFormRegisterReturn<`patterns.${number}.value`>;
  onRemove: ((idx: number) => void) | null;
}

const DraggablePatternInput = ({
  field,
  idx,
  inputProps,
  onRemove,
}: DraggablePatternInputProps) => {
  const { ref, ...inputPropsWithoutRef } = inputProps;
  const { error, id } = field;

  const isInvalid = Boolean(error);

  return (
    <EuiDraggable
      index={idx}
      spacing="m"
      draggableId={id}
      hasInteractiveChildren
      customDragHandle
      style={{
        paddingLeft: 0,
        paddingRight: 0,
      }}
    >
      {(provided) => (
        <EuiFormRow isInvalid={isInvalid} error={error?.message}>
          <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
            <EuiPanel
              color="transparent"
              paddingSize="xs"
              {...provided.dragHandleProps}
              aria-label={i18n.translate(
                'xpack.streams.streamDetailView.managementTab.enrichment.processor.grokEditor.dragHandleLabel',
                { defaultMessage: 'Drag Handle' }
              )}
            >
              <EuiIcon type="grab" />
            </EuiPanel>
            <EuiFieldText
              data-test-subj="streamsAppDraggablePatternInputFieldText"
              {...inputPropsWithoutRef}
              inputRef={ref}
              compressed
              isInvalid={isInvalid}
            />
            {onRemove && (
              <EuiButtonIcon
                data-test-subj="streamsAppDraggablePatternInputButton"
                iconType="minusInCircle"
                color="danger"
                onClick={() => onRemove(idx)}
                aria-label={i18n.translate(
                  'xpack.streams.streamDetailView.managementTab.enrichment.processor.grokEditor.removePattern',
                  { defaultMessage: 'Remove grok pattern' }
                )}
              />
            )}
          </EuiFlexGroup>
        </EuiFormRow>
      )}
    </EuiDraggable>
  );
};

function GrokAiSuggestions({
  definition,
  refreshSimulation,
  samples,
  extraButtons,
}: {
  definition: StreamDefinition;
  refreshSimulation: UseProcessingSimulatorReturnType['refreshSimulation'];
  samples: Array<Record<PropertyKey, unknown>>;
  extraButtons?: React.ReactNode;
}) {
  const { dependencies } = useKibana();
  const {
    streams: { streamsRepositoryClient },
  } = dependencies.start;

  const fieldValue = useWatch<ProcessorFormState, 'field'>({ name: 'field' });
  const form = useFormContext<GrokFormState>();

  const [isLoadingSuggestions, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<Error | undefined>();
  const [suggestions, setSuggestions] = useState<
    { patterns: string[]; simuations: any[] } | undefined
  >();
  const [blocklist, setBlocklist] = useState<Set<string>>(new Set());

  const abortController = useAbortController();

  const refreshSuggestions = useCallback(() => {
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
  }, [abortController.signal, definition.name, fieldValue, samples, streamsRepositoryClient]);

  let content: React.ReactNode = null;

  if (isLoadingSuggestions) {
    content = <EuiLoadingSpinner />;
  }

  const refreshButton = (
    <EuiButton
      size="s"
      data-test-subj="streamsAppGrokAiSuggestionsRefreshSuggestionsButton"
      onClick={refreshSuggestions}
    >
      {i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.refreshSuggestions',
        {
          defaultMessage: '✨ Generate patterns',
        }
      )}
    </EuiButton>
  );

  if (suggestionsError) {
    content = <EuiCallOut color="danger">{suggestionsError.message}</EuiCallOut>;
  }

  const filteredSuggestions = suggestions?.patterns
    .map((pattern, i) => ({
      pattern,
      success_rate: suggestions.simuations[i].success_rate,
    }))
    .filter((suggestion) => !blocklist.has(suggestion.pattern));

  if (filteredSuggestions && !filteredSuggestions.length) {
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

  if (filteredSuggestions && filteredSuggestions.length) {
    const currentPatterns = form.getValues().patterns;

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
        {filteredSuggestions.map((suggestion, i) => {
          if (
            currentPatterns &&
            currentPatterns.some(({ value }) => value === suggestion.pattern)
          ) {
            return null;
          }
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
        {refreshButton}
        {extraButtons}
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
}
