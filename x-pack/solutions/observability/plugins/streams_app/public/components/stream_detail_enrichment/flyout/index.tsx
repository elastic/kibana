/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import React, { useMemo } from 'react';
import { FormProvider, SubmitHandler, useForm, useWatch } from 'react-hook-form';
import deepEqual from 'fast-deep-equal';
import { EuiCallOut, EuiForm, EuiButton, EuiSpacer, EuiHorizontalRule } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  DissectProcessingDefinition,
  GrokProcessingDefinition,
  ProcessingDefinition,
  ReadStreamDefinition,
  conditionSchema,
  getProcessorType,
} from '@kbn/streams-schema';
import { ProcessorTypeSelector } from './processor_type_selector';
import { ProcessorFlyoutTemplate } from './processor_flyout_template';
import { GrokFormState, ProcessorDefinition, ProcessorFormState } from '../types';
import { DangerZone } from './danger_zone';
import { DissectProcessorForm } from './dissect';
import { GrokProcessorForm } from './grok';

const defaultCondition: ProcessingDefinition['condition'] = {
  field: '',
  operator: 'eq',
  value: '',
};

const defaultProcessorConfig: GrokFormState = {
  type: 'grok',
  field: 'message',
  patterns: [{ value: '' }],
  pattern_definitions: {},
  ignore_failure: false,
  condition: defaultCondition,
};

export interface ProcessorFlyoutProps {
  definition: ReadStreamDefinition;
  onClose: () => void;
}

export interface AddProcessorFlyoutProps extends ProcessorFlyoutProps {
  onAddProcessor: (_newProcessing: ProcessingDefinition) => void;
}
export interface EditProcessorFlyoutProps extends ProcessorFlyoutProps {
  onDeleteProcessor: (id: string) => void;
  onUpdateProcessor: (id: string, _processor: ProcessorDefinition) => void;
  processor: ProcessorDefinition;
}

export function AddProcessorFlyout({
  definition,
  onAddProcessor,
  onClose,
}: AddProcessorFlyoutProps) {
  const methods = useForm<ProcessorFormState>({
    defaultValues: defaultProcessorConfig,
  });

  const formFields = useWatch({ control: methods.control });

  const hasChanges = useMemo(() => !deepEqual(defaultProcessorConfig, formFields), [formFields]);

  const handleSubmit: SubmitHandler<ProcessorFormState> = (data) => {
    if (data.type === 'grok') {
      const { condition, field, patterns, pattern_definitions, ignore_failure } = data;

      onAddProcessor({
        condition: isValidCondition(condition) ? condition : undefined,
        config: {
          grok: {
            patterns: patterns
              .filter(({ value }) => value.trim().length > 0)
              .map(({ value }) => value),
            field,
            pattern_definitions,
            ignore_failure,
          },
        },
      });
    }

    if (data.type === 'dissect') {
      const { condition, field, pattern, append_separator, ignore_failure } = data;

      onAddProcessor({
        condition: isValidCondition(condition) ? condition : undefined,
        config: {
          dissect: {
            field,
            pattern,
            append_separator,
            ignore_failure,
          },
        },
      });
    }

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
          {formFields.type === 'grok' && <GrokProcessorForm definition={definition} />}
          {formFields.type === 'dissect' && <DissectProcessorForm definition={definition} />}
        </EuiForm>
      </FormProvider>
    </ProcessorFlyoutTemplate>
  );
}

export function EditProcessorFlyout({
  definition,
  onClose,
  onDeleteProcessor,
  onUpdateProcessor,
  processor,
}: EditProcessorFlyoutProps) {
  const initialProcessorConfig = useMemo(() => {
    const type = getProcessorType(processor);
    let configValues: ProcessorFormState = defaultProcessorConfig;

    if (type === 'grok') {
      const { grok } = processor.config as GrokProcessingDefinition;

      configValues = structuredClone({
        ...grok,
        type,
        patterns: grok.patterns.map((pattern) => ({ value: pattern })),
      });
    }

    if (type === 'dissect') {
      const { dissect } = processor.config as DissectProcessingDefinition;

      configValues = structuredClone({
        ...dissect,
        type,
      });
    }

    return {
      condition: processor.condition || defaultCondition,
      ...configValues,
    };
  }, [processor]);

  const methods = useForm<ProcessorFormState>({
    defaultValues: initialProcessorConfig,
  });

  const formFields = useWatch({ control: methods.control });

  const hasChanges = useMemo(
    () => !deepEqual(initialProcessorConfig, formFields),
    [initialProcessorConfig, formFields]
  );

  const handleSubmit: SubmitHandler<ProcessorFormState> = (data) => {
    if (data.type === 'grok') {
      const { condition, field, patterns, pattern_definitions, ignore_failure } = data;

      onUpdateProcessor(processor.id, {
        id: processor.id,
        condition: isValidCondition(condition) ? condition : undefined,
        config: {
          grok: {
            patterns: patterns
              .filter(({ value }) => value.trim().length > 0)
              .map(({ value }) => value),
            field,
            pattern_definitions,
            ignore_failure,
          },
        },
      });
    }

    if (data.type === 'dissect') {
      const { condition, field, pattern, append_separator, ignore_failure } = data;

      onUpdateProcessor(processor.id, {
        id: processor.id,
        condition: isValidCondition(condition) ? condition : undefined,
        config: {
          dissect: {
            field,
            pattern,
            append_separator,
            ignore_failure,
          },
        },
      });
    }

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
          {formFields.type === 'grok' && <GrokProcessorForm definition={definition} />}
          {formFields.type === 'dissect' && <DissectProcessorForm definition={definition} />}
          <EuiHorizontalRule />
          <DangerZone onDeleteProcessor={handleProcessorDelete} />
        </EuiForm>
      </FormProvider>
    </ProcessorFlyoutTemplate>
  );
}

const isValidCondition = (condition: ProcessingDefinition['condition']) => {
  return conditionSchema.safeParse(condition).success;
};
