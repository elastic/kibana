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
    refreshDefinition: () => {},
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
  /** @xstate-layout N4IgpgJg5mDOIC5RgHYCcCWBjAFgZQBc0wBDAWwGJYjSyA6YrMDAN0gG0AGAXUVAAcA9rAwEMglHxAAPRABYATABoQAT0QA2AJwBWOloDsAZjlGAjGYMbLZowF87K1JlyFi5OhhSiMJADYYAF5eUBRcvEggQiJiElKyCHJaGvoaBgpanHLWBpwKOkYq6ghmnDoAHHScukZahmba5VoOTujY+DQeXj7+QSFhZhECwj5xkQk6nCkmCgra6RpJOjpFiAZmCnRyBjuLNrrlci3gba6d9MSwgn5sEADCOBh+EG60VOcMcGAE4VLRo5JxogLGY5HQ0lpFHkzMkDFpVghymY6DoFJxODDyjotAo5BUdMdnO1Xh5Ltdbg8ni9zu93PQAK78CAkAhgX6Rf6xQGgBIKdJ0IxGbFGdGTLQi8oIoz5cFacoaMo1OVyQ6E04dOmfK43SCU54k+gQDCwfh+EiqEIABTQgiYsCuaFgFH4NrtDtgdBIEAg7OGMXE3JkwLylV0ZgKfNy+SyCJ0GlD5QMFVqcPlSTVLg1tC15N1j31HyNJrNFpQUGttrg7udrqrgkddAgYD83zZPD+Iy58WDClDOnD0p2eUmcgRcjxKKR0rMTQMSMU9kcJ0zBpzOvu+epmqLpvNVtr9vrTpdlcPDeI9abaF9UU7Ae7CGSnHBCkFdQxxj5hTUiGlm0skzYkiOhWEKGbEh8ZLrnqW7ZjuJb7qe1Ynm6R50IyzKsjenL3kCJQhvo-YRkO0ajj+JRynQViJoYxhGOsvbgWcmpQRSm6rvBe5lngGBkPSZpcnQLAYGAADuAAiLIkNaYDCWJVC8fxLIBkJIkSa2WCshAABiInPLA2F3mMPKIHUmyGOU5SCnOpQaBo37FImehNEY5QhrUIE4kxWaknAuYblSHHGrupZQDxfECSpcnqaymmQLpzYQE6IgRcpEiqWJkkENJxDRYZ-rGUG+EWAK1iLAsVjLAYCLlDKtRGIsGTVPGi6tCuHwYcp3E0hAEhgJ4KAsIIADW-VEsx2adWI3V0ggXhDVgaUoOE+UAg+fKbIKwqitUEpSlYdCYiB462DC9HeauU0hAaFBgGgNpoHQu4EAAZvW9DjT5DJMl1YXnHNg22ktK3thyRmBryGibUK4o7bDkrkUkKQKtsc6cCK2zaASxwoIITbwJEn0Gh2BUQ4gAC0GgIuTr50K+FgquOrkgfkF0dd43hiL0gSQCTa14SKehzLoCgwuOkK1DVljgrk1RaOGvYZGzmrdFzATBGWfNdnhaJgosiwFCLTQxuRFizPoIqlG5Gzy+UyvZqxeaBecWu4SZCAMQKrmviYkJYkkCKLHT8ZYhY8t2ZY9u+dqbHO9uwUIWWFaoY6ruFQkWJ6BoOh4km6RyBsnAI8U8wCuKSbo3MIEwlHFx+dB7GFgnXFhYpkWFTh6drAqXu1YKSQqjn8LkcYBh0C56yJliaMGLXa6xwW8fFi34VKYJ0VZTlslqWnZOIkXvc+wP-vD455hbEOdnpOG1hHEuROQfXC+wR4nGhav7coBlMVgHFOl6UlXeD4Nhwi2JCTGbkGpxmquRKyRh9BDhDIYOozR77qkuj9aaf06RAJ1lZFEMJUSQmsKiWqZFiiQnBBsPEMJ8hJFqtjNqEEWJP0gAAJUEIIAgxMwakwfFZPQcYMhCgajiZYCIzbInjBiWo9DRZxgcA4IAA */
  id: 'enrichStream',
  context: ({ input }) => ({
    definition: input.definition,
    initialProcessors: [],
    processors: [],
    hasStagedChanges: false,
  }),
  initial: 'listeningForDefinitionChanges',
  on: {
    'stream.received': {
      target: '.initializing',
      actions: [{ type: 'storeDefinition', params: ({ event }) => event }],
    },
  },
  states: {
    listeningForDefinitionChanges: {
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
          actions: enqueueActions(({ check, enqueue }) => {
            enqueue({
              type: 'setupProcessors',
              params: ({ context }) => ({ definition: context.definition }),
            });
            // Setup fields for wired stream only
            if (check('isWiredStream')) {
              enqueue({
                type: 'setupFields',
                params: ({ context }) => ({
                  definition: context.definition as WiredStreamGetResponse,
                }),
              });
            }

            enqueue({ type: 'deriveStagedChangesFlag' });
          }),
        },
      ],
    },
    resolvedChildStream: {
      type: 'parallel',
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
        'stream.reset': {
          target: 'initializing',
          reenter: true,
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
          target: 'listeningForDefinitionChanges',
          actions: [{ type: 'notifyUpsertStreamSuccess' }, { type: 'refreshDefinition' }],
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
  refreshDefinition,
  streamsRepositoryClient,
  toasts,
}: StreamEnrichmentServiceDependencies): MachineImplementationsFrom<
  typeof streamEnrichmentService
> => ({
  actors: {
    upsertStream: createUpsertStreamActor({ streamsRepositoryClient }),
  },
  actions: {
    refreshDefinition,
    notifyUpsertStreamSuccess: createUpsertStreamSuccessNofitier({ toasts }),
    notifyUpsertStreamFailure: createUpsertStreamFailureNofitier({ toasts }),
  },
});

const createProcessorsList = (processors: ProcessorDefinition[]) => {
  return processors.map((processor) => processorConverter.toUIDefinition(processor));
};
