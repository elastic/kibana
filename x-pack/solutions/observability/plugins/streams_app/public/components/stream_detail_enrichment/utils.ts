/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import { ProcessorType, conditionSchema, createIsNarrowSchema } from '@kbn/streams-schema';
import { isEmpty } from 'lodash';
import { z } from '@kbn/zod';
import {
  DissectFormState,
  DissectProcessingDefinition,
  EnrichmentUIProcessorDefinition,
  GrokFormState,
  GrokProcessingDefinition,
  ProcessingDefinition,
  ProcessorFormState,
  isDissectProcessor,
  isGrokProcessor,
} from './types';
import { EMPTY_EQUALS_CONDITION } from '../../util/condition';

const defaultGrokProcessorFormState: GrokFormState = {
  type: 'grok',
  field: 'message',
  patterns: [{ value: '' }],
  pattern_definitions: {},
  ignore_failure: true,
  ignore_missing: true,
  condition: EMPTY_EQUALS_CONDITION,
};

const defaultDissectProcessorFormState: DissectFormState = {
  type: 'dissect',
  field: 'message',
  pattern: '',
  ignore_failure: true,
  ignore_missing: true,
  condition: EMPTY_EQUALS_CONDITION,
};

const defaultProcessorFormStateByType: Record<ProcessorType, ProcessorFormState> = {
  dissect: defaultDissectProcessorFormState,
  grok: defaultGrokProcessorFormState,
};

export const getDefaultFormState = (
  type: ProcessorType,
  processor?: EnrichmentUIProcessorDefinition
): ProcessorFormState => {
  if (!processor) return defaultProcessorFormStateByType[type];

  if (isGrokProcessor(processor.config)) {
    const { grok } = processor.config;

    return structuredClone({
      ...grok,
      condition: processor.condition,
      type: 'grok',
      patterns: grok.patterns.map((pattern) => ({ value: pattern })),
    });
  }

  const { dissect } = processor.config;

  return structuredClone({
    ...dissect,
    condition: processor.condition,
    type: 'dissect',
  });
};

export const convertFormStateToProcessing = (
  formState: ProcessorFormState
): ProcessingDefinition => {
  if (formState.type === 'grok') {
    const { condition, patterns, field, pattern_definitions, ignore_failure, ignore_missing } =
      formState;

    return {
      condition,
      config: {
        grok: {
          patterns: patterns
            .filter(({ value }) => value.trim().length > 0)
            .map(({ value }) => value),
          field,
          pattern_definitions,
          ignore_failure,
          ignore_missing,
        },
      },
    };
  }

  if (formState.type === 'dissect') {
    const { condition, field, pattern, append_separator, ignore_failure, ignore_missing } =
      formState;

    return {
      condition,
      config: {
        dissect: {
          field,
          pattern,
          append_separator,
          ignore_failure,
          ignore_missing,
        },
      },
    };
  }

  throw new Error('Cannot convert form state to processing: unknown type.');
};

export const isCompleteCondition = createIsNarrowSchema(z.unknown(), conditionSchema);

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
