/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useMemo, useEffect } from 'react';
import deepEqual from 'fast-deep-equal';
import { i18n } from '@kbn/i18n';
import { useAbortController } from '@kbn/observability-utils-browser/hooks/use_abort_controller';
import { useBoolean } from '@kbn/react-hooks';
import {
  ReadStreamDefinition,
  ProcessingDefinition,
  isWiredReadStream,
  FieldDefinition,
} from '@kbn/streams-schema';
import { htmlIdGenerator } from '@elastic/eui';
import { DetectedField, ProcessorDefinition } from '../types';
import { useKibana } from '../../../hooks/use_kibana';

export const useDefinition = (definition: ReadStreamDefinition, refreshDefinition: () => void) => {
  const { core, dependencies } = useKibana();

  const { toasts } = core.notifications;
  const { streamsRepositoryClient } = dependencies.start.streams;
  const { processing } = definition.stream.ingest;

  const abortController = useAbortController();
  const [isSavingChanges, { on: startsSaving, off: endsSaving }] = useBoolean();

  const [processors, setProcessors] = useState(() => createProcessorsList(processing));
  const [fields, setFields] = useState(() =>
    isWiredReadStream(definition) ? definition.stream.ingest.wired.fields : {}
  );

  const httpProcessing = useMemo(() => processors.map(removeIdFromProcessor), [processors]);

  useEffect(() => {
    setProcessors(createProcessorsList(definition.stream.ingest.processing));
  }, [definition]);

  const hasChanges = useMemo(
    () => !deepEqual(processing, httpProcessing),
    [processing, httpProcessing]
  );

  const addProcessor = (newProcessing: ProcessingDefinition, newFields?: DetectedField[]) => {
    setProcessors(processors.concat(createProcessorWithId(newProcessing)));

    if (isWiredReadStream(definition) && newFields) {
      setFields({
        ...definition.stream.ingest.wired.fields,
        ...newFields.reduce((acc, field) => {
          if (!(field.name in fields) && field.type !== 'unmapped') {
            acc[field.name] = { type: field.type };
          }
          return acc;
        }, {} as FieldDefinition),
      });
    }
  };

  const updateProcessor = (id: string, processorUpdate: ProcessorDefinition) => {
    const updatedProcessors = processors.map((processor) => {
      if (processor.id === id) {
        return processorUpdate;
      }

      return processor;
    });

    setProcessors(updatedProcessors);
  };

  const deleteProcessor = (id: string) => {
    const updatedProcessors = processors.filter((processor) => processor.id !== id);

    setProcessors(updatedProcessors);
  };

  const resetChanges = () => {
    setProcessors(createProcessorsList(processing));
  };

  const saveChanges = async () => {
    startsSaving();
    try {
      await streamsRepositoryClient.fetch(`PUT /api/streams/{id}`, {
        signal: abortController.signal,
        params: {
          path: {
            id: definition.name,
          },
          body: {
            ingest: {
              ...definition.stream.ingest,
              processing: httpProcessing,
              ...(isWiredReadStream(definition) && { wired: { fields } }),
            },
          },
        },
      });

      await refreshDefinition();

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
    resetChanges,
    saveChanges,
    setProcessors,
    // Flags
    hasChanges,
    isSavingChanges,
  };
};

const createId = htmlIdGenerator();
const createProcessorsList = (processors: ProcessingDefinition[]): ProcessorDefinition[] =>
  processors.map(createProcessorWithId);

const createProcessorWithId = (processor: ProcessingDefinition): ProcessorDefinition => ({
  ...processor,
  id: createId(),
});

const removeIdFromProcessor = (processor: ProcessorDefinition): ProcessingDefinition => {
  const { id, ...rest } = processor;
  return rest;
};
