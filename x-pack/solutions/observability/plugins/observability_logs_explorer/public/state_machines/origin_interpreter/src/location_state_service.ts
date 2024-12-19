/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InvokeCreator } from 'xstate';
import { ObservabilityLogsExplorerHistory } from '../../../types';
import { OriginInterpreterContext, OriginInterpreterEvent } from './types';

export const initializeFromLocationState =
  ({
    history,
  }: {
    history: ObservabilityLogsExplorerHistory;
  }): InvokeCreator<OriginInterpreterContext, OriginInterpreterEvent> =>
  (context, event) =>
  (callback) => {
    const origin = history.location?.state?.origin;

    if (!origin) {
      return callback('INITIALIZED_WITH_NO_ORIGIN');
    } else if (origin.id === 'application-log-onboarding') {
      return callback('INITIALIZED_WITH_ONBOARDING_ORIGIN');
    }
  };
