/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import {
  DissectProcessingDefinition,
  GrokProcessingDefinition,
  ProcessingDefinition,
  ReadStreamDefinition,
  isCompleteCondition,
  isDissectProcessor,
  isGrokProcessor,
  isWiredReadStream,
} from '@kbn/streams-schema';
import { isEmpty } from 'lodash';
import { ProcessorFormState } from './types';

export const getFieldsMapFromDefinition = (definition: ReadStreamDefinition) => {
  if (isWiredReadStream(definition)) {
    return Object.entries({
      ...definition.stream.ingest.wired.fields,
      ...definition.inherited_fields,
    }).map(([name, { type }]) => ({ name, type }));
  }

  return [];
};

export const convertFormStateToProcessing = (
  formState: ProcessorFormState
): ProcessingDefinition => {
  if (formState.type === 'grok') {
    const { condition, field, patterns, pattern_definitions, ignore_failure } = formState;

    return {
      condition: isCompleteCondition(condition) ? condition : undefined,
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
    };
  }

  if (formState.type === 'dissect') {
    const { condition, field, pattern, append_separator, ignore_failure } = formState;

    return {
      condition: isCompleteCondition(condition) ? condition : undefined,
      config: {
        dissect: {
          field,
          pattern,
          append_separator,
          ignore_failure,
        },
      },
    };
  }

  throw new Error('Cannot convert form state to processing: unknown type.');
};

export const isCompleteGrokDefinition = (processing: GrokProcessingDefinition) => {
  const { patterns } = processing.grok;

  return !isEmpty(patterns);
};

export const isCompleteDissectDefinition = (processing: DissectProcessingDefinition) => {
  const { pattern } = processing.dissect;

  return !isEmpty(pattern);
};

export const isCompleteProcessingDefinition = (processing: ProcessingDefinition) => {
  if (isGrokProcessor(processing.config)) {
    return isCompleteGrokDefinition(processing.config);
  }
  if (isDissectProcessor(processing.config)) {
    return isCompleteDissectDefinition(processing.config);
  }

  return false;
};
