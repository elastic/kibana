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
  EuiIcon,
  EuiText,
  EuiBadge,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ProcessorType, IngestStreamGetResponse } from '@kbn/streams-schema';
import { isEqual } from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';
import { useForm, SubmitHandler, FormProvider, useWatch } from 'react-hook-form';
import { css } from '@emotion/react';
import { useBoolean } from '@kbn/react-hooks';
import { DissectProcessorForm } from './dissect';
import { GrokProcessorForm } from './grok';
import { ProcessorTypeSelector } from './processor_type_selector';
import { ProcessorFormState, ProcessorDefinitionWithUIAttributes } from '../types';
import {
  getDefaultFormState,
  convertFormStateToProcessor,
  isGrokProcessor,
  isDissectProcessor,
} from '../utils';
import { useDiscardConfirm } from '../../../hooks/use_discard_confirm';
import { UseDefinitionReturn } from '../hooks/use_definition';
import { UseProcessingSimulatorReturn } from '../hooks/use_processing_simulator';

export interface ProcessorPanelProps {
  definition: IngestStreamGetResponse;
  onWatchProcessor: UseProcessingSimulatorReturn['watchProcessor'];
}

export interface AddProcessorPanelProps extends ProcessorPanelProps {
  isInitiallyOpen?: boolean;
  onAddProcessor: UseDefinitionReturn['addProcessor'];
}

export interface EditProcessorPanelProps extends ProcessorPanelProps {
  processor: ProcessorDefinitionWithUIAttributes;
  onDeleteProcessor: UseDefinitionReturn['deleteProcessor'];
  onUpdateProcessor: UseDefinitionReturn['updateProcessor'];
}

