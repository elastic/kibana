/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ErrorActorEvent, MachineImplementationsFrom, assign, setup } from 'xstate5';
import { getPlaceholderFor } from '@kbn/xstate-utils';
import {
  ProcessorDefinition,
  WiredStreamGetResponse,
  getProcessorType,
  isRootStreamDefinition,
  isWiredStreamGetResponse,
} from '@kbn/streams-schema';
import { errors as esErrors } from '@elastic/elasticsearch';
// import { CategorizeLogsServiceDependencies, LogCategorizationParams } from './types';
import { i18n } from '@kbn/i18n';
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
    // fetchSamples: getPlaceholderFor(createSampleFetcherActor),
    upsertStream: getPlaceholderFor(createUpsertStreamActor),
  },
  actions: {
    notifyUpsertStreamSuccess: () => {},
    notifyUpsertStreamFailure: () => {},
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
    hasMultipleProcessors: ({ context }) => context.processors.length > 1,
    hasStagedChanges: ({ context }) => context.hasStagedChanges,
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5RgHYCcCWBjAFgZQBc0wBDAWwDoMUMCMSAbDAL2qgGIBtABgF1FQABwD2sWhmEoBIAB6IAjADYAnBQAcigOzzNAJl0AWebvndlBgDQgAnojW6KAVgC+zq6ky5CxchQhgCMCw6FChvUjIAFWtBMC4+aRExOklpOQRdLXVHeUcDPSMTM0sbRABmAwNXd3RsfCIIvwCgkLCG8mjYrnl+JBAk8VS+9MzNbNz8w2NTcytbBDUKpz1HMu4czUdNNXlq8FqvdspiWGEGADdIAGEcDAYIcN8IDFhBBhJrNgAFNGEsOFOaFg7EEv3+sEBsAoJAgEB4vSEokGUmGiEculU3Fyih0ZU03EU60cczsajUFE0ZTUmmUW00ijKWl0ew8dUexzgZ0uEBudweRz8LzeH2+YIBwiBILFEIlUP8DGa8MSSJSKNA6XRmOxuPxhMcxNKCHpjgoZTKulW6x0Wx2LIO9R8HNOF2ut3u7MFr3en1CPz+4sloP9MqBFGIEv8aCVfQGqrSiAMhIoimpBjU+UKMxK80URgoykymXRjmpamUds8DsaJy5rr5HueXpFvulkKlwchFAAroIICRAtHEckJGrZGiMRQsY4cZTdUSSQgcuT0a43CAUMJ-PA+qzDo7lcOhurEABaRQLs8VtkC6jiRgsNgH5HxhAGXQLnZOK97xr+QLBNh2U6MAnzjVFF00BcKnJRRYLg+DYM0b8q18GsXR5N1+X3GMVRHF8ynMZNU3TTRM2KKD00nZk113FCnVrDD6wFRthR9KA-XBSFQLw8DVnJbhuCpZQzGUaYzAXUwdAoeQDEcAlTDKHJp2ompKw9NDuV5d1mKFb1AIwMgu3eMCh2fcDKgcFNSJIsjZkNUwtmTWT5MEpTFBU-Y1IFDS620x1PVY-TDOMkcKHODAwAAdwAEX7EgfjAcKou4o8x1fZRVFLMsRLEuz5nkGSTUKlzFOxDzaPUzl0K0rDf105swgMoz+1CpKYuaYJIAAMQi+5t1Mky0oMYSiOsjNcuzBRdEEpy5JxVyyuQyrnW5AAlYRhAIdkUtHdJKlUAw8TTcaijy8ojFXZwgA */
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
        },
      ],
    },
    resolvedChildStream: {
      type: 'parallel',
      entry: [{ type: 'setupProcessors' }],
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
          target: '',
        },
        onError: {
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
    // fetchSamples: createSampleFetcherActor({ streamsRepositoryClient }),
    upsertStream: createUpsertStreamActor({ streamsRepositoryClient }),
    // categorizeDocuments: categorizeDocuments({ search }),
    // countDocuments: countDocuments({ search }),
  },
  actions: {
    notifyUpsertStreamSuccess: createUpsertStreamSuccessNofitier({ toasts }),
    notifyUpsertStreamFailure: ({
      event,
    }: {
      event: ErrorActorEvent<esErrors.ResponseError, 'upsertStream'>;
    }) => {
      toasts.addError(new Error(event.error.body.message), {
        title: i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.saveChangesError',
          { defaultMessage: "An issue occurred saving processors' changes." }
        ),
        toastMessage: event.error.body.message,
      });
    },
  },
});

const createProcessorsList = (processors: ProcessorDefinition[]) => {
  return processors.map((processor) => processorConverter.toUIDefinition(processor));
};
