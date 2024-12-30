/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import React, { useMemo } from 'react';
import { FormProvider, SubmitHandler, useController, useForm, useWatch } from 'react-hook-form';
import deepEqual from 'fast-deep-equal';
import {
  EuiCallOut,
  EuiForm,
  EuiButton,
  EuiSpacer,
  EuiAccordion,
  useEuiTheme,
  EuiHorizontalRule,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  DissectProcessingDefinition,
  GrokProcessingDefinition,
  ProcessingDefinition,
  ReadStreamDefinition,
  conditionSchema,
  getProcessorType,
  isWiredReadStream,
} from '@kbn/streams-schema';
import { css } from '@emotion/react';
import { ProcessorTypeSelector } from './processor_type_selector';
import { ProcessorFlyoutTemplate } from './processor_flyout_template';
import { ConditionEditor } from '../../condition_editor';
import { GrokPatternDefinition } from './grok_pattern_definition';
import { GrokFormState, ProcessorDefinition, ProcessorFormState } from '../types';
import { ProcessorFieldSelector } from './processor_field_selector';
import { GrokPatternsEditor } from './grok_patterns_editor';
import { ToggleField } from './toggle_field';
import { DangerZone } from './danger_zone';
import { DissectPatternDefinition } from './dissect_pattern_definition';
import { DissectAppendSeparator } from './dissect_append_separator';

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

interface GrokProcessorFormProps {
  definition: ReadStreamDefinition;
}

const GrokProcessorForm = ({ definition }: GrokProcessorFormProps) => {
  const { euiTheme } = useEuiTheme();

  const { field } = useController({ name: 'condition' });

  const mappedFields = useMemo(() => {
    if (isWiredReadStream(definition)) {
      return Object.entries({
        ...definition.stream.ingest.wired.fields,
        ...definition.inherited_fields,
      }).map(([name, { type }]) => ({ name, type }));
    }

    return [];
  }, [definition]);

  return (
    <>
      <ProcessorFieldSelector fields={mappedFields} />
      <GrokPatternsEditor />
      <EuiSpacer size="m" />
      <EuiAccordion
        element="fieldset"
        id="optionalFieldsAccordion"
        paddingSize="none"
        buttonContent={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.optionalFields',
          { defaultMessage: 'Optional fields' }
        )}
      >
        <div
          css={css`
            border-left: ${euiTheme.border.thin};
            margin-left: ${euiTheme.size.m};
            padding-top: ${euiTheme.size.m};
            padding-left: calc(${euiTheme.size.m} + ${euiTheme.size.xs});
          `}
        >
          <GrokPatternDefinition />
          <EuiSpacer size="m" />
          <ConditionEditor condition={field.value} onConditionChange={field.onChange} />
        </div>
      </EuiAccordion>
      <EuiSpacer size="m" />
      <ToggleField
        name="ignore_failure"
        label={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.ignoreFailuresLabel',
          { defaultMessage: 'Ignore failures for this processor' }
        )}
      />
    </>
  );
};

interface DissectProcessorFormProps {
  definition: ReadStreamDefinition;
}

const DissectProcessorForm = ({ definition }: DissectProcessorFormProps) => {
  const { euiTheme } = useEuiTheme();

  const { field } = useController({ name: 'condition' });

  const mappedFields = useMemo(() => {
    if (isWiredReadStream(definition)) {
      return Object.entries({
        ...definition.stream.ingest.wired.fields,
        ...definition.inherited_fields,
      }).map(([name, { type }]) => ({ name, type }));
    }

    return [];
  }, [definition]);

  return (
    <>
      <ProcessorFieldSelector fields={mappedFields} />
      <DissectPatternDefinition />
      <EuiSpacer size="m" />
      <EuiAccordion
        element="fieldset"
        id="optionalFieldsAccordion"
        paddingSize="none"
        buttonContent={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.optionalFields',
          { defaultMessage: 'Optional fields' }
        )}
      >
        <div
          css={css`
            border-left: ${euiTheme.border.thin};
            margin-left: ${euiTheme.size.m};
            padding-top: ${euiTheme.size.m};
            padding-left: calc(${euiTheme.size.m} + ${euiTheme.size.xs});
          `}
        >
          <DissectAppendSeparator />
          <EuiSpacer size="m" />
          <ConditionEditor condition={field.value} onConditionChange={field.onChange} />
        </div>
      </EuiAccordion>
      <EuiSpacer size="m" />
      <ToggleField
        name="ignore_failure"
        label={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.ignoreFailuresLabel',
          { defaultMessage: 'Ignore failures for this processor' }
        )}
      />
    </>
  );
};

const isValidCondition = (condition: ProcessingDefinition['condition']) => {
  return conditionSchema.safeParse(condition).success;
};
