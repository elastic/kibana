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
  ProcessorType,
  isCompleteCondition,
  isDissectProcessor,
  isGrokProcessor,
} from '@kbn/streams-schema';
import { isEmpty } from 'lodash';
import { DissectFormState, GrokFormState, ProcessorDefinition, ProcessorFormState } from './types';

const defaultCondition: ProcessingDefinition['condition'] = {
  field: '',
  operator: 'eq',
  value: '',
};

const defaultGrokProcessorFormState: GrokFormState = {
  type: 'grok',
  field: 'message',
  patterns: [{ value: '' }],
  pattern_definitions: {},
  ignore_failure: true,
  ignore_missing: true,
  condition: defaultCondition,
};

const defaultDissectProcessorFormState: DissectFormState = {
  type: 'dissect',
  field: 'message',
  pattern: '',
  ignore_failure: true,
  ignore_missing: true,
  condition: defaultCondition,
};

const defaultProcessorFormStateByType: Record<ProcessorType, ProcessorFormState> = {
  dissect: defaultDissectProcessorFormState,
  grok: defaultGrokProcessorFormState,
};

export const getDefaultFormState = (
  type: ProcessorType,
  processor?: ProcessorDefinition
): ProcessorFormState => {
  if (!processor) return defaultProcessorFormStateByType[type];

  let configValues: ProcessorFormState = defaultProcessorFormStateByType[type];

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
    const { condition, patterns, field, pattern_definitions, ignore_failure, ignore_missing } =
      formState;

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
          ignore_missing,
        },
      },
    };
  }

  if (formState.type === 'dissect') {
    const { condition, field, pattern, append_separator, ignore_failure, ignore_missing } =
      formState;

    return {
      condition: isCompleteCondition(condition) ? condition : undefined,
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
