/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiForm,
  EuiSpacer,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiPanel,
  useEuiTheme,
  EuiHorizontalRule,
  EuiAccordion,
  EuiButtonIcon,
  EuiFlexItem,
  EuiIcon,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ReadStreamDefinition } from '@kbn/streams-schema';
import { isEqual } from 'lodash';
import React, { useMemo } from 'react';
import { useForm, SubmitHandler, FormProvider } from 'react-hook-form';
import { css } from '@emotion/react';
import { useBoolean } from '@kbn/react-hooks';
import { DissectProcessorForm } from './flyout/dissect';
import { GrokProcessorForm } from './flyout/grok';
import { ProcessorTypeSelector } from './flyout/processor_type_selector';
import {
  ProcessingDefinition,
  DetectedField,
  ProcessorFormState,
  EnrichmentUIProcessorDefinition,
  isDissectProcessor,
  isGrokProcessor,
} from './types';
import { getDefaultFormState, convertFormStateToProcessing } from './utils';
import { useDiscardConfirm } from '../../hooks/use_discard_confirm';

export interface ProcessorPanelProps {
  definition: ReadStreamDefinition;
}

export interface AddProcessorPanelProps extends ProcessorPanelProps {
  isInitiallyOpen?: boolean;
  onAddProcessor: (newProcessing: ProcessingDefinition, newFields?: DetectedField[]) => void;
}

export interface EditProcessorPanelProps extends ProcessorPanelProps {
  processor: EnrichmentUIProcessorDefinition;
  onDeleteProcessor: (id: string) => void;
  onUpdateProcessor: (id: string, processor: EnrichmentUIProcessorDefinition) => void;
}

export function AddProcessorPanel({
  definition,
  isInitiallyOpen = false,
  onAddProcessor,
}: AddProcessorPanelProps) {
  const { euiTheme } = useEuiTheme();
  const [isOpen, { on: openPanel, off: closePanel }] = useBoolean(isInitiallyOpen);
  const defaultValues = useMemo(() => getDefaultFormState('grok'), []);

  const methods = useForm<ProcessorFormState>({ defaultValues, mode: 'onChange' });

  const formFields = methods.watch();

  const hasChanges = useMemo(
    () => !isEqual(defaultValues, formFields),
    [defaultValues, formFields]
  );

  const handleSubmit: SubmitHandler<ProcessorFormState> = async (data) => {
    const processingDefinition = convertFormStateToProcessing(data);

    onAddProcessor(processingDefinition, data.detected_fields);
    closePanel();
  };

  const confirmDiscardAndClose = useDiscardConfirm(closePanel);

  const buttonContent = isOpen ? (
    i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processorPanel.addingProcessor',
      { defaultMessage: 'Adding processor' }
    )
  ) : (
    <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
      <EuiIcon type="plus" />
      {i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.addProcessorAction',
        { defaultMessage: 'Add a processor' }
      )}
    </EuiFlexGroup>
  );

  return (
    <EuiPanel
      color={isOpen ? 'subdued' : undefined}
      hasBorder
      css={css`
        border: ${euiTheme.border.thin};
        padding: ${euiTheme.size.m};
      `}
    >
      <EuiAccordion
        id="add-processor-accordion"
        arrowProps={{
          css: { display: 'none' },
        }}
        buttonContent={buttonContent}
        buttonElement="div"
        forceState={isOpen ? 'open' : 'closed'}
        onToggle={openPanel}
        extraAction={
          isOpen ? (
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiButtonEmpty onClick={hasChanges ? confirmDiscardAndClose : closePanel} size="s">
                {i18n.translate(
                  'xpack.streams.streamDetailView.managementTab.enrichment.processorPanel.cancel',
                  { defaultMessage: 'Cancel' }
                )}
              </EuiButtonEmpty>
              <EuiButton
                size="s"
                onClick={methods.handleSubmit(handleSubmit)}
                disabled={!methods.formState.isValid && methods.formState.isSubmitted}
              >
                {i18n.translate(
                  'xpack.streams.streamDetailView.managementTab.enrichment.processorPanel.confirmAddProcessor',
                  { defaultMessage: 'Add processor' }
                )}
              </EuiButton>
            </EuiFlexGroup>
          ) : null
        }
      >
        <EuiSpacer size="s" />
        <FormProvider {...methods}>
          <EuiForm component="form" fullWidth onSubmit={methods.handleSubmit(handleSubmit)}>
            <ProcessorTypeSelector />
            <EuiSpacer size="m" />
            {formFields.type === 'grok' && <GrokProcessorForm />}
            {formFields.type === 'dissect' && <DissectProcessorForm />}
          </EuiForm>
        </FormProvider>
      </EuiAccordion>
    </EuiPanel>
  );
}

