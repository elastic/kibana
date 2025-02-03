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
  isWiredReadStream,
  FieldDefinition,
  WiredReadStreamDefinition,
  ProcessorDefinition,
  getProcessorConfig,
  IngestUpsertRequest,
} from '@kbn/streams-schema';
import { htmlIdGenerator } from '@elastic/eui';
import { isEqual, omit } from 'lodash';
import { DetectedField, EnrichmentUIProcessorDefinition, ProcessingDefinition } from '../types';
import { useKibana } from '../../../hooks/use_kibana';
import { alwaysToEmptyEquals, emptyEqualsToAlways } from '../../../util/condition';

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
  const [fields, setFields] = useState(() =>
    isWiredReadStream(definition) ? definition.stream.ingest.wired.fields : {}
  );

  const nextProcessorDefinitions = useMemo(
    () => processors.map(convertUiDefinitionIntoApiDefinition),
    [processors]
  );

  useEffect(() => {
    // Reset processors when definition refreshes
    setProcessors(createProcessorsList(definition.stream.ingest.processing));
  }, [definition]);

  const hasChanges = useMemo(
    () => !isEqual(existingProcessorDefinitions, nextProcessorDefinitions),
    [existingProcessorDefinitions, nextProcessorDefinitions]
  );

  const addProcessor = (newProcessing: ProcessingDefinition, newFields?: DetectedField[]) => {
    setProcessors((prevProcs) => prevProcs.concat({ ...newProcessing, id: createId() }));

    if (isWiredReadStream(definition) && newFields) {
      setFields((currentFields) => mergeFields(definition, currentFields, newFields));
    }
  };

  const updateProcessor = (id: string, processorUpdate: EnrichmentUIProcessorDefinition) => {
    setProcessors((prevProcs) =>
      prevProcs.map((proc) => (proc.id === id ? processorUpdate : proc))
    );
  };

  const deleteProcessor = (id: string) => {
    setProcessors((prevProcs) => prevProcs.filter((proc) => proc.id !== id));
  };

  const resetChanges = () => {
    setProcessors(createProcessorsList(existingProcessorDefinitions));
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
    resetChanges,
    saveChanges,
    setProcessors,
    // Flags
    hasChanges,
    isSavingChanges,
  };
};

const createId = htmlIdGenerator();
const createProcessorsList = (
  processors: ProcessorDefinition[]
): EnrichmentUIProcessorDefinition[] => processors.map(createProcessorWithId);

const createProcessorWithId = (
  processor: ProcessorDefinition
): EnrichmentUIProcessorDefinition => ({
  condition: alwaysToEmptyEquals(getProcessorConfig(processor).if),
  config: {
    ...('grok' in processor
      ? { grok: omit(processor.grok, 'if') }
      : { dissect: omit(processor.dissect, 'if') }),
  },
  id: createId(),
});

const convertUiDefinitionIntoApiDefinition = (
  processor: EnrichmentUIProcessorDefinition
): ProcessorDefinition => {
  const { id: _id, config, condition } = processor;

  if ('grok' in config) {
    return {
      grok: {
        ...config.grok,
        if: emptyEqualsToAlways(condition),
      },
    };
  }
  return {
    dissect: {
      ...config.dissect,
      if: emptyEqualsToAlways(condition),
    },
  };
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
