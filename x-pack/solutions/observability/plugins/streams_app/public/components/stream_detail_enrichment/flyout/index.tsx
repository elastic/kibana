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
  EuiPanel,
  EuiTitle,
  EuiConfirmModal,
  useGeneratedHtmlId,
  EuiHorizontalRule,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  ProcessingDefinition,
  ReadStreamDefinition,
  conditionSchema,
  getProcessorType,
  isWiredReadStream,
} from '@kbn/streams-schema';
import { css } from '@emotion/react';
import { useBoolean } from '@kbn/react-hooks';
import { ProcessorTypeSelector } from './processor_type_selector';
import { ProcessorFlyoutTemplate } from './processor_flyout_template';
import { ConditionEditor } from '../../condition_editor';
import { GrokPatternDefinition } from './grok_pattern_definition';
import {
  GrokFormState,
  ProcessingDefinitionGrok,
  ProcessorDefinition,
  ProcessorFormState,
} from '../types';
import { ProcessorFieldSelector } from './processor_field_selector';
import { GrokPatternsEditor } from './grok_patterns_editor';
import { ToggleField } from './toggle_field';

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
  processor: ProcessorDefinition;
  onUpdateProcessor: (id: string, _processor: ProcessorDefinition) => void;
  onDeleteProcessor: (id: string) => void;
}

export function AddProcessorFlyout({
  definition,
  onClose,
  onAddProcessor,
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
      onClose();
    }
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
        </EuiForm>
      </FormProvider>
    </ProcessorFlyoutTemplate>
  );
}

export function EditProcessorFlyout({
  definition,
  processor,
  onUpdateProcessor,
  onDeleteProcessor,
  onClose,
}: EditProcessorFlyoutProps) {
  const initialProcessorConfig = useMemo(() => {
    const type = getProcessorType(processor);
    const configValues = structuredClone(processor.config[type]);

    if (type === 'grok') {
      configValues.patterns = configValues.patterns.map((pattern) => ({ value: pattern }));
    }

    return {
      type,
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
      onClose();
    }
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
        <EuiButton onClick={methods.handleSubmit(handleSubmit)}>
          {i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.confirmEditProcessor',
            { defaultMessage: 'Update processor' }
          )}
        </EuiButton>
      }
    >
      <FormProvider {...methods}>
        <EuiForm component="form" fullWidth onSubmit={methods.handleSubmit(handleSubmit)}>
          <ProcessorTypeSelector readOnly />
          <EuiSpacer size="m" />
          {formFields.type === 'grok' && <GrokProcessorForm definition={definition} />}
          <EuiHorizontalRule />
          <DangerZone onDeleteProcessor={handleProcessorDelete} />
        </EuiForm>
      </FormProvider>
    </ProcessorFlyoutTemplate>
  );
}

interface GrokProcessorFormProps {
  definition: ReadStreamDefinition;
  processor?: ProcessingDefinitionGrok;
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

const DangerZone = ({
  onDeleteProcessor,
}: Pick<DeleteProcessorButtonProps, 'onDeleteProcessor'>) => {
  return (
    <EuiPanel hasShadow={false} paddingSize="none">
      <EuiTitle size="xs">
        <h3>
          {i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.dangerAreaTitle',
            { defaultMessage: 'Danger area' }
          )}
        </h3>
      </EuiTitle>
      <EuiSpacer />
      <DeleteProcessorButton onDeleteProcessor={onDeleteProcessor} />
    </EuiPanel>
  );
};

interface DeleteProcessorButtonProps {
  onDeleteProcessor: () => void;
}

const DeleteProcessorButton = ({ onDeleteProcessor }: DeleteProcessorButtonProps) => {
  const [isConfirmModalOpen, { on: openConfirmModal, off: closeConfirmModal }] = useBoolean();
  const confirmModalId = useGeneratedHtmlId();

  return (
    <>
      <EuiButton color="danger" onClick={openConfirmModal}>
        {i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.dangerAreaTitle',
          { defaultMessage: 'Delete processor' }
        )}
      </EuiButton>
      {isConfirmModalOpen && (
        <EuiConfirmModal
          aria-labelledby={confirmModalId}
          title={i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.deleteProcessorModalTitle',
            { defaultMessage: 'Delete processor' }
          )}
          titleProps={{ id: confirmModalId }}
          onCancel={closeConfirmModal}
          onConfirm={onDeleteProcessor}
          cancelButtonText={i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.deleteProcessorModalCancel',
            { defaultMessage: 'Keep processor' }
          )}
          confirmButtonText={i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.deleteProcessorModalConfirm',
            { defaultMessage: 'Delete processor progress' }
          )}
          buttonColor="danger"
          defaultFocusedButton="confirm"
        >
          <p>
            {i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.deleteProcessorModalBody',
              {
                defaultMessage:
                  'You can still reset this until the changes are confirmed on the processors list.',
              }
            )}
          </p>
        </EuiConfirmModal>
      )}
    </>
  );
};

const isValidCondition = (condition: ProcessingDefinition['condition']) => {
  return conditionSchema.safeParse(condition).success;
};
