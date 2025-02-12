/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DissectProcessorConfig,
  FieldDefinitionType,
  GrokProcessorConfig,
  ProcessorDefinition,
  ProcessorTypeOf,
} from '@kbn/streams-schema';

export type WithUIAttributes<T extends ProcessorDefinition> = T & {
  id: string;
  type: ProcessorTypeOf<T>;
  status: 'draft' | 'saved' | 'updated';
};

export type ProcessorDefinitionWithUIAttributes = WithUIAttributes<ProcessorDefinition>;

export interface DetectedField {
  name: string;
  type: FieldDefinitionType | 'unmapped';
}

interface BaseFormState {
  detected_fields?: DetectedField[];
}

export type GrokFormState = BaseFormState &
  Omit<GrokProcessorConfig, 'patterns'> & {
    type: 'grok';
    patterns: Array<{ value: string }>;
  };

export type DissectFormState = BaseFormState & DissectProcessorConfig & { type: 'dissect' };

export type ProcessorFormState = GrokFormState | DissectFormState;