export function AddProcessorPanel({ onAddProcessor, onWatchProcessor }: AddProcessorPanelProps) {
  const { euiTheme } = useEuiTheme();

  const [hasChanges, setHasChanges] = useState(false);
  const [isOpen, { on: openPanel, off: closePanel }] = useBoolean(false);

  const defaultValues = useMemo(() => getDefaultFormState('grok'), []);

  const methods = useForm<ProcessorFormState>({ defaultValues, mode: 'onChange' });

  const type = useWatch({ control: methods.control, name: 'type' });

  useEffect(() => {
    if (isOpen) {
      const { unsubscribe } = methods.watch((value) => {
        const draftProcessor = createDraftProcessorFromForm(value as ProcessorFormState);
        onWatchProcessor(draftProcessor);
        setHasChanges(!isEqual(defaultValues, value));
      });
      return () => unsubscribe();
    }
  }, [defaultValues, isOpen, methods, onWatchProcessor]);

  const handleSubmit: SubmitHandler<ProcessorFormState> = async (data) => {
    const processingDefinition = convertFormStateToProcessor(data);

    onWatchProcessor({ id: 'draft', deleteIfExists: true });
    onAddProcessor(processingDefinition, data.detected_fields);
    closePanel();
  };

  const handleCancel = () => {
    methods.reset();
    onWatchProcessor({ id: 'draft', deleteIfExists: true });
    closePanel();
  };

  const handleOpen = () => {
    const draftProcessor = createDraftProcessorFromForm(defaultValues);
    onWatchProcessor(draftProcessor);
    openPanel();
  };

  const confirmDiscardAndClose = useDiscardConfirm(handleCancel);

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
        onToggle={handleOpen}
        extraAction={
          isOpen ? (
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiButtonEmpty
                data-test-subj="streamsAppAddProcessorPanelCancelButton"
                onClick={hasChanges ? confirmDiscardAndClose : handleCancel}
                size="s"
              >
                {i18n.translate(
                  'xpack.streams.streamDetailView.managementTab.enrichment.processorPanel.cancel',
                  { defaultMessage: 'Cancel' }
                )}
              </EuiButtonEmpty>
              <EuiButton
                data-test-subj="streamsAppAddProcessorPanelAddProcessorButton"
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
            {type === 'grok' && <GrokProcessorForm />}
            {type === 'dissect' && <DissectProcessorForm />}
          </EuiForm>
        </FormProvider>
      </EuiAccordion>
    </EuiPanel>
  );
}

const createDraftProcessorFromForm = (
  formState: ProcessorFormState
): ProcessorDefinitionWithUIAttributes => {
  const processingDefinition = convertFormStateToProcessor(formState);

  return {
    id: 'draft',
    status: 'draft',
    type: formState.type,
    ...processingDefinition,
  };
};

export function EditProcessorPanel({
  onDeleteProcessor,
  onUpdateProcessor,
  onWatchProcessor,
  processor,
}: EditProcessorPanelProps) {
  const { euiTheme } = useEuiTheme();

  const [hasChanges, setHasChanges] = useState(false);
  const [isOpen, { on: openPanel, off: closePanel }] = useBoolean();

  const processorDescription = getProcessorDescription(processor);

  const isDraft = processor.status === 'draft';
  const isUnsaved = isDraft || processor.status === 'updated';

  const defaultValues = useMemo(() => getDefaultFormState(processor.type, processor), [processor]);

  const methods = useForm<ProcessorFormState>({ defaultValues, mode: 'onChange' });

  const type = useWatch({ control: methods.control, name: 'type' });

  useEffect(() => {
    const { unsubscribe } = methods.watch((value) => {
      const processingDefinition = convertFormStateToProcessor(value as ProcessorFormState);
      onWatchProcessor({
        id: processor.id,
        status: processor.status,
        type: value.type as ProcessorType,
        ...processingDefinition,
      });
      setHasChanges(!isEqual(defaultValues, value));
    });
    return () => unsubscribe();
  }, [defaultValues, methods, onWatchProcessor, processor.id, processor.status]);

  const handleSubmit: SubmitHandler<ProcessorFormState> = (data) => {
    const processorDefinition = convertFormStateToProcessor(data);

    onUpdateProcessor(processor.id, processorDefinition, isDraft ? 'draft' : 'updated');
    closePanel();
  };

  const handleProcessorDelete = () => {
    onDeleteProcessor(processor.id);
    closePanel();
  };

  const handleCancel = () => {
    methods.reset();
    closePanel();
  };

  const confirmDiscardAndClose = useDiscardConfirm(handleCancel);
  const confirmDeletionAndClose = useDiscardConfirm(handleProcessorDelete, {
    title: deleteProcessorTitle,
    message: deleteProcessorMessage,
    confirmButtonText: deleteProcessorLabel,
    cancelButtonText: deleteProcessorCancelLabel,
  });

  const buttonContent = isOpen ? (
    <strong>{processor.type.toUpperCase()}</strong>
  ) : (
    <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
      <EuiIcon type="grab" />
      <strong>{processor.type.toUpperCase()}</strong>
      <EuiText component="span" size="s" color="subdued" className="eui-textTruncate">
        {processorDescription}
      </EuiText>
    </EuiFlexGroup>
  );

  return (
    <EuiPanel
      hasBorder
      color={isDraft ? 'subdued' : undefined}
      css={css`
        border: ${euiTheme.border.thin};
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
            &:is(:hover, :focus) {
              cursor: grab;
              text-decoration: none;
            }
          `,
        }}
        forceState={isOpen ? 'open' : 'closed'}
        extraAction={
          isOpen ? (
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiButtonEmpty
                data-test-subj="streamsAppEditProcessorPanelCancelButton"
                onClick={hasChanges ? confirmDiscardAndClose : handleCancel}
                size="s"
              >
                {i18n.translate(
                  'xpack.streams.streamDetailView.managementTab.enrichment.processorPanel.cancel',
                  { defaultMessage: 'Cancel' }
                )}
              </EuiButtonEmpty>
              <EuiButton
                data-test-subj="streamsAppEditProcessorPanelUpdateProcessorButton"
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
            <EuiFlexGroup alignItems="center" gutterSize="s">
              {isUnsaved && (
                <EuiBadge>
                  {i18n.translate(
                    'xpack.streams.streamDetailView.managementTab.enrichment.processorPanel.unsavedBadge',
                    { defaultMessage: 'Unsaved' }
                  )}
                </EuiBadge>
              )}
              <EuiButtonIcon
                data-test-subj="streamsAppEditProcessorPanelButton"
                onClick={openPanel}
                iconType="pencil"
                color="text"
                size="xs"
                aria-label={i18n.translate(
                  'xpack.streams.streamDetailView.managementTab.enrichment.editProcessorAction',
                  { defaultMessage: 'Edit {type} processor', values: { type: processor.type } }
                )}
              />
            </EuiFlexGroup>
          )
        }
      >
        <EuiSpacer size="s" />
        <FormProvider {...methods}>
          <EuiForm component="form" fullWidth onSubmit={methods.handleSubmit(handleSubmit)}>
            <ProcessorTypeSelector disabled />
            <EuiSpacer size="m" />
            {type === 'grok' && <GrokProcessorForm />}
            {type === 'dissect' && <DissectProcessorForm />}
            <EuiHorizontalRule margin="m" />
            <EuiButton
              data-test-subj="streamsAppEditProcessorPanelButton"
              color="danger"
              onClick={confirmDeletionAndClose}
            >
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

const getProcessorDescription = (processor: ProcessorDefinitionWithUIAttributes) => {
  if (isGrokProcessor(processor)) {
    return processor.grok.patterns.join(' • ');
  } else if (isDissectProcessor(processor)) {
    return processor.dissect.pattern;
  }

  return '';
};
