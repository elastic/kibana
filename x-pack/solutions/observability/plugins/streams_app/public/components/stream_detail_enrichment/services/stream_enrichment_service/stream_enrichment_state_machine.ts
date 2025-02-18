/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { MachineImplementationsFrom, assign, setup } from 'xstate5';
import { getPlaceholderFor } from '@kbn/xstate-utils';
import {
  IngestStreamGetResponse,
  ProcessorDefinition,
  WiredStreamGetResponse,
  getProcessorType,
  isRootStreamDefinition,
  isWiredStreamGetResponse,
} from '@kbn/streams-schema';
import {
  StreamEnrichmentContext,
  StreamEnrichmentEvent,
  StreamEnrichmentEventPayload,
  StreamEnrichmentInput,
  StreamEnrichmentServiceDependencies,
} from './types';
import { processorConverter } from '../../utils';
import {
  createUpsertStreamActor,
  createUpsertStreamFailureNofitier,
  createUpsertStreamSuccessNofitier,
} from './upsert_stream';

export const streamEnrichmentService = setup({
  types: {
    input: {} as StreamEnrichmentInput,
    context: {} as StreamEnrichmentContext,
    events: {} as StreamEnrichmentEvent,
  },
  actors: {
    upsertStream: getPlaceholderFor(createUpsertStreamActor),
  },
  actions: {
    notifyUpsertStreamSuccess: () => {},
    notifyUpsertStreamFailure: () => {},
    storeDefinition: assign((_, params: { definition: IngestStreamGetResponse }) => ({
      definition: params.definition,
    })),
    setupProcessors: assign((_, params: { definition: IngestStreamGetResponse }) => {
      const processors = createProcessorsList(params.definition.stream.ingest.processing);
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
    hasMultipleProcessors: ({ context }) => context.processors.length > 1,
    hasStagedChanges: ({ context }) => context.hasStagedChanges,
    isRootStream: ({ context }) => isRootStreamDefinition(context.definition.stream),
    isWiredStream: ({ context }) => isWiredStreamGetResponse(context.definition),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5RgHYCcCWBjAFgZQBc0wBDAWwDoBXFDWgjEgGwwC9IBiWI0y4rMBgBukANoAGALqJQABwD2sDA3koZIAB6IAHABYAzBQBsR-QHZx20wEZdVgJwAaEAE9E16xXP7rR3Wb0AVh8jbWsAX3DnVExcQmJyCjplRhZWOigOCWkkEAUlFTVcrQRAgCZnNwRrMrDjMtszMtCjcX1gyOj0bHweROSGZjYMrOscuUUU1XUS7X0jCmsze1MmvV1fM0rEc3EKMyMy5bL9U-17a21O8G64vr44eSYRCABhHAwmCHjeLnuKfiCF7ZdT5KZFUAlaziIz2Lx2cQwpomOwVVw7REUYIeGHiMy6cSBIxma4xHo-RLEWBPF7vT7fe5-BKUKiyCAkAhgEG5MGFGY6eaLZarWq6DbE7YIMKBLHaQLWey6QLaRVGJak269ZkAx7PSB0r4UygQDCwWRMEguDIABTQ8gEsGpaFgHFkdodTtgFBIEAg3ImBQw02KOzKZWM1n0zTK4kjrXORklRkCewawV0Ye0WbMHSiN1iWt4OupereH0N-xNZotVpQUFt9rgntd7qb8mdFAgYCYYE5-rykz5IYQUfDaqjh1j8zaK0l5QW2nE9ljSqV+l0oQ1BaNxZp+vLDO1VfNlptrcd7ZdbsbF47xHbXbQ-d5QYhmkQZUCugotXlBLx-gBJckoEoYBLNFYi6XJcpxbuS-xUnuZb0jux41meN7NteHqXtQbIclyUigoOr78iOYYRhOMZxjOiboggRxwvYKzBPKypWOIZS6HBdzaohpYGoeRZoaedZ4BgZBUBahQUEIGBgAA7gAIhyJC2mAcmKVwElSRyr6yfJym9mAWCchAABi8lfLAz4kcGkIflYxgEocapmOYGZ0VU9iBGYixpvoSL6GEwU8YWlK6rSB6oaaJ61lA4mSdJ+maUZnKmZAlndhALpKElemqAZikqQQanEKltmBvZ74joSFCceuNRsVGKqSsuCyHNYX7rmsKwknmZK8UWrLsgwYmMhAqhgEkKBCPIADW02DeFLL4WNCX3AgdBzVgBUoNklXgmRHj2NoQorHYjUhdoko5jKvhWE0ZgBH45hhTuI16eNzIcGAaB2mgFAngQABm7aUMtH1rRkRpbbN9p7QdRE8nZb5QksZ26PYDQGFmhKRjd9EmJ4Zhda9n7rhBkR5ig8hdvAuSQ-cxFVWjiAALQZpK7MHP5oTmCqKbMQq73-DQAypGwkAs0dw5YxQHHNMxSJygckoNArCLaCcioXGGm4DZqO4S0M6R1jLQ4OQgy5wpYrRLI07TBJKkb2IYByEgc0JdX+ot8ZF+4oczKOs2RXnuEqFBY8m8qnCYZSKn7Rb8VFQdHrF6F1g2OHOhbpHDrYcIhAS8q2Fxqu3QE9SF+cPhzOuScRSWqcVun1aiQlOnJdVL7VSUX6SmEcI1LYYSRkcKbcYb24IQHyGt8JGcd4lukyalJVlRphl5337icW1NT7OIdj4sSgXR43DzN4HC+JCJ8Ur93KBFWlJlmVl1k72zpTuYsRJhv4WElgAgHxlDGE+G53LHxWJfPCo0YbBwDLLK2HgvzGD8JxKwDRfC+EHnidBVhoTxzFD4WBKdIAACV5DyAIEaL+ZETiGGVMqewBwE7ylYeHaoRwzqdXlAEfE7kIjUyAA */
  id: 'enrichStream',
  context: ({ input }) => ({
    definition: input.definition,
    initialProcessors: [],
    processors: [],
    hasStagedChanges: false,
  }),
  initial: 'uninitialized',
  states: {
    uninitialized: {
      on: {
        'stream.received': {
          target: 'initializing',
          actions: [{ type: 'storeDefinition', params: ({ event }) => event }],
        },
      },
    },
    initializing: {
      always: [
        {
          target: 'resolvedRootStream',
          guard: 'isRootStream',
        },
        {
          target: 'resolvedChildStream',
        },
      ],
    },
    resolvedChildStream: {
      type: 'parallel',
      entry: [
        {
          type: 'setupFields',
          params: ({ context }) => ({ definition: context.definition as WiredStreamGetResponse }),
          guard: 'isWiredStream',
        },
        {
          type: 'setupProcessors',
          params: ({ context }) => ({ definition: context.definition }),
        },
      ],
      states: {
        displayingProcessors: {
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
              guard: 'hasMultipleProcessors',
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
        displayingSimulation: {
          initial: 'viewDataPreview',
          states: {
            viewDataPreview: {
              on: {
                'simulation.viewDetectedFields': 'viewDetectedFields',
              },
            },
            viewDetectedFields: {
              on: {
                'simulation.viewDataPreview': 'viewDataPreview',
              },
            },
          },
        },
      },
      on: {
        'stream.received': {
          target: 'initializing',
          actions: [{ type: 'storeDefinition', params: ({ event }) => event }],
        },
        'stream.update': {
          guard: 'hasStagedChanges',
          target: 'updatingStream',
        },
      },
    },
    updatingStream: {
      invoke: {
        src: 'upsertStream',
        input: ({ context }) => ({
          definition: context.definition,
          processors: context.processors,
          fields: isWiredStreamGetResponse(context.definition) ? context.fields : undefined,
        }),
        onDone: {
          target: 'resolvedChildStream',
          actions: [{ type: 'notifyUpsertStreamSuccess' }],
        },
        onError: {
          target: 'resolvedChildStream',
          actions: [{ type: 'notifyUpsertStreamFailure' }],
        },
      },
    },
    resolvedRootStream: {
      type: 'final',
    },
  },
});

export const createCategorizeLogsServiceImplementations = ({
  streamsRepositoryClient,
  toasts,
}: StreamEnrichmentServiceDependencies): MachineImplementationsFrom<
  typeof streamEnrichmentService
> => ({
  actors: {
    upsertStream: createUpsertStreamActor({ streamsRepositoryClient }),
  },
  actions: {
    notifyUpsertStreamSuccess: createUpsertStreamSuccessNofitier({ toasts }),
    notifyUpsertStreamFailure: createUpsertStreamFailureNofitier({ toasts }),
  },
});

const createProcessorsList = (processors: ProcessorDefinition[]) => {
  return processors.map((processor) => processorConverter.toUIDefinition(processor));
};
