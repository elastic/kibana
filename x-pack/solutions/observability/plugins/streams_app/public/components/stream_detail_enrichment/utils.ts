/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import {
  ProcessorDefinition,
  ProcessorType,
  isDissectProcessorDefinition,
  isGrokProcessorDefinition,
} from '@kbn/streams-schema';
import {
  DissectFormState,
  ProcessorDefinitionWithId,
  GrokFormState,
  ProcessorFormState,
} from './types';
import { EMPTY_EQUALS_CONDITION } from '../../util/condition';

const defaultGrokProcessorFormState: GrokFormState = {
  type: 'grok',
  field: 'message',
  patterns: [{ value: '' }],
  pattern_definitions: {},
  ignore_failure: true,
  ignore_missing: true,
  if: EMPTY_EQUALS_CONDITION,
};

const defaultDissectProcessorFormState: DissectFormState = {
  type: 'dissect',
  field: 'message',
  pattern: '',
  ignore_failure: true,
  ignore_missing: true,
  if: EMPTY_EQUALS_CONDITION,
};

const defaultProcessorFormStateByType: Record<ProcessorType, ProcessorFormState> = {
  dissect: defaultDissectProcessorFormState,
  grok: defaultGrokProcessorFormState,
};

export const getDefaultFormState = (
  type: ProcessorType,
  processor?: ProcessorDefinitionWithId
): ProcessorFormState => {
  if (!processor) return defaultProcessorFormStateByType[type];

  if (isGrokProcessorDefinition(processor)) {
    const { grok } = processor;

    return structuredClone({
      ...grok,
      type: 'grok',
      patterns: grok.patterns.map((pattern) => ({ value: pattern })),
    });
  }

  if (isDissectProcessorDefinition(processor)) {
    const { dissect } = processor;

    return structuredClone({
      ...dissect,
      type: 'dissect',
    });
  }

  throw new Error(`Default state not found for unsupported processor type: ${type}`);
};

export const convertFormStateToProcessor = (formState: ProcessorFormState): ProcessorDefinition => {
  if (formState.type === 'grok') {
    const { patterns, field, pattern_definitions, ignore_failure, ignore_missing } = formState;

    return {
      grok: {
        if: formState.if,
        patterns: patterns.filter(({ value }) => value.trim().length > 0).map(({ value }) => value),
        field,
        pattern_definitions,
        ignore_failure,
        ignore_missing,
      },
    };
  }

  if (formState.type === 'dissect') {
    const { field, pattern, append_separator, ignore_failure, ignore_missing } = formState;

    return {
      dissect: {
        if: formState.if,
        field,
        pattern,
        append_separator,
        ignore_failure,
        ignore_missing,
      },
    };
  }

  throw new Error('Cannot convert form state to processing: unknown type.');
};
