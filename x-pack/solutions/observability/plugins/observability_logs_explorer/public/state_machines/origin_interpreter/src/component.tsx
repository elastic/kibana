/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isDevMode } from '@kbn/xstate-utils';
import { useInterpret } from '@xstate/react';
import {
  createOriginInterpreterStateMachine,
  OriginInterpreterStateMachineDependencies,
} from './state_machine';

export const OriginInterpreter: React.FC<OriginInterpreterStateMachineDependencies> = ({
  history,
  toasts,
  ...startServices
}) => {
  useInterpret(
    () =>
      createOriginInterpreterStateMachine({
        history,
        toasts,
        ...startServices,
      }),
    { devTools: isDevMode() }
  );

  return null;
};
