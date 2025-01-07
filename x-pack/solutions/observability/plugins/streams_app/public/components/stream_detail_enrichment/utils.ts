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
  isCompleteCondition,
  isDissectProcessor,
  isGrokProcessor,
} from '@kbn/streams-schema';
import { isEmpty } from 'lodash';
import { GrokFormState, ProcessorDefinition, ProcessorFormState } from './types';

const defaultCondition: ProcessingDefinition['condition'] = {
  field: '',
  operator: 'eq',
  value: '',
};

const defaultProcessorConfig: GrokFormState = {
  type: 'grok',
  field: 'message',
  patterns: [{ value: '' }],
  pattern_definitions: {},
  ignore_failure: false,
  condition: defaultCondition,
};

export const getDefaultFormState = (processor?: ProcessorDefinition): ProcessorFormState => {
  if (!processor) return defaultProcessorConfig;

  let configValues: ProcessorFormState = defaultProcessorConfig;

  if (isGrokProcessor(processor.config)) {
    const { grok } = processor.config;

    configValues = structuredClone({
      ...grok,
      type: 'grok',
      patterns: grok.patterns.map((pattern) => ({ value: pattern })),
    });
  }

  if (isDissectProcessor(processor.config)) {
    const { dissect } = processor.config;

    configValues = structuredClone({
      ...dissect,
      type: 'dissect',
    });
  }

  return {
    condition: processor.condition || defaultCondition,
    ...configValues,
  };
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
