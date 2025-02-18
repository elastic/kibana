/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MachineImplementationsFrom, assign, fromPromise, setup } from 'xstate5';
import { getPlaceholderFor } from '@kbn/xstate-utils';
import {
  ProcessorDefinition,
  WiredStreamGetResponse,
  getProcessorType,
  isRootStreamDefinition,
  isWiredStreamGetResponse,
} from '@kbn/streams-schema';
import { ProcessorDefinitionWithUIAttributes } from '../../types';
// import { CategorizeLogsServiceDependencies, LogCategorizationParams } from './types';
import {
  StreamEnrichmentContext,
  StreamEnrichmentEvent,
  StreamEnrichmentEventPayload,
  StreamEnrichmentInput,
  StreamEnrichmentServiceDependencies,
} from './types';
import { processorConverter } from '../../utils';

export const streamEnrichmentService = setup({
  types: {
    input: {} as StreamEnrichmentInput,
    context: {} as StreamEnrichmentContext,
    events: {} as StreamEnrichmentEvent,
  },
  actors: {
    fetchSamples: getPlaceholderFor(createSampleFetcherActor),
  },
  actions: {
    setupProcessors: assign(({ context }) => {
      const processors = createProcessorsList(context.definition.stream.ingest.processing);
      return {
        initialProcessors: processors,
        processors,
      };
    }),
    setupFields: assign((_, params: { definition: WiredStreamGetResponse }) => ({
      fields: params.definition.stream.ingest.wired.fields,
    })),
    addProcessor: assign(({ context }, params: StreamEnrichmentEventPayload<'processors.add'>) => ({
      processors: context.processors.concat(
        processorConverter.toUIDefinition(params.processor, { status: 'draft' })
      ),
    })),
    deleteProcessor: assign(
      ({ context }, params: StreamEnrichmentEventPayload<'processors.delete'>) => ({
        processors: context.processors.filter((proc) => proc.id !== params.id),
      })
    ),
    reorderProcessors: assign((_, params: StreamEnrichmentEventPayload<'processors.reorder'>) => ({
      processors: params.processors,
    })),
    updateProcessor: assign(
      ({ context }, params: StreamEnrichmentEventPayload<'processors.update'>) => ({
        processors: context.processors.map((proc) =>
          proc.id === params.id
            ? {
                ...params.processorUpdate,
                id: params.id,
                type: getProcessorType(params.processorUpdate),
                status: params.status,
              }
            : proc
        ),
      })
    ),
    updateFields: assign(
      ({ context }, params: Pick<StreamEnrichmentEventPayload<'processors.add'>, 'fields'>) => {
        // TODO: implement mergeFields logic
        return {};
      }
    ),
    deriveStagedChangesFlag: assign(({ context }) => {
      const { initialProcessors, processors } = context;
      return {
        hasStagedChanges:
          initialProcessors.length !== processors.length || // Processor count changed, a processor might be deleted
          processors.some((processor) => ['draft', 'updated'].includes(processor.status)) || // New or updated processors
          processors.some((processor, pos) => initialProcessors[pos].id !== processor.id), // Processor order changed
      };
    }),
  },
  guards: {
    isRootStream: ({ context }) => isRootStreamDefinition(context.definition.stream),
    isWiredStream: ({ context }) => isWiredStreamGetResponse(context.definition),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5RgHYCcCWBjAFgZQBc0wBDAWwDoMUMCMSAbDAL2qgGIBtABgF1FQABwD2sWhmEoBIAB6IAjADYAnBQAcigOzy1mgKwAaEAE8FAJkXqza+Wb0Bfe0dSZchYuQoQwBMFjooUO6kZAAqxoJgXHzSImJ0ktJyCAAsanrq3CmKuoYmiGbc3BQp3Ip2js7o2PhEIV4+fgFBdeThkVzy-EggceKJPclpGWpZOfpGpghm2SVlFU7g1W6tlN6+-mzBbRFRnGbdQqL9UoOIw5nZuZOINhQOlSAowt7wPS4122SxxwmnoMkALSKG4IYGPD4rDyUajiRgsNg-eISf6yc5mUG2EbWLEQ5a1aENDbNL7tMBIk5JAqKFIUZR6ADMWMxdisNgWVVcBPqxFgwgYADdIAB1DDECBfCl-KkITRlCg0+Z5KYWSwMtQ4jlLLlfCi8-lCiAAVRQAHcxZBJT0+tKzrL5YrysqFPJafSmVrIdzPPrBZAAErCYQEK1HZEDAGIOWWR12THKTRzJ2ORxAA */
  id: 'enrichStream',
  context: ({ input }) => ({
    definition: input.definition,
    initialProcessors: [],
    processors: [],
    fields: {},
    hasStagedChanges: false,
  }),
  initial: 'initializing',
  states: {
    initializing: {
      // Keep this empty for now as a middle state to perform upcoming initializations (url params, etc)
      always: 'detectingStreamType',
    },
    detectingStreamType: {
      always: [
        {
          target: 'resolvedRootStream',
          guard: 'isRootStream',
        },
        {
          target: 'resolvedChildStream',
          actions: [{ type: 'setupProcessors' }],
        },
      ],
    },

    resolvedChildStream: {
      always: [
        {
          target: 'resolvedWiredStream',
          guard: 'isWiredStream',
          actions: [
            {
              type: 'setupFields',
              params: ({ context }) => ({
                definition: context.definition as WiredStreamGetResponse,
              }),
            },
          ],
        },
        { target: 'resolvedUnwiredStream' },
      ],
    },

    resolvedWiredStream: {
      on: {
        'processors.add': {
          actions: [
            { type: 'addProcessor', params: ({ event }) => event },
            { type: 'updateFields', params: ({ event }) => ({ fields: event.fields }) },
            { type: 'deriveStagedChangesFlag' },
          ],
        },
        'processors.delete': {
          actions: [
            { type: 'deleteProcessor', params: ({ event }) => event },
            { type: 'deriveStagedChangesFlag' },
          ],
        },
        'processors.reorder': {
          actions: [
            { type: 'reorderProcessors', params: ({ event }) => event },
            { type: 'deriveStagedChangesFlag' },
          ],
        },
        'processors.update': {
          actions: [
            { type: 'updateProcessor', params: ({ event }) => event },
            { type: 'deriveStagedChangesFlag' },
          ],
        },
      },
    },

    resolvedUnwiredStream: {
      on: {
        'processors.add': {
          actions: [
            { type: 'addProcessor', params: ({ event }) => event },
            { type: 'deriveStagedChangesFlag' },
          ],
        },
        'processors.delete': {
          actions: [
            { type: 'deleteProcessor', params: ({ event }) => event },
            { type: 'deriveStagedChangesFlag' },
          ],
        },
        'processors.reorder': {
          actions: [
            { type: 'reorderProcessors', params: ({ event }) => event },
            { type: 'deriveStagedChangesFlag' },
          ],
        },
        'processors.update': {
          actions: [
            { type: 'updateProcessor', params: ({ event }) => event },
            { type: 'deriveStagedChangesFlag' },
          ],
        },
      },
    },

    resolvedRootStream: {
      type: 'final',
    },
  },
  output: ({ context }) => ({
    processors: context.processors,
  }),
});

export const createCategorizeLogsServiceImplementations = ({
  streamsRepositoryClient,
  toasts,
}: StreamEnrichmentServiceDependencies): MachineImplementationsFrom<
  typeof streamEnrichmentService
> => ({
  actors: {
    fetchSamples: createSampleFetcherActor({ streamsRepositoryClient }),
    // categorizeDocuments: categorizeDocuments({ search }),
    // countDocuments: countDocuments({ search }),
  },
});

function createSampleFetcherActor({
  streamsRepositoryClient,
}: Pick<StreamEnrichmentServiceDependencies, 'streamsRepositoryClient'>) {
  return fromPromise(() => {});
}

const createProcessorsList = (processors: ProcessorDefinition[]) => {
  return processors.map((processor) => processorConverter.toUIDefinition(processor));
};

const hasOrderChanged = (
  processors: ProcessorDefinitionWithUIAttributes[],
  initialProcessors: ProcessorDefinitionWithUIAttributes[]
) => {
  return processors.some((processor, index) => processor.id !== initialProcessors[index].id);
};
