/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IToasts } from '@kbn/core-notifications-browser';
import { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { CreateLogsExplorerController } from '@kbn/logs-explorer-plugin/public';
import { actions, createMachine, InterpreterFrom } from 'xstate';
import { TimefilterContract } from '@kbn/data-plugin/public';
import { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import { LogSourcesService } from '@kbn/logs-data-access-plugin/common/types';
import { DEFAULT_CONTEXT } from './defaults';
import {
  ObservabilityLogsExplorerContext,
  ObservabilityLogsExplorerEvent,
  ObservabilityLogsExplorerTypeState,
} from './types';
import { initializeFromUrl, updateUrlFromLogsExplorerState } from './url_state_storage_service';
import {
  createController,
  subscribeToLogsExplorerPublicEvents,
  subscribeToLogsExplorerState,
} from './controller_service';
import { initializeFromTimeFilterService } from './time_filter_service';
import { createDataReceivedTelemetryEventEmitter } from './telemetry_events';
import { initializeAllSelection } from './all_selection_service';

export const createPureObservabilityLogsExplorerStateMachine = (
  initialContext: ObservabilityLogsExplorerContext
) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QHkBGswCcBuBDVAlgDYEAuAngDID2UsAogB4AOR1mWAdAK4B2B-UgVwkAXpADEAbQAMAXUShm1WGQLVeikI0QBGABwBmTvt0AmAKwyZAThsXdAFkcWLAGhDk9Mi5zv+LQ0NTcwA2QwBfCI80DBx8YjIqWgYWNg5MTgE1EQJRASgAMUxqAFsAFQJSsELiUiwAZSxsAgBjMAkASQA5TvLOgEFKToAtegARAH1CgCVkAFlJ-vn6ac7KcvoZyYatgDVOgGF6WQUkEGVVIQ0tHQQLMw8vBGD9ThkzQxd9RxtPmwA7BYojF0M0EiQKDQ6ExWOwuNkhLl8rwiiVSgBVTBELq9fpDUYTaZzRYYmaUU5aS5qG7nO4PJ6IUL2ThWawfFzhXQ2RwgkCxcGESHJGFpeGZVocXBCVGHDSkEpEIhYCSHZDdcpzSiULaTQ4zegDTbjSnnanXTR0xAOGycXQWUJmfSmfQA14AxkIZm+X52AEAsyhfSWB58gXxIVJaGpOEZLKCYRiSA8XgAa141AA7rxo7D0o1SNKOpRkABxBqTegADQACiWDdsGuUjatDgAJAbdUsTU1KFQ0y2gO5fXScN2OQwA2wB-QyfQ2T3mGTGUIOwzL3TrxyBsNgiOJKEpPPi+M5JMQTh4EgQXNijINQv1CQl8uV2v13VNlt6jtdnvyKl+wtW4mVCGQTAcX0J3nQJQkXXRuU4Fx11MAMZDA4MomiEAMwgOAtHDPBI0PUVYywQCrnUQdtEQABaBdPDo3x-BY1j7ABXc4iIg8RRjfNMj4RFEzySAKIHECEG3RcfHedkPmXUJtxscxOMFHjbzIzIhORApijKSpqlqIh6kwJocDaMAxOAq0EDMAE3nnH5HBkcd9AeIJPVMJCWPsp1nCdMxVP3YUNP408kTEXT0SxIgrKoiTt1HR02TcwJHH9RxPVeWS5KcT5TB8ILuJCo87y4SUwGlAo5V4BVqCVcizSA+KbKdN5rHs5lDB5MDdDgxivRZdLV2ZMweUMUIAyKiEo1KzTwuE8QIDi2kh0QbrPRsH4-ECTcnPCQJImwwiZpIviT2088U3TLMczm-iHyLFbqLuV1FzMZzODAnlAwymRdBkXljr3YrZtIsLLpEi8rwIG97vFR76meiSp1tPr7McfQg0MCwMve9KIJsYILFdCwbGXQKsKAA */
  createMachine<
    ObservabilityLogsExplorerContext,
    ObservabilityLogsExplorerEvent,
    ObservabilityLogsExplorerTypeState
  >(
    {
      context: initialContext,
      predictableActionArguments: true,
      id: 'ObservabilityLogsExplorer',
      initial: 'uninitialized',
      states: {
        uninitialized: {
          always: 'initializeAllSelection',
        },
        initializeAllSelection: {
          invoke: {
            src: 'initializeAllSelection',
            onDone: {
              target: 'initializingFromTimeFilterService',
              actions: ['storeAllSelection'],
            },
            onError: 'initializingFromTimeFilterService',
          },
        },
        initializingFromTimeFilterService: {
          invoke: {
            src: 'initializeFromTimeFilterService',
          },
          on: {
            INITIALIZED_FROM_TIME_FILTER_SERVICE: {
              target: 'initializingFromUrl',
              actions: ['storeInitialTimeFilter'],
            },
          },
        },
        initializingFromUrl: {
          invoke: {
            src: 'initializeFromUrl',
          },
          on: {
            INITIALIZED_FROM_URL: {
              target: '#creatingController',
              actions: ['storeInitialUrlState'],
            },
          },
        },
        creatingController: {
          id: 'creatingController',
          invoke: {
            src: 'createController',
          },
          on: {
            CONTROLLER_CREATED: {
              target: 'initialized',
              actions: ['storeController'],
            },
          },
        },
        initialized: {
          invoke: [
            { src: 'subscribeToLogsExplorerState' },
            { src: 'subscribeToLogsExplorerPublicEvents' },
          ],

          states: {
            unknownLogsExplorerState: {
              on: {
                LOGS_EXPLORER_STATE_CHANGED: {
                  target: 'validLogsExplorerState',
                  actions: ['storeLogsExplorerState', 'updateUrlFromLogsExplorerState'],
                },
              },
            },

            validLogsExplorerState: {
              on: {
                LOGS_EXPLORER_STATE_CHANGED: {
                  actions: ['storeLogsExplorerState', 'updateUrlFromLogsExplorerState'],
                  target: 'validLogsExplorerState',
                  internal: true,
                },
                LOGS_EXPLORER_DATA_RECEIVED: {
                  actions: ['trackDataReceived'],
                },
              },
            },
          },

          initial: 'unknownLogsExplorerState',
        },
      },
    },
    {
      actions: {
        storeController: actions.assign((context, event) => {
          return 'controller' in event && event.type === 'CONTROLLER_CREATED'
            ? { controller: event.controller }
            : {};
        }),
        storeAllSelection: actions.assign((context, event) => {
          return 'data' in event
            ? {
                allSelection: event.data,
              }
            : {};
        }),
        storeInitialTimeFilter: actions.assign((context, event) => {
          return 'time' in event &&
            'refreshInterval' in event &&
            event.type === 'INITIALIZED_FROM_TIME_FILTER_SERVICE'
            ? {
                initialLogsExplorerState: {
                  ...('initialLogsExplorerState' in context
                    ? context.initialLogsExplorerState
                    : {}),
                  ...{ time: event.time, refreshInterval: event.refreshInterval },
                },
              }
            : {};
        }),
        storeInitialUrlState: actions.assign((context, event) => {
          return 'stateFromUrl' in event && event.type === 'INITIALIZED_FROM_URL'
            ? {
                initialLogsExplorerState: {
                  ...('initialLogsExplorerState' in context
                    ? context.initialLogsExplorerState
                    : {}),
                  ...event.stateFromUrl,
                },
              }
            : {};
        }),
        storeLogsExplorerState: actions.assign((context, event) => {
          return 'state' in event && event.type === 'LOGS_EXPLORER_STATE_CHANGED'
            ? { logsExplorerState: event.state }
            : {};
        }),
      },
      guards: {},
    }
  );

export interface ObservabilityLogsExplorerStateMachineDependencies {
  createLogsExplorerController: CreateLogsExplorerController;
  initialContext?: ObservabilityLogsExplorerContext;
  timeFilterService: TimefilterContract;
  toasts: IToasts;
  urlStateStorageContainer: IKbnUrlStateStorage;
  analytics: AnalyticsServiceStart;
  logSourcesService: LogSourcesService;
}

export const createObservabilityLogsExplorerStateMachine = ({
  initialContext = DEFAULT_CONTEXT,
  toasts,
  urlStateStorageContainer,
  createLogsExplorerController,
  timeFilterService,
  analytics,
  logSourcesService,
}: ObservabilityLogsExplorerStateMachineDependencies) =>
  createPureObservabilityLogsExplorerStateMachine(initialContext).withConfig({
    actions: {
      updateUrlFromLogsExplorerState: updateUrlFromLogsExplorerState({ urlStateStorageContainer }),
      trackDataReceived: createDataReceivedTelemetryEventEmitter(analytics),
    },
    services: {
      createController: createController({ createLogsExplorerController }),
      initializeFromTimeFilterService: initializeFromTimeFilterService({ timeFilterService }),
      initializeFromUrl: initializeFromUrl({ urlStateStorageContainer, toastsService: toasts }),
      initializeAllSelection: initializeAllSelection({ logSourcesService }),
      subscribeToLogsExplorerState,
      subscribeToLogsExplorerPublicEvents,
    },
  });

export type ObservabilityLogsExplorerService = InterpreterFrom<
  typeof createObservabilityLogsExplorerStateMachine
>;
