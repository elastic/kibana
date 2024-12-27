/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { FormProvider, useController, useForm, useWatch } from 'react-hook-form';
import { EuiCallOut, EuiForm, EuiButton, EuiSpacer, EuiAccordion, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ProcessingDefinition, ReadStreamDefinition, isWiredReadStream } from '@kbn/streams-schema';
import { css } from '@emotion/react';
import { ProcessorTypeSelector } from './processor_type_selector';
import { ProcessorFlyoutTemplate } from './processor_flyout_template';
import { ConditionEditor } from '../../condition_editor';
import { GrokPatternDefinition } from './grok_pattern_definition';
import { ProcessingDefinitionGrok, ProcessorFormState } from '../types';
import { ProcessorFieldSelector } from './processor_field_selector';
import { GrokPatternsEditor } from './grok_patterns_editor';
import { ToggleField } from './toggle_field';

const defaultCondition: ProcessingDefinition['condition'] = {
  field: '',
  operator: 'eq',
  value: '',
};

export interface ProcessorFlyoutProps {
  definition: ReadStreamDefinition;
  onClose: () => void;
}

export function AddProcessorFlyout({ definition, onClose }: ProcessorFlyoutProps) {
  const methods = useForm<ProcessorFormState>({
    defaultValues: {
      type: 'grok',
      field: 'message',
      patterns: [{ value: '' }],
      pattern_definitions: {},
      ignore_failure: false,
      condition: defaultCondition,
    },
  });

  const processorType = useWatch({ name: 'type', control: methods.control });

  const handleSubmit = (data) => {
    console.log(data);
  };

  return (
    <ProcessorFlyoutTemplate
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
