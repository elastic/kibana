/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  FormProvider,
  UseControllerProps,
  UseFormReturn,
  useController,
  useFieldArray,
  useForm,
  useFormContext,
  useWatch,
} from 'react-hook-form';
import {
  EuiCallOut,
  EuiForm,
  EuiFormRow,
  EuiFlexGroup,
  EuiSuperSelect,
  EuiSuperSelectOption,
  EuiButtonEmpty,
  EuiButton,
  EuiIcon,
  EuiButtonIcon,
  EuiFieldText,
  EuiPanel,
  DragDropContextProps,
  EuiDraggable,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FieldIcon } from '@kbn/react-field';
import {
  FieldDefinition,
  ProcessingDefinition,
  ReadStreamDefinition,
} from '@kbn/streams-plugin/common';
import { ProcessorType } from '../types';
import { ProcessorTypeSelector } from './processor_type_selector';
import { SortableList } from '../sortable_list';
import { ProcessorFlyoutTemplate } from './processor_flyout_template';

interface ProcessorFlyoutProps {
  definition: ReadStreamDefinition;
  onClose: () => void;
}

interface BaseProcessingDefinition {
  condition?: ProcessingDefinition['condition'];
}
interface ProcessingDefinitionGrok extends BaseProcessingDefinition {
  config: Extract<ProcessingDefinition['config'], { type: 'grok' }>;
}

interface ProcessingDefinitionDissect extends BaseProcessingDefinition {
  config: Extract<ProcessingDefinition['config'], { type: 'dissect' }>;
}

type GrokFormState = ProcessingDefinitionGrok['config'];
type DissectFormState = ProcessingDefinitionDissect['config'];

type ProcessorFormState = GrokFormState | DissectFormState;

export function AddProcessorFlyout({ definition, onClose }: ProcessorFlyoutProps) {
  const methods = useForm<ProcessorFormState>({
    defaultValues: {
      type: 'grok',
      field: 'message',
    },
  });

  const processorType = useWatch({ name: 'type', control: methods.control });
  const all = useWatch({ control: methods.control });
  console.log(all);

  const handleSubmit = (event) => {
    console.log('submit');
  };

  return (
    <ProcessorFlyoutTemplate
      onClose={onClose}
      title={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.titleAdd',
        { defaultMessage: 'Add processor' }
      )}
      confirmButton={
        <EuiButton onClick={handleSubmit}>
          {i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.confirmAddProcessor',
            { defaultMessage: 'Add processor' }
          )}
        </EuiButton>
      }
    >
      <FormProvider {...methods}>
        <EuiForm component="form" fullWidth onSubmit={methods.handleSubmit(handleSubmit)}>
          <ProcessorTypeSelector />
          <EuiSpacer />
          {processorType === 'grok' && <GrokProcessorForm definition={definition} />}
        </EuiForm>
      </FormProvider>
    </ProcessorFlyoutTemplate>
  );
}

export function EditProcessorFlyout({
  definition,
  processor,
  onClose,
}: ProcessorFlyoutProps & { processor: ProcessingDefinition }) {
  return (
    <ProcessorFlyoutTemplate
      onClose={onClose}
      title={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.titleEdit',
        { defaultMessage: 'Edit processor' }
      )}
      subHeader={
        <EuiCallOut
          title={i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.calloutEdit',
            { defaultMessage: 'Outcome preview is not available during edition' }
          )}
          iconType="iInCircle"
        />
      }
      confirmButton={
        <EuiButton
        // isDisabled={isSaving || !saveChanges}
        // onClick={() => saveChanges && saveChanges()}
        >
          {i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.confirmEditProcessor',
            { defaultMessage: 'Update processor' }
          )}
        </EuiButton>
      }
    />
  );
}

interface GrokProcessorFormProps {
  definition: ReadStreamDefinition;
  processor?: ProcessingDefinitionGrok;
}

const GrokProcessorForm = ({ definition, processor, onChange }: GrokProcessorFormProps) => {
  const { control } = useFormContext();
  const mergedFields = [...definition.fields, ...definition.inheritedFields];

  return (
    <>
      <ProcessorFieldSelector
        name="field"
        control={control}
        rules={{ required: true }}
        fields={mergedFields}
      />
      <GrokEditor />
    </>
  );
};

interface ProcessorFieldSelectorProps extends UseControllerProps<GrokFormState> {
  fields: FieldDefinition[];
}

const ProcessorFieldSelector = ({ fields, ...props }: ProcessorFieldSelectorProps) => {
  const { field, fieldState } = useController(props);
  // Should we filter the available options by "match_only_text" only?
  const options: Array<EuiSuperSelectOption<string>> = useMemo(
    () =>
      fields.map(({ name, type }) => ({
        value: name,
        inputDisplay: type ? (
          <EuiFlexGroup alignItems="center" gutterSize="s">
            {type && <FieldIcon type={type} size="s" />}
            {name}
          </EuiFlexGroup>
        ) : (
          name
        ),
      })),
    [fields]
  );

  return (
    <EuiFormRow
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.fieldSelectorLabel',
        { defaultMessage: 'Field' }
      )}
      helpText={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.fieldSelectorHelpText',
        { defaultMessage: 'Field to search for matches.' }
      )}
    >
      <EuiSuperSelect
        isInvalid={fieldState.invalid}
        options={options}
        valueOfSelected={field.value as string}
        onChange={field.onChange}
        fullWidth
        placeholder={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.fieldSelectorPlaceholder',
          { defaultMessage: 'message, event.original ...' }
        )}
      />
    </EuiFormRow>
  );
};

const GrokEditor = () => {
  const { control, register, watch } = useFormContext();
  const {
    fields: patterns,
    append,
    remove,
    move,
  } = useFieldArray({
    control,
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

  const getRemovePatternHandler = (id: number) => (patterns.length > 1 ? () => remove(id) : null);

  return (
    <EuiFormRow
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.grokEditorLabel',
        { defaultMessage: 'Grok patterns editor' }
      )}
    >
      <EuiPanel color="subdued" paddingSize="m">
        <SortableList onDragItem={handlerPatternDrag}>
          {patterns.map((pattern, idx) => (
            <DraggablePatternInput
              key={pattern.id}
              pattern={pattern}
              idx={idx}
              onRemove={getRemovePatternHandler(idx)}
              inputProps={register(`patterns.${idx}.value`)}
            />
          ))}
        </SortableList>
        <EuiSpacer size="s" />
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

const DraggablePatternInput = ({ pattern, onRemove, idx, inputProps }) => {
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
          <EuiFieldText {...inputProps} compressed />
          {onRemove && (
            <EuiButtonIcon
              iconType="minusInCircle"
              color="danger"
              onClick={() => onRemove(idx)}
              aria-label={i18n.translate(
                'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.grokEditor.removePattern',
                {
                  defaultMessage: 'Remove pattern {pattern}',
                  values: { pattern: inputProps.value },
                }
              )}
            />
          )}
        </EuiFlexGroup>
      )}
    </EuiDraggable>
  );
};