export function EditProcessorPanel({
  onDeleteProcessor,
  onUpdateProcessor,
  processor,
}: EditProcessorPanelProps) {
  const { euiTheme } = useEuiTheme();
  const [isOpen, { on: openPanel, off: closePanel }] = useBoolean();

  const processorType = 'grok' in processor.config ? 'grok' : 'dissect';
  const processorDescription = getProcessorDescription(processor);

  const defaultValues = useMemo(
    () => getDefaultFormState(processorType, processor),
    [processor, processorType]
  );

  const methods = useForm<ProcessorFormState>({ defaultValues, mode: 'onChange' });

  const formFields = methods.watch();

  const hasChanges = useMemo(
    () => !isEqual(defaultValues, formFields),
    [defaultValues, formFields]
  );

  const handleSubmit: SubmitHandler<ProcessorFormState> = (data) => {
    const processingDefinition = convertFormStateToProcessing(data);

    onUpdateProcessor(processor.id, { id: processor.id, ...processingDefinition });
    closePanel();
  };

  const handleProcessorDelete = () => {
    onDeleteProcessor(processor.id);
    closePanel();
  };

  const confirmDiscardAndClose = useDiscardConfirm(closePanel);
  const confirmDeletionAndClose = useDiscardConfirm(handleProcessorDelete, {
    title: deleteProcessorTitle,
    message: deleteProcessorMessage,
    confirmButtonText: deleteProcessorLabel,
    cancelButtonText: deleteProcessorCancelLabel,
  });

  const buttonContent = isOpen ? (
    <strong>{processorType.toUpperCase()}</strong>
  ) : (
    <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
      <EuiIcon type="grab" />
      <strong>{processorType.toUpperCase()}</strong>
      <EuiText component="span" size="s" color="subdued" className="eui-textTruncate">
        {processorDescription}
      </EuiText>
    </EuiFlexGroup>
  );

  return (
    <EuiPanel
      hasBorder
      css={css`
        padding: ${euiTheme.size.m};
      `}
    >
      <EuiAccordion
        id="edit-processor-accordion"
        arrowProps={{
          css: { display: 'none' },
        }}
        buttonContent={buttonContent}
        buttonContentClassName="eui-textTruncate"
        buttonElement="div"
        buttonProps={{
          /* Allow text ellipsis in flex child nodes */
          css: css`
            min-width: 0;
          `,
        }}
        forceState={isOpen ? 'open' : 'closed'}
        extraAction={
          isOpen ? (
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiButtonEmpty onClick={hasChanges ? confirmDiscardAndClose : closePanel} size="s">
                {i18n.translate(
                  'xpack.streams.streamDetailView.managementTab.enrichment.processorPanel.cancel',
                  { defaultMessage: 'Cancel' }
                )}
              </EuiButtonEmpty>
              <EuiButton
                size="s"
                onClick={methods.handleSubmit(handleSubmit)}
                disabled={!methods.formState.isValid}
              >
                {i18n.translate(
                  'xpack.streams.streamDetailView.managementTab.enrichment.processorPanel.confirmEditProcessor',
                  { defaultMessage: 'Update processor' }
                )}
              </EuiButton>
            </EuiFlexGroup>
          ) : (
            <EuiButtonIcon
              onClick={openPanel}
              iconType="pencil"
              color="text"
              size="xs"
              aria-label={i18n.translate(
                'xpack.streams.streamDetailView.managementTab.enrichment.editProcessorAction',
                { defaultMessage: 'Edit {type} processor', values: { type: processorType } }
              )}
            />
          )
        }
      >
        <EuiSpacer size="s" />
        <FormProvider {...methods}>
          <EuiForm component="form" fullWidth onSubmit={methods.handleSubmit(handleSubmit)}>
            <ProcessorTypeSelector disabled />
            <EuiSpacer size="m" />
            {formFields.type === 'grok' && <GrokProcessorForm />}
            {formFields.type === 'dissect' && <DissectProcessorForm />}
            <EuiHorizontalRule />
            <EuiButton color="danger" onClick={confirmDeletionAndClose}>
              {deleteProcessorLabel}
            </EuiButton>
          </EuiForm>
        </FormProvider>
      </EuiAccordion>
    </EuiPanel>
  );
}

const deleteProcessorLabel = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.enrichment.deleteProcessorLabel',
  { defaultMessage: 'Delete processor' }
);

const deleteProcessorCancelLabel = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.enrichment.deleteProcessorCancelLabel',
  { defaultMessage: 'Cancel' }
);

const deleteProcessorTitle = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.enrichment.deleteProcessorTitle',
  { defaultMessage: 'Are you sure you want to delete this processor?' }
);

const deleteProcessorMessage = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.enrichment.deleteProcessorMessage',
  { defaultMessage: 'Deleting this processor will permanently impact the field configuration.' }
);

const getProcessorDescription = (processor: EnrichmentUIProcessorDefinition) => {
  if (isGrokProcessor(processor.config)) {
    return processor.config.grok.patterns.join(' • ');
  } else if (isDissectProcessor(processor.config)) {
    return processor.config.dissect.pattern;
  }

  return '';
};
