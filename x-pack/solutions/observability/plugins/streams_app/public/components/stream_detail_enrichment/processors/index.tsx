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
import { useSelector } from '@xstate5/react';
import { i18n } from '@kbn/i18n';
import { IngestStreamGetResponse } from '@kbn/streams-schema';
import { isEmpty, isEqual } from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';
import { useForm, SubmitHandler, FormProvider, useWatch } from 'react-hook-form';
import { css } from '@emotion/react';
import { useBoolean } from '@kbn/react-hooks';
import { DissectProcessorForm } from './dissect';
import { GrokProcessorForm } from './grok';
import { ProcessorTypeSelector } from './processor_type_selector';
import { ProcessorFormState, ProcessorDefinitionWithUIAttributes } from '../types';
import {
  getFormStateFrom,
  convertFormStateToProcessor,
  isGrokProcessor,
  isDissectProcessor,
  processorConverter,
  getDefaultFormStateByType,
} from '../utils';
import { useDiscardConfirm } from '../../../hooks/use_discard_confirm';
import {
  useStreamEnrichmentEvents,
  useStreamsEnrichmentSelector,
} from '../services/stream_enrichment_service';
import { ProcessorMetrics } from '../hooks/use_processing_simulator';
import { ProcessorErrors, ProcessorMetricBadges } from './processor_metrics';
import { StreamEnrichmentContext } from '../services/stream_enrichment_service/types';

export interface ProcessorPanelProps {
  definition: IngestStreamGetResponse;
  processorMetrics?: ProcessorMetrics;
}

export type AddProcessorPanelProps = ProcessorPanelProps;

export interface EditProcessorPanelProps extends ProcessorPanelProps {
  processor: StreamEnrichmentContext['processors'][number];
}

export function AddProcessorPanel({ processorMetrics }: AddProcessorPanelProps) {
  const { euiTheme } = useEuiTheme();

  const { addProcessor } = useStreamEnrichmentEvents();

  const processorActor = useStreamsEnrichmentSelector(
    (state) => state.context.processors.find((p) => p.getSnapshot().matches('draft'))!
  );

  const [isOpen, { on: openPanel, off: closePanel }] = useBoolean(false);

  const defaultValues = useMemo(() => getDefaultFormStateByType('grok'), []);

  const methods = useForm<ProcessorFormState>({ defaultValues, mode: 'onChange' });

  const type = useWatch({ control: methods.control, name: 'type' });

  useEffect(() => {
    if (isOpen) {
      const { unsubscribe } = methods.watch((value) => {
        const processor = convertFormStateToProcessor(value as ProcessorFormState);
        processorActor.send({ type: 'processor.change', processor });
      });

      return () => unsubscribe();
    }
  }, [isOpen, methods, processorActor]);

  useEffect(() => {
    console.log(processorActor);

    if (processorActor) {
      const subscription = processorActor.on('processor.changesDiscarded', () => {
        console.log('discardeeeed');
        methods.reset();
        closePanel();
      });

      return () => subscription.unsubscribe();
    }
  }, [closePanel, methods, processorActor]);

  const handleSubmit: SubmitHandler<ProcessorFormState> = async () => {
    closePanel();
    processorActor.send({ type: 'processor.stage' });
  };

  const handleCancel = () => {
    processorActor.send({ type: 'processor.cancel' });
  };

  const handleOpen = () => {
    const draftProcessor = createDraftProcessorFromForm(defaultValues);
    addProcessor({ processor: draftProcessor });
    openPanel();
  };

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
                onClick={handleCancel}
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
                fill
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
          <ProcessorMetricsHeader metrics={processorMetrics} />
          <EuiForm component="form" fullWidth onSubmit={methods.handleSubmit(handleSubmit)}>
            <ProcessorTypeSelector />
            <EuiSpacer size="m" />
            {type === 'grok' && <GrokProcessorForm />}
            {type === 'dissect' && <DissectProcessorForm />}
          </EuiForm>
          {processorMetrics && !isEmpty(processorMetrics.errors) && (
            <ProcessorErrors metrics={processorMetrics} />
          )}
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
    type: formState.type,
    ...processingDefinition,
  };
};

export function EditProcessorPanel({
  processor: processorActor,
  processorMetrics,
}: EditProcessorPanelProps) {
  const { euiTheme } = useEuiTheme();
  const state = useSelector(processorActor, (s) => s);
  const processor = state.context.processor;

  const processorDescription = getProcessorDescription(processor);

  const isOpen = state.matches({ staged: 'edit' }) || state.matches({ persisted: 'edit' });
  const isStaged = state.matches('staged');
  const isUnsaved = isStaged || state.matches({ persisted: 'updated' });

  const defaultValues = useMemo(() => getFormStateFrom(processor), [processor]);

  const methods = useForm<ProcessorFormState>({
    defaultValues,
    mode: 'onChange',
  });

  const type = useWatch({ control: methods.control, name: 'type' });

  useEffect(() => {
    const { unsubscribe } = methods.watch((value) => {
      const processingDefinition = convertFormStateToProcessor(value as ProcessorFormState);
      processorActor.send({
        type: 'processor.change',
        processor: processingDefinition,
      });
    });
    return () => unsubscribe();
  }, [methods, processorActor]);

  useEffect(() => {
    const subscription = processorActor.on('processor.changesDiscarded', () => {
      methods.reset();
    });

    return () => subscription.unsubscribe();
  }, [methods, processorActor]);

  const handleSubmit: SubmitHandler<ProcessorFormState> = () => {
    processorActor.send({ type: 'processor.update' });
  };

  const handleProcessorDelete = () => {
    processorActor.send({ type: 'processor.delete' });
  };

  const handleCancel = () => {
    processorActor.send({ type: 'processor.cancel' });
  };

  const handleOpen = () => {
    processorActor.send({ type: 'processor.edit' });
  };

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
      color={isStaged ? 'subdued' : undefined}
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
                onClick={handleCancel}
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
                fill
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
            <EuiFlexGroup alignItems="center" gutterSize="xs">
              {processorMetrics && <ProcessorMetricBadges {...processorMetrics} />}
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
                onClick={handleOpen}
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
          <ProcessorMetricsHeader metrics={processorMetrics} />
          <EuiForm component="form" fullWidth onSubmit={methods.handleSubmit(handleSubmit)}>
            <ProcessorTypeSelector disabled />
            <EuiSpacer size="m" />
            {type === 'grok' && <GrokProcessorForm />}
            {type === 'dissect' && <DissectProcessorForm />}
          </EuiForm>
          <EuiHorizontalRule margin="m" />
          <EuiButton
            data-test-subj="streamsAppEditProcessorPanelButton"
            color="danger"
            onClick={handleProcessorDelete}
          >
            {deleteProcessorLabel}
          </EuiButton>
          {processorMetrics && !isEmpty(processorMetrics.errors) && (
            <ProcessorErrors metrics={processorMetrics} />
          )}
        </FormProvider>
      </EuiAccordion>
    </EuiPanel>
  );
}

const ProcessorMetricsHeader = ({ metrics }: { metrics?: ProcessorMetrics }) => {
  if (!metrics) return null;

  return (
    <>
      <ProcessorMetricBadges {...metrics} />
      <EuiSpacer size="m" />
    </>
  );
};

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
