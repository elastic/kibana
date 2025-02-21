/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActorRefFrom } from 'xstate5';
import { IToasts } from '@kbn/core/public';
import { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import { FieldDefinition, IngestStreamGetResponse } from '@kbn/streams-schema';
import { ProcessorDefinitionWithUIAttributes } from '../../types';
import { ProcessorToParentEvent, processorMachine } from './processor_state_machine';

export interface StreamEnrichmentServiceDependencies {
  refreshDefinition: () => void;
  streamsRepositoryClient: StreamsRepositoryClient;
  toasts: IToasts;
}

export interface StreamEnrichmentInput {
  definition: IngestStreamGetResponse;
}

export interface StreamEnrichmentContext {
  definition: IngestStreamGetResponse;
  initialProcessors: Array<ActorRefFrom<typeof processorMachine>>;
  processors: Array<ActorRefFrom<typeof processorMachine>>;
  hasStagedChanges: boolean;
  fields?: FieldDefinition;
}

export type StreamEnrichmentEvent =
  | ProcessorToParentEvent
  | { type: 'stream.received'; definition: IngestStreamGetResponse }
  | { type: 'stream.reset' }
  | { type: 'stream.update' }
  | { type: 'simulation.viewDataPreview' }
  | { type: 'simulation.viewDetectedFields' }
  | { type: 'processors.add'; processor: ProcessorDefinitionWithUIAttributes }
  | { type: 'processors.reorder'; processors: Array<ActorRefFrom<typeof processorMachine>> };

export type StreamEnrichmentEventByType<TEventType extends StreamEnrichmentEvent['type']> = Extract<
  StreamEnrichmentEvent,
  { type: TEventType }
>;

export type StreamEnrichmentEventParams<TEventType extends StreamEnrichmentEvent['type']> = Omit<
  StreamEnrichmentEventByType<TEventType>,
  'type'
>;
