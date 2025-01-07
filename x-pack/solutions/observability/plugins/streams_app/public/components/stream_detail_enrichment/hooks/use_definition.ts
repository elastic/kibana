/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useMemo, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { useAbortController } from '@kbn/observability-utils-browser/hooks/use_abort_controller';
import { useBoolean } from '@kbn/react-hooks';
import {
  ReadStreamDefinition,
  ProcessingDefinition,
  isWiredReadStream,
  FieldDefinition,
  WiredReadStreamDefinition,
} from '@kbn/streams-schema';
import { htmlIdGenerator } from '@elastic/eui';
import { isEqual } from 'lodash';
import { DetectedField, ProcessorDefinition } from '../types';
import { useKibana } from '../../../hooks/use_kibana';

export const useDefinition = (definition: ReadStreamDefinition, refreshDefinition: () => void) => {
  const { core, dependencies } = useKibana();

  const { toasts } = core.notifications;
  const { processing } = definition.stream.ingest;
  const { streamsRepositoryClient } = dependencies.start.streams;

  const abortController = useAbortController();
  const [isSavingChanges, { on: startsSaving, off: endsSaving }] = useBoolean();

  const [processors, setProcessors] = useState(() => createProcessorsList(processing));
  const [fields, setFields] = useState(() =>
    isWiredReadStream(definition) ? definition.stream.ingest.wired.fields : {}
  );

  const httpProcessing = useMemo(() => processors.map(removeIdFromProcessor), [processors]);

  useEffect(() => {
    // Reset processors when definition refreshes
    setProcessors(createProcessorsList(definition.stream.ingest.processing));
  }, [definition]);

  const hasChanges = useMemo(
    () => !isEqual(processing, httpProcessing),
    [processing, httpProcessing]
  );

  const addProcessor = (newProcessing: ProcessingDefinition, newFields?: DetectedField[]) => {
    setProcessors((prevProcs) => prevProcs.concat(createProcessorWithId(newProcessing)));

    if (isWiredReadStream(definition) && newFields) {
      setFields((currentFields) => mergeFields(definition, currentFields, newFields));
    }
  };

  const updateProcessor = (id: string, processorUpdate: ProcessorDefinition) => {
    setProcessors((prevProcs) =>
      prevProcs.map((proc) => (proc.id === id ? processorUpdate : proc))
    );
  };

  const deleteProcessor = (id: string) => {
    setProcessors((prevProcs) => prevProcs.filter((proc) => proc.id !== id));
  };

  const resetChanges = () => {
    setProcessors(createProcessorsList(processing));
    setFields(isWiredReadStream(definition) ? definition.stream.ingest.wired.fields : {});
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
