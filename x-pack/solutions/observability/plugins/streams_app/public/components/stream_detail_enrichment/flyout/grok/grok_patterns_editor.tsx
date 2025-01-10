/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useFormContext, useFieldArray, UseFormRegisterReturn } from 'react-hook-form';
import {
  DragDropContextProps,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
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
  const { register } = useFormContext();
  const { fields, append, remove, move } = useFieldArray<Pick<GrokFormState, 'patterns'>>({
    name: 'patterns',
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
        'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.grokEditorLabel',
        { defaultMessage: 'Grok patterns editor' }
      )}
    >
      <EuiPanel color="subdued" paddingSize="m">
        <SortableList onDragItem={handlerPatternDrag}>
          {fields.map((field, idx) => (
            <DraggablePatternInput
              key={field.id}
              pattern={field}
              idx={idx}
              onRemove={getRemovePatternHandler(idx)}
              inputProps={register(`patterns.${idx}.value`)}
            />
          ))}
        </SortableList>
        <EuiSpacer size="m" />
        <EuiButtonEmpty onClick={handleAddPattern} iconType="plusInCircle" flush="left">
          {i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.grokEditor.addPattern',
            { defaultMessage: 'Add pattern' }
          )}
        </EuiButtonEmpty>
      </EuiPanel>
    </EuiFormRow>
  );
};

interface DraggablePatternInputProps {
  idx: number;
  inputProps: UseFormRegisterReturn<`patterns.${number}.value`>;
  onRemove: ((idx: number) => void) | null;
  pattern: GrokFormState['patterns'][number] & { id: string };
}

const DraggablePatternInput = ({
  idx,
  inputProps,
  onRemove,
  pattern,
}: DraggablePatternInputProps) => {
  const { ref, ...inputPropsWithoutRef } = inputProps;

  return (
    <EuiDraggable
      index={idx}
      spacing="m"
      draggableId={pattern.id}
      hasInteractiveChildren
      customDragHandle
      style={{
        paddingLeft: 0,
        paddingRight: 0,
      }}
    >
      {(provided) => (
        <EuiFlexGroup gutterSize="m" responsive={false} alignItems="center">
          <EuiPanel
            color="transparent"
            paddingSize="xs"
            {...provided.dragHandleProps}
            aria-label="Drag Handle"
          >
            <EuiIcon type="grab" />
          </EuiPanel>
          <EuiFieldText {...inputPropsWithoutRef} inputRef={ref} compressed />
          {onRemove && (
            <EuiButtonIcon
              iconType="minusInCircle"
              color="danger"
              onClick={() => onRemove(idx)}
              aria-label={i18n.translate(
                'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.grokEditor.removePattern',
                { defaultMessage: 'Remove grok pattern' }
              )}
            />
          )}
        </EuiFlexGroup>
      )}
    </EuiDraggable>
  );
};
