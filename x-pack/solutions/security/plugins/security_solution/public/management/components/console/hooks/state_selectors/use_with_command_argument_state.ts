/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useConsoleStore } from '../../components/console_state/console_state';
import type { ArgSelectorState } from '../../components/console_state/types';

/**
 * Returns the Command argument state for a given argument name. Should be used ONLY when a
 * command has been entered that matches a `CommandDefinition`
 * @param argName
 * @param instance
 */
export const useWithCommandArgumentState = (
  argName: string,
  instance: number
): ArgSelectorState => {
  const enteredCommand = useConsoleStore().state.input.enteredCommand;

  return useMemo(() => {
    const argInstanceState = enteredCommand?.argState[argName]?.at(instance);

    return (
      argInstanceState ?? {
        value: undefined,
        valueText: '',
      }
    );
  }, [argName, enteredCommand, instance]);
};
