/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Condition,
  DissectProcessorConfig,
  FieldDefinitionConfig,
  GrokProcessorConfig,
} from '@kbn/streams-schema';

export interface DissectProcessingDefinition {
  dissect: Omit<DissectProcessorConfig, 'if'>;
}

export interface GrokProcessingDefinition {
  grok: Omit<GrokProcessorConfig, 'if'>;
}

export interface ProcessingDefinition {
  condition: Condition;
  config: DissectProcessingDefinition | GrokProcessingDefinition;
}

export interface EnrichmentUIProcessorDefinition extends ProcessingDefinition {
  id: string;
}

export interface ProcessingDefinitionGrok extends Pick<ProcessingDefinition, 'condition'> {
  config: GrokProcessingDefinition;
}

export interface ProcessingDefinitionDissect extends Pick<ProcessingDefinition, 'condition'> {
  config: DissectProcessingDefinition;
}

interface BaseFormState extends Pick<ProcessingDefinition, 'condition'> {
  detected_fields?: DetectedField[];
}

export type GrokFormState = BaseFormState &
  Omit<GrokProcessingDefinition['grok'], 'patterns'> & {
    type: 'grok';
    patterns: Array<{ value: string }>;
  };

export type DissectFormState = DissectProcessingDefinition['dissect'] &
  BaseFormState & { type: 'dissect' };

export type ProcessorFormState = GrokFormState | DissectFormState;

export interface DetectedField {
  name: string;
  type: FieldDefinitionConfig['type'] | 'unmapped';
}

export function isGrokProcessor(
  config: ProcessingDefinition['config']
): config is GrokProcessingDefinition {
  return 'grok' in config;
}

export function isDissectProcessor(
  config: ProcessingDefinition['config']
): config is DissectProcessingDefinition {
  return 'dissect' in config;
}
