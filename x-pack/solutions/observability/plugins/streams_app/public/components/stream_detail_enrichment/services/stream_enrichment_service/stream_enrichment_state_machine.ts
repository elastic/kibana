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
  /** @xstate-layout N4IgpgJg5mDOIC5RgHYCcCWBjAFgZQBc0wBDAWwDoBXFDWgjEgGwwC9IBiWI0y4rMBgBukANoAGALqJQABwD2sDA3koZIAB6IAjAA4AzBV3aATABYAnBf0BWC9oDsANgdmANCACeifbosUzMxcg-XFtcQN9AF8oj1RMXEJicgo6ZUYWVjooDglpJBAFJRU1Aq0ESwcKEz0HY0izO0aPbwRdMwCrCwcTB30nOwHo2PB0bHweFLSGZjZs3O18uUV01XVym3Eqmt06vX19Rotmrx8bbSMa5ycnM132mxi4scTJvjh5JhEIAGEcDCYECSvC4bwo-EE3zy6iKq1KoA2W2qtXqByOJ1a+m6l0cZhM+hM7WM4jMT1GCQmyXesE+3z+AKBb1BVOosggJAIYGhBVhJXWiBMThMFAOdn0ekaNkO7lOCBsLhFJnMFkFvRs520ZPi42BKWINK+kHpgN1lAgGFgsiYJE82QACmh5AJYDS0LAOLJHc7XbAKCQIBBuctihg1mVEBYnLoRQ5tKZjirYxZdC1EEL-PjdpGHFtdmZNSNta8WfraUb-iawebLdbbSgoA6nXAfR6vc35G6KBAwEwwJyg4UVnzwwhI9H9LH45Zetpk6m5eIbEYCTZnK48T15VqXpTeOCPobfhXGSzq1abfa2y6O+7PU3r53iB3u2gB7zQ-DNBHxOIKCSTJGmzqroIEypiujCniQoOA48r2NoTiLtuFKmvuBp0seqFnrWl73i2d7ejerLsv2UgwkOH78qOUYxnGAHTkmKayiYdh-rO3QGNYFh2OqyE6mCpaHsaJ57thF71ngGBkFQ1olBQQgYGAADuAAiHIkA6YAKcpXBSTJHIfvJimqX2YBYJyEAAGKKYCsBvhRYYIhGBIismQQqucUpCvO1hOBQ2iNGEdwOFYMEWHxxZ7oJGEMlhFrnnWUCSdJsmGdpJmcuZkDWT2EDukoKUGaoRnKWpBAacQ6X2SGjlfqOmwUHsBzmNo8pbPo84gUutybKEMHiL4TjhYWO6oVQbIGRJTIQKoYCpCgQjyAA1nNRa7ik40kdkpoIHQi1YEVKB5NVcJUb0wqitYErqtK85OI4lzmGuE4BTUEXrZQm2TUlTJgGgjpoBQ54EAAZh2lBrWNE0MFNVK7QtTqHcdZE8g5n7lOdIq2FdDxSoE86TtUsFtQFq42CBMQjCg8jdvABSQ285E1ejiAALROPO7N-j+PO8zzhLvWNtD0BkbCQEzp0jni875sKKrNectyy04wzPChYLTKLWT1hLw5OQg-QdLYrWwbGAw2NLsqyxQ8srghgSmCrgsCQeMWVlSuuUSOAwXKbIX3FcETzqYHTnKFA2wSH-TOyWrvlrFVbxTh9aNoRbqe7V5QhUuWx4vKzi6C4HOyqbFA9WENyxmYsG6DHUVx0eCenkn4lJXpqW1e+mdplYjWrv7dSB0xrT+-5gU-ns4g3LXI3q7H6Hx+7okt4lyX6XJ6VlRVWnGRnLMIK4VR+8mg+OEHsp+L7hKhIX1f3Vus-8fPZaN0vKRiav7eHSVGVmRZOW2T3lRUwegbYBVamEXw4hzCdWONUa+91JTigpo-SKG1obbUZqjZmVFLatCjFUUwVcgqxgggWNWT964LwgAAJXkPIAgpogHezqEYEkAxC4WAiCSMCiBjCdC6ANAwFteiUyiEAA */
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
