/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDevToolsOptions } from '@kbn/xstate-utils';
import { useInterpret } from '@xstate/react';
import createContainer from 'constate';
import {
  createObservabilityLogsExplorerStateMachine,
  ObservabilityLogsExplorerStateMachineDependencies,
} from './state_machine';

export const useObservabilityLogsExplorerPageState = (
  deps: ObservabilityLogsExplorerStateMachineDependencies
) => {
  const observabilityLogsExplorerPageStateService = useInterpret(
    () => createObservabilityLogsExplorerStateMachine(deps),
    { devTools: getDevToolsOptions() }
  );

  return observabilityLogsExplorerPageStateService;
};

export const [
  ObservabilityLogsExplorerPageStateProvider,
  useObservabilityLogsExplorerPageStateContext,
] = createContainer(useObservabilityLogsExplorerPageState);
