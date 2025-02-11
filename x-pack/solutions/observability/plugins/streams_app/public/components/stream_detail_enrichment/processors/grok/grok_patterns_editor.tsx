/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
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
import { SortableList } from '../../sortable_list';
import { GrokFormState } from '../../types';

export const GrokPatternsEditor = () => {
  const {
    formState: { errors },
    register,
  } = useFormContext();
  const { fields, append, remove, move } = useFieldArray<Pick<GrokFormState, 'patterns'>>({
    name: 'patterns',
  });

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

  return (
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
        <EuiButtonEmpty
          data-test-subj="streamsAppGrokPatternsEditorAddPatternButton"
          onClick={handleAddPattern}
          iconType="plusInCircle"
        >
          {i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processor.grokEditor.addPattern',
            { defaultMessage: 'Add pattern' }
          )}
        </EuiButtonEmpty>
      </EuiPanel>
    </EuiFormRow>
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
