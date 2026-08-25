/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React, { useEffect, useReducer, memo, createContext, useContext, useCallback } from 'react';
import { useIsMounted } from '@kbn/securitysolution-hook-utils';
import type { ConsoleApi } from '../../types';
import type { ConsoleProps } from '../..';
import {
  useSaveInputHistoryToStorage,
  useStoredInputHistory,
} from './hooks/use_stored_input_history';
import { useWithManagedConsoleState } from '../console_manager/console_manager';
import type { InitialStateInterface } from './state_reducer';
import { initiateState, stateDataReducer } from './state_reducer';
import type { ConsoleDataState, ConsoleStore } from './types';

const ConsoleStateContext = createContext<null | ConsoleStore>(null);

type ConsoleStateProviderProps = PropsWithChildren<{}> &
  InitialStateInterface &
  Pick<ConsoleProps, 'apiRef'>;

/**
 * A Console wide data store for internal state management between inner components
 */
export const ConsoleStateProvider = memo<ConsoleStateProviderProps>(
  ({
    commands,
    scrollToBottom,
    keyCapture,
    HelpComponent,
    dataTestSubj,
    storagePrefix,
    managedKey,
    apiRef,
    children,
  }) => {
    const [getConsoleState, storeConsoleState] = useWithManagedConsoleState(managedKey);
    const storedInputHistoryData = useStoredInputHistory(storagePrefix);
    const saveInputHistoryData = useSaveInputHistoryToStorage(storagePrefix);
    const isMounted = useIsMounted();

    const stateInitializer = useCallback(
      (stateInit: InitialStateInterface): ConsoleDataState => {
        const createdInitState = initiateState(
          stateInit,
          getConsoleState ? getConsoleState() : undefined
        );

        createdInitState.input.history = storedInputHistoryData;

        return createdInitState;
      },
      [getConsoleState, storedInputHistoryData]
    );

    const [state, dispatch] = useReducer(
      stateDataReducer,
      { commands, scrollToBottom, keyCapture, HelpComponent, dataTestSubj, storagePrefix },
      stateInitializer
    );

    useEffect(() => {
      state.consoleApi.setInput = (command: string) => {
        if (isMounted()) {
          dispatch({
            type: 'updateInputTextEnteredState',
            payload: {
              leftOfCursorText: command,
              rightOfCursorText: '',
            },
          });
        }
      };

      state.consoleApi.setFocusOnInput = () => {
        if (isMounted()) {
          dispatch({ type: 'addFocusToKeyCapture' });
        }
      };

      if (apiRef) {
        Object.assign((apiRef.current = apiRef.current ?? ({} as ConsoleApi)), state.consoleApi);
      }

      return () => {
        if (!isMounted() && apiRef) {
          apiRef.current = undefined;
        }
      };
    }, [isMounted, apiRef, state.consoleApi]);

    // Anytime `state` changes AND the console is under ConsoleManager's control, then
    // store the console's state to ConsoleManager. This is what enables a console to be
    // closed/re-opened while maintaining the console's content
    useEffect(() => {
      if (storeConsoleState) {
        storeConsoleState(state);
      }
    }, [state, storeConsoleState]);

    // Anytime `input.history` changes and a `storagePrefix` is defined, then persist
    // the input history to storage
    useEffect(() => {
      if (storagePrefix && state.input.history) {
        saveInputHistoryData(state.input.history);
      }
    }, [saveInputHistoryData, state.input.history, storagePrefix]);

    return (
      <ConsoleStateContext.Provider value={{ state, dispatch }}>
        {children}
      </ConsoleStateContext.Provider>
    );
  }
);
ConsoleStateProvider.displayName = 'ConsoleStateProvider';

export const useConsoleStore = (): ConsoleStore => {
  const store = useContext(ConsoleStateContext);

  if (!store) {
    throw new Error(`ConsoleStateContext not defined`);
  }

  return store;
};
