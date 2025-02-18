/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { MachineImplementationsFrom, assign, enqueueActions, setup } from 'xstate5';
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
  StreamEnrichmentEventByType,
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
    notifyUpsertStreamSuccess: getPlaceholderFor(createUpsertStreamSuccessNofitier),
    notifyUpsertStreamFailure: getPlaceholderFor(createUpsertStreamFailureNofitier),
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
    addProcessor: assign(({ context }, params: StreamEnrichmentEventByType<'processors.add'>) => ({
      processors: context.processors.concat(
        processorConverter.toUIDefinition(params.processor, { status: 'draft' })
      ),
    })),
    deleteProcessor: assign(
      ({ context }, params: StreamEnrichmentEventByType<'processors.delete'>) => ({
        processors: context.processors.filter((proc) => proc.id !== params.id),
      })
    ),
    reorderProcessors: assign((_, params: StreamEnrichmentEventByType<'processors.reorder'>) => ({
      processors: params.processors,
    })),
    updateProcessor: assign(
      ({ context }, params: StreamEnrichmentEventByType<'processors.update'>) => ({
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
      ({ context }, params: Pick<StreamEnrichmentEventByType<'processors.add'>, 'fields'>) => {
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
  /** @xstate-layout N4IgpgJg5mDOIC5RgHYCcCWBjAFgZQBc0wBDAWwDoBXFDWgjEgGwwC9IBiWI0y4rMBgBukANoAGALqJQABwD2sDA3koZIAB6IAjAA4AzBV3aATABZdAVn1mz48QE5tANgA0IAJ6J9uhxVvOuiYm4vrilgDsFgC+0e6omLiExOQUdMqMLKx0UBwS0kggCkoqaoVaCGYOERQmehEO+j6m2mbuXgi6ZhSW9uJmeqGWls4msfHo2Pg8qekMzGw5edoFcooZquoVvTV1ug1NxnVtnt6W2kZ1EWHV2nq9luPgk0kzfHDyTCIQAMI4GEwIMleFw3hR+IJvvl1MUNmVQNtxLt6o1msd2t5qpdtA1Is5tOEkU8ElNgaliLBPt8-gCgW9QSlKFRZBASAQwNDCrDSltECZRhQmpYHOYXCEcboMQgRjV9MFLGYwl0whExnFnolpozwR8vpAaYCyZQIBhYLImCQPDkAApoeQCWCUtCwDiyO0Op2wCgkCAQTlrEoYTblRAOQKCiIEqLiLohHxS0Z+Ew+CKBXT7EznYkvLW8HWUvW-f6GsEms0Wq0oKC2+1wT2u911+TOigQMBMMDs-1FdY8kMIMO6CNRuyx0KS07S8JGOXWQJXA7ZzVG-NU-XFunasvmy02xuO5sut21g8t4jNttobvcoPwzSh+wUfomarnBy2Bz7KU+Ez+flhMwIhGFUmiXUkwQpNci1pFdtwrPcT3rY8PUPagWTZDkpBhXtb15Adw30SMkVHMw4wnDpMz8cQQiRfkHBjfRhjA15tUgwsDU3PM4N3Ks8AwMgqAtUoKCEDAwAAdwAETZEhbTAUSJK4fjBLZW8RLEqTOzALB2QgAAxMTAVga8cODBFQzlQVP1IxwbHlciLOcChWl6HFk2CID9GY3NyV1akN1g00d0rKA+IEoS1IUzT2R0yADPbCAXSUcLVNUdSJOkghZOIKKTMDMz7wHXoKAiI4Bl0JFdGcZwHCldNLAoZwzF6ZrqJfe5vJXZlWQYXj6QgVQwDSFAhHkABrIaSRYvNutUvrGQQOhRqwVKUHyPK4TwkxVUFRiRQGUZxAlBMcUuTNtEsF99GqgZOrBWbetC+kwDQO00AoHcCAAM2bSgpp8pl0Meo1FpG+1VvWrCuVMu8Km238hX2sUjtKqVIwubaRhjYJk0ux4nhQeQ23gQp-qNbD8thxAAFo3EnWmnz6JnmciO7tRoOZMjYSAKc2-tSKlAZfxFQ4ausCxrjZvNOYWbIq15vtzIQa7ukYi7rCCEwKu0fRBdMCgRf0MN8VsbR6OcKXfILfyYLeBXcP7ZxzhKyJSua1VhkzKVTG6S77ECRpnEOEVLfea311trcgvgqsaxQ517YKipcSfKIXH0Vp9kCSw0ciRrWtK8wUeq0PV3YgLS2jnjQuUiKCpvJPEBqvwgIiN3IkzPG0c-ZzWpaqprEY0u2Jtkso-LauwpU4Sosy7L5I0xOqYQKIalb9uPa7ydfAuVUDGuVVbDbhxh78iOx64quQqnuuUHS6LtN0+KjKXvCWiHJw7Gahx6NIp26vfLULWhFCLmEAg0UuD0cjk2hpTPCAtJyBBqKYSMdggKhADqfcOEAABK8h5AEBgQGPmStnClSMP0VUz4CSULqhcXofQrgZysF5WI0QgA */
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
      entry: enqueueActions(({ check, enqueue }) => {
        enqueue({
          type: 'setupProcessors',
          params: ({ context }) => ({ definition: context.definition }),
        });
        // Setup fields for wired stream only
        if (check('isWiredStream')) {
          enqueue({
            type: 'setupFields',
            params: ({ context }) => ({ definition: context.definition as WiredStreamGetResponse }),
          });
        }
      }),
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
          fields: context.fields,
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
