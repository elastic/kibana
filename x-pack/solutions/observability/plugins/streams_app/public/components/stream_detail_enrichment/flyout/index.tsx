/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { FormProvider, SubmitHandler, useForm } from 'react-hook-form';
import { EuiCallOut, EuiForm, EuiButton, EuiSpacer, EuiHorizontalRule } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ProcessingDefinition, ReadStreamDefinition, getProcessorType } from '@kbn/streams-schema';
import { isEqual } from 'lodash';
import { dynamic } from '@kbn/shared-ux-utility';
import { ProcessorTypeSelector } from './processor_type_selector';
import { ProcessorFlyoutTemplate } from './processor_flyout_template';
import { DetectedField, ProcessorDefinition, ProcessorFormState } from '../types';
import { DangerZone } from './danger_zone';
import { DissectProcessorForm } from './dissect';
import { GrokProcessorForm } from './grok';
import { convertFormStateToProcessing, getDefaultFormState } from '../utils';

const ProcessorOutcomePreview = dynamic(() =>
  import(/* webpackChunkName: "management_processor_outcome" */ './processor_outcome_preview').then(
    (mod) => ({
      default: mod.ProcessorOutcomePreview,
    })
  )
);

export interface ProcessorFlyoutProps {
  onClose: () => void;
}

export interface AddProcessorFlyoutProps extends ProcessorFlyoutProps {
  definition: ReadStreamDefinition;
  onAddProcessor: (newProcessing: ProcessingDefinition, newFields?: DetectedField[]) => void;
}
export interface EditProcessorFlyoutProps extends ProcessorFlyoutProps {
  processor: ProcessorDefinition;
  onDeleteProcessor: (id: string) => void;
  onUpdateProcessor: (id: string, processor: ProcessorDefinition) => void;
}

export function AddProcessorFlyout({
  definition,
  onAddProcessor,
  onClose,
}: AddProcessorFlyoutProps) {
  const defaultValues = useMemo(() => getDefaultFormState('grok'), []);

  const methods = useForm<ProcessorFormState>({ defaultValues });

  const formFields = methods.watch();

  const hasChanges = useMemo(
    () => !isEqual(defaultValues, formFields),
    [defaultValues, formFields]
  );

  const handleSubmit: SubmitHandler<ProcessorFormState> = (data) => {
    const processingDefinition = convertFormStateToProcessing(data);

    onAddProcessor(processingDefinition, data.detected_fields);
    onClose();
  };

  return (
    <ProcessorFlyoutTemplate
      shouldConfirm={hasChanges}
      onClose={onClose}
      title={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.titleAdd',
        { defaultMessage: 'Add processor' }
      )}
      confirmButton={
        <EuiButton onClick={methods.handleSubmit(handleSubmit)}>
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
          <EuiSpacer size="m" />
          {formFields.type === 'grok' && <GrokProcessorForm />}
          {formFields.type === 'dissect' && <DissectProcessorForm />}
        </EuiForm>
        <EuiHorizontalRule />
        <ProcessorOutcomePreview definition={definition} formFields={formFields} />
      </FormProvider>
    </ProcessorFlyoutTemplate>
  );
}

export function EditProcessorFlyout({
  onClose,
  onDeleteProcessor,
  onUpdateProcessor,
  processor,
}: EditProcessorFlyoutProps) {
  const defaultValues = useMemo(
    () => getDefaultFormState(getProcessorType(processor), processor),
    [processor]
  );

  const methods = useForm<ProcessorFormState>({ defaultValues });

  const formFields = methods.watch();

  const hasChanges = useMemo(
    () => !isEqual(defaultValues, formFields),
    [defaultValues, formFields]
  );

  const handleSubmit: SubmitHandler<ProcessorFormState> = (data) => {
    const processingDefinition = convertFormStateToProcessing(data);

    onUpdateProcessor(processor.id, { id: processor.id, ...processingDefinition });
    onClose();
  };

  const handleProcessorDelete = () => {
    onDeleteProcessor(processor.id);
    onClose();
  };

  return (
    <ProcessorFlyoutTemplate
      shouldConfirm={hasChanges}
      onClose={onClose}
      title={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.titleEdit',
        { defaultMessage: 'Edit processor' }
      )}
      banner={
        <EuiCallOut
          title={i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.calloutEdit',
            { defaultMessage: 'Outcome preview is not available during edition' }
          )}
          iconType="iInCircle"
        />
      }
      confirmButton={
        <EuiButton onClick={methods.handleSubmit(handleSubmit)} disabled={!hasChanges}>
          {i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.confirmEditProcessor',
            { defaultMessage: 'Update processor' }
          )}
        </EuiButton>
      }
    >
      <FormProvider {...methods}>
        <EuiForm component="form" fullWidth onSubmit={methods.handleSubmit(handleSubmit)}>
          <ProcessorTypeSelector disabled />
          <EuiSpacer size="m" />
          {formFields.type === 'grok' && <GrokProcessorForm />}
          {formFields.type === 'dissect' && <DissectProcessorForm />}
          <EuiHorizontalRule />
          <DangerZone onDeleteProcessor={handleProcessorDelete} />
        </EuiForm>
      </FormProvider>
    </ProcessorFlyoutTemplate>
  );
}
