/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Subject } from 'rxjs';
import type { LogsExplorerPublicEvent } from '../../../controller/types';
import type { LogsExplorerControllerContext, LogsExplorerControllerEvent } from './types';

export const createDataReceivedEventEmitter = (publicEvents$: Subject<LogsExplorerPublicEvent>) => {
  return (context: LogsExplorerControllerContext, event: LogsExplorerControllerEvent) => {
    if (
      event.type === 'RECEIVE_DISCOVER_DATA_STATE' &&
      'dataState' in event &&
      event.dataState?.length !== undefined &&
      event.dataState.length > 0
    ) {
      publicEvents$.next({
        type: 'LOGS_EXPLORER_DATA_RECEIVED',
        payload: {
          rowCount: event.dataState.length,
        },
      });
    }
  };
};
