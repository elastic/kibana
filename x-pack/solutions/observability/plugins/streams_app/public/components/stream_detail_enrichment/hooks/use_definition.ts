/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { useAbortController } from '@kbn/observability-utils-browser/hooks/use_abort_controller';
import { useBoolean } from '@kbn/react-hooks';
import {
  ReadStreamDefinition,
  isWiredReadStream,
  FieldDefinition,
  WiredReadStreamDefinition,
  IngestUpsertRequest,
  ProcessorDefinition,
  getProcessorType,
} from '@kbn/streams-schema';
import { DetectedField, ProcessorDefinitionWithUIAttributes } from '../types';
import { useKibana } from '../../../hooks/use_kibana';
import { processorConverter } from '../utils';

export const useDefinition = (definition: ReadStreamDefinition, refreshDefinition: () => void) => {
  const { core, dependencies } = useKibana();

  const { toasts } = core.notifications;
  const { processing: existingProcessorDefinitions } = definition.stream.ingest;
  const { streamsRepositoryClient } = dependencies.start.streams;

  const abortController = useAbortController();
  const [isSavingChanges, { on: startsSaving, off: endsSaving }] = useBoolean();

  const [processors, setProcessors] = useState(() =>
    createProcessorsList(existingProcessorDefinitions)
  );

  const initialProcessors = useRef(processors);

  const [fields, setFields] = useState(() =>
    isWiredReadStream(definition) ? definition.stream.ingest.wired.fields : {}
  );

  const nextProcessorDefinitions = useMemo(
    () => processors.map(processorConverter.toAPIDefinition),
    [processors]
  );

  useEffect(() => {
    // Reset processors when definition refreshes
    const resetProcessors = createProcessorsList(definition.stream.ingest.processing);
    setProcessors(resetProcessors);
    initialProcessors.current = resetProcessors;
  }, [definition]);

  const hasChanges = useMemo(
    () =>
      processors.some((proc) => proc.status === 'draft' || proc.status === 'updated') ||
      hasOrderChanged(processors, initialProcessors.current),
    [processors]
  );

  const addProcessor = (newProcessor: ProcessorDefinition, newFields?: DetectedField[]) => {
    setProcessors((prevProcs) =>
      prevProcs.concat(processorConverter.toUIDefinition(newProcessor, { status: 'draft' }))
    );

    if (isWiredReadStream(definition) && newFields) {
      setFields((currentFields) => mergeFields(definition, currentFields, newFields));
    }
  };

  const updateProcessor = (id: string, processorUpdate: ProcessorDefinition) => {
    setProcessors((prevProcs) =>
      prevProcs.map((proc) =>
        proc.id === id
          ? {
              ...processorUpdate,
              id,
              type: getProcessorType(processorUpdate),
              status: 'updated',
            }
          : proc
      )
    );
  };

  const orderProcessors = (udpatedProcessors: ProcessorDefinitionWithUIAttributes[]) => {
    setProcessors(udpatedProcessors);
  };

  const deleteProcessor = (id: string) => {
    setProcessors((prevProcs) => prevProcs.filter((proc) => proc.id !== id));
  };

  const resetChanges = () => {
    const resetProcessors = createProcessorsList(existingProcessorDefinitions);
    setProcessors(resetProcessors);
    initialProcessors.current = resetProcessors;
    setFields(isWiredReadStream(definition) ? definition.stream.ingest.wired.fields : {});
  };

  const saveChanges = async () => {
    startsSaving();
    try {
      await streamsRepositoryClient.fetch(`PUT /api/streams/{id}/_ingest`, {
        signal: abortController.signal,
        params: {
          path: {
            id: definition.name,
          },
          body: {
            ingest: {
              ...definition.stream.ingest,
              processing: nextProcessorDefinitions,
              ...(isWiredReadStream(definition) && { wired: { fields } }),
            },
          } as IngestUpsertRequest,
        },
      });

      toasts.addSuccess(
        i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.saveChangesSuccess',
          { defaultMessage: "Stream's processors updated" }
        )
      );
    } catch (error) {
      toasts.addError(error, {
        title: i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.saveChangesError',
          { defaultMessage: "An issue occurred saving processors' changes." }
        ),
        toastMessage: error.body.message,
      });
    } finally {
      await refreshDefinition();
      endsSaving();
    }
  };

  return {
    // Values
    processors,
    // Actions
    addProcessor,
    updateProcessor,
    deleteProcessor,
    orderProcessors,
    resetChanges,
    saveChanges,
    setProcessors,
    // Flags
    hasChanges,
    isSavingChanges,
  };
};

const createProcessorsList = (processors: ProcessorDefinition[]) => {
  return processors.map((processor) => processorConverter.toUIDefinition(processor));
};

const hasOrderChanged = (
  processors: ProcessorDefinitionWithUIAttributes[],
  initialProcessors: ProcessorDefinitionWithUIAttributes[]
) => {
  return processors.some((processor, index) => processor.id !== initialProcessors[index].id);
};

const mergeFields = (
  definition: WiredReadStreamDefinition,
  currentFields: FieldDefinition,
  newFields: DetectedField[]
) => {
  return {
    ...definition.stream.ingest.wired.fields,
    ...newFields.reduce((acc, field) => {
      // Add only new fields and ignore unmapped ones
      if (
        !(field.name in currentFields) &&
        !(field.name in definition.inherited_fields) &&
        field.type !== 'unmapped'
      ) {
        acc[field.name] = { type: field.type };
      }
      return acc;
    }, {} as FieldDefinition),
  };
};
