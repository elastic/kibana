/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { useAbortController } from '@kbn/observability-utils-browser/hooks/use_abort_controller';
import { useBoolean } from '@kbn/react-hooks';
import {
  IngestStreamGetResponse,
  isWiredStreamGetResponse,
  FieldDefinition,
  WiredStreamGetResponse,
  IngestUpsertRequest,
  ProcessorDefinition,
  getProcessorType,
} from '@kbn/streams-schema';
import { DetectedField, ProcessorDefinitionWithUIAttributes } from '../types';
import { useKibana } from '../../../hooks/use_kibana';
import { processorConverter } from '../utils';

export interface UseDefinitionReturn {
  processors: ProcessorDefinitionWithUIAttributes[];
  hasChanges: boolean;
  isSavingChanges: boolean;
  addProcessor: (newProcessor: ProcessorDefinition, newFields?: DetectedField[]) => void;
  updateProcessor: (
    id: string,
    processor: ProcessorDefinition,
    status?: ProcessorDefinitionWithUIAttributes['status']
  ) => void;
  deleteProcessor: (id: string) => void;
  reorderProcessors: (processors: ProcessorDefinitionWithUIAttributes[]) => void;
  saveChanges: () => Promise<void>;
  setProcessors: (processors: ProcessorDefinitionWithUIAttributes[]) => void;
  resetChanges: () => void;
}

export const useDefinition = (
  definition: IngestStreamGetResponse,
  refreshDefinition: () => void
): UseDefinitionReturn => {
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
    isWiredStreamGetResponse(definition) ? definition.stream.ingest.wired.fields : {}
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
      processors.length !== initialProcessors.current.length || // Processor count changed, a processor might be deleted
      processors.some((proc) => proc.status === 'draft' || proc.status === 'updated') || // New or updated processors
      hasOrderChanged(processors, initialProcessors.current), // Processor order changed
    [processors]
  );

  const addProcessor = useCallback(
    (newProcessor: ProcessorDefinition, newFields?: DetectedField[]) => {
      setProcessors((prevProcs) =>
        prevProcs.concat(processorConverter.toUIDefinition(newProcessor, { status: 'draft' }))
      );

      if (isWiredStreamGetResponse(definition) && newFields) {
        setFields((currentFields) => mergeFields(definition, currentFields, newFields));
      }
    },
    [definition]
  );

  const updateProcessor = useCallback(
    (
      id: string,
      processorUpdate: ProcessorDefinition,
      status: ProcessorDefinitionWithUIAttributes['status'] = 'updated'
    ) => {
      setProcessors((prevProcs) =>
        prevProcs.map((proc) =>
          proc.id === id
            ? {
                ...processorUpdate,
                id,
                type: getProcessorType(processorUpdate),
                status,
              }
            : proc
        )
      );
    },
    []
  );

  const reorderProcessors = setProcessors;

  const deleteProcessor = useCallback((id: string) => {
    setProcessors((prevProcs) => prevProcs.filter((proc) => proc.id !== id));
  }, []);

  const resetChanges = () => {
    const resetProcessors = createProcessorsList(existingProcessorDefinitions);
    setProcessors(resetProcessors);
    initialProcessors.current = resetProcessors;
    setFields(isWiredStreamGetResponse(definition) ? definition.stream.ingest.wired.fields : {});
  };

  const saveChanges = async () => {
    startsSaving();
    try {
      await streamsRepositoryClient.fetch(`PUT /api/streams/{name}/_ingest`, {
        signal: abortController.signal,
        params: {
          path: {
            name: definition.stream.name,
          },
          body: {
            ingest: {
              ...definition.stream.ingest,
              processing: nextProcessorDefinitions,
              ...(isWiredStreamGetResponse(definition) && { wired: { fields } }),
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

      refreshDefinition();
    } catch (error) {
      toasts.addError(new Error(error.body.message), {
        title: i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.saveChangesError',
          { defaultMessage: "An issue occurred saving processors' changes." }
        ),
        toastMessage: error.body.message,
      });
    } finally {
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
    reorderProcessors,
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
  definition: WiredStreamGetResponse,
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
