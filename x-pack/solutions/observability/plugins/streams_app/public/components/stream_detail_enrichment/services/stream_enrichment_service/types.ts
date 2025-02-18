/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IToasts } from '@kbn/core/public';
import { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import { FieldDefinition, IngestStreamGetResponse, ProcessorDefinition } from '@kbn/streams-schema';
import { ErrorActorEvent } from 'xstate5';
import { errors as esErrors } from '@elastic/elasticsearch';
import { DetectedField, ProcessorDefinitionWithUIAttributes } from '../../types';

export interface StreamEnrichmentServiceDependencies {
  streamsRepositoryClient: StreamsRepositoryClient;
  toasts: IToasts;
}

export interface StreamEnrichmentInput {
  definition: IngestStreamGetResponse;
}

export interface StreamEnrichmentContext {
  definition: IngestStreamGetResponse;
  initialProcessors: ProcessorDefinitionWithUIAttributes[];
  processors: ProcessorDefinitionWithUIAttributes[];
  fields: FieldDefinition;
  hasStagedChanges: boolean;
}

export type StreamEnrichmentEvent =
  | { type: 'stream.update' }
  | { type: 'simulation.viewDataPreview' }
  | { type: 'simulation.viewDetectedFields' }
  | { type: 'processors.add'; processor: ProcessorDefinition; fields?: DetectedField[] }
  | { type: 'processors.add'; processor: ProcessorDefinition; fields?: DetectedField[] }
  | { type: 'processors.delete'; id: string }
  | { type: 'processors.reorder'; processors: ProcessorDefinitionWithUIAttributes[] }
  | {
      type: 'processors.update';
      id: string;
      processorUpdate: ProcessorDefinition;
      status: ProcessorDefinitionWithUIAttributes['status'];
    }
  | ErrorActorEvent<esErrors.ResponseError, 'stream.update'>;

export type StreamEnrichmentEventPayload<TEventType extends StreamEnrichmentEvent['type']> =
  Extract<StreamEnrichmentEvent, { type: TEventType }>;
