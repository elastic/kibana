/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateLogsExplorerController } from '@kbn/logs-explorer-plugin/public';
import { LogsExplorerPublicEvent } from '@kbn/logs-explorer-plugin/public/controller';
import type { InvokeCreator } from 'xstate';
import type { ObservabilityLogsExplorerContext, ObservabilityLogsExplorerEvent } from './types';

export const createController =
  ({
    createLogsExplorerController,
  }: {
    createLogsExplorerController: CreateLogsExplorerController;
  }): InvokeCreator<ObservabilityLogsExplorerContext, ObservabilityLogsExplorerEvent> =>
  (context, event) =>
  (send) => {
    createLogsExplorerController({
      initialState: { ...context.initialLogsExplorerState, allSelection: context.allSelection },
    }).then((controller) => {
      send({
        type: 'CONTROLLER_CREATED',
        controller,
      });
    });
  };

export const subscribeToLogsExplorerState: InvokeCreator<
  ObservabilityLogsExplorerContext,
  ObservabilityLogsExplorerEvent
> = (context, event) => (send) => {
  if (!('controller' in context)) {
    throw new Error('Failed to subscribe to controller: no controller in context');
  }

  const { controller } = context;

  const subscription = controller.state$.subscribe({
    next: (state) => {
      send({ type: 'LOGS_EXPLORER_STATE_CHANGED', state });
    },
  });

  controller.service.start();

  return () => {
    subscription.unsubscribe();
    controller.service.stop();
  };
};

export const subscribeToLogsExplorerPublicEvents: InvokeCreator<
  ObservabilityLogsExplorerContext,
  ObservabilityLogsExplorerEvent
> = (context) => (send) => {
  if (!('controller' in context)) {
    throw new Error('Failed to subscribe to controller: no controller in context');
  }

  const { controller } = context;

  const subscription = controller.event$.subscribe({
    next: (event: LogsExplorerPublicEvent) => {
      switch (event.type) {
        case 'LOGS_EXPLORER_DATA_RECEIVED':
          send({ type: 'LOGS_EXPLORER_DATA_RECEIVED', rowCount: event.payload.rowCount });
          break;
      }
    },
  });

  controller.service.start();

  return () => {
    subscription.unsubscribe();
  };
};
