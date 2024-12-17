/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Dispatch, Reducer } from 'react';
import type { ParsedCommandInterface } from '../../service/types';
import type { CommandInputProps } from '../command_input';
import type {
  Command,
  CommandDefinition,
  CommandExecutionComponent,
  CommandArgDefinition,
} from '../../types';

export interface ConsoleDataState {
  /**
   * Commands available in the console, which includes both the builtin command and the ones
   * defined on input to the `Console` component by consumers of the component
   */
  commands: CommandDefinition[];

  /** UI function that scrolls the console down to the bottom */
  scrollToBottom: () => void;

  /** UI interface that places allows interaction with the `KeyCapture` component */
  keyCapture: CommandInputProps['focusRef'];

  /**
   * List of commands entered by the user and being shown in the UI
   */
  commandHistory: CommandHistoryItem[];

  sidePanel: {
    show: null | 'help'; // will have other values in the future
  };

  /** Component defined on input to the Console that will handle the `help` command */
  HelpComponent?: CommandExecutionComponent;

  dataTestSubj?: string;

  /** The local storage prefix for saving/persisting data associated with the console */
  storagePrefix?: string;

  /** The key for the console when it is under ConsoleManager control */
  managedKey?: symbol;

  /** content for the console's footer area */
  footerContent: string;

  /** state for the command input area */
  input: {
    /**
     * The left side of the cursor text entered by the user
     */
    leftOfCursorText: string;

    /**
     * The right side of the cursor text entered by the user
     */
    rightOfCursorText: string;

    /**
     * The parsed user input
     */
    parsedInput: ParsedCommandInterface;

    /** The entered command. Only defined if the command is "known" */
    enteredCommand: undefined | EnteredCommand;

    /** Placeholder text for the input area **/
    placeholder: string;

    /** A history of commands entered by the user */
    history: InputHistoryItem[];

    /** Show the input area popover */
    showPopover: 'input-history' | undefined; // Other values will exist in the future

    /** The state of the input area. Set to `error` if wanting to show it as being in error state */
    visibleState: 'error' | undefined;
  };
}

/** State that is provided/received to Argument Value Selectors */
export interface ArgSelectorState<TState = any> {
  value: any;
  valueText: string | undefined;
  /**
   * A store (data) for the Argument Selector Component so that it can persist state between
   * re-renders or between console being opened/closed
   */
  store?: TState;
}

export interface EnteredCommand {
  commandDefinition: CommandDefinition;

  /** keeps a list of arguments definitions that are defined with a Value Selector component */
  argsWithValueSelectors: undefined | Record<string, CommandArgDefinition>;

  argState: {
    // Each arg has an array (just like the parsed input) and keeps the
    // state that is provided to that instance of the argument on the input.
    [argName: string]: ArgSelectorState[];
  };
}

export interface InputHistoryItem {
  id: string;
  /** The command that will be used internally if entry is selected again from the popup */
  input: string;
  /** The display value in the UI's input history popup */
  display: string;
}

export interface CommandHistoryItem {
  id: string;
  enteredAt: string;
  isValid: boolean;
  command: Command;
  state: CommandExecutionState;
}

export interface CommandExecutionState {
  status: 'pending' | 'success' | 'error';
  store: Record<string, unknown>;
}

export interface ExecuteCommandPayload {
  input: string;
  parsedInput: ParsedCommandInterface;
  enteredCommand: ConsoleDataState['input']['enteredCommand'];
}

export type ConsoleDataAction =
  | { type: 'scrollDown' }
  | { type: 'addFocusToKeyCapture' }
  | { type: 'removeFocusFromKeyCapture' }
  | {
      type: 'executeCommand';
      payload: ExecuteCommandPayload;
    }
  | { type: 'clear' }
  | {
      type: 'showSidePanel';
      payload: { show: ConsoleDataState['sidePanel']['show'] };
    }
  | {
      type: 'updateFooterContent';
      payload: { value: string };
    }
  | {
      type: 'updateCommandStoreState';
      payload: {
        id: string;
        value: (prevState: CommandExecutionState['store']) => CommandExecutionState['store'];
      };
    }
  | {
      type: 'updateCommandStatusState';
      payload: { id: string; value: CommandExecutionState['status'] };
    }
  | {
      type: 'updateInputTextEnteredState';
      payload: PayloadValueOrFunction<
        Pick<ConsoleDataState['input'], 'leftOfCursorText' | 'rightOfCursorText'> & {
          /** updates (if necessary) to any of the argument's state */
          argState?: Record<string, ArgSelectorState[]>;
        },
        ConsoleDataState['input']
      >;
    }
  | {
      type: 'updateInputPopoverState';
      payload: {
        show: ConsoleDataState['input']['showPopover'];
      };
    }
  | {
      type: 'updateInputPlaceholderState';
      payload: {
        placeholder: ConsoleDataState['input']['placeholder'];
      };
    }
  | {
      type: 'setInputState';
      payload: {
        value: ConsoleDataState['input']['visibleState'];
      };
    }
  | {
      type: 'updateInputHistoryState';
      payload: {
        /** The command that will be used internally if entry is selected again from the popup */
        command: string;
        /** The display value in the UI's input history popup. Defaults to `command` */
        display?: string;
      };
    }
  | {
      type: 'updateInputCommandArgState';
      payload: {
        /** Name of argument */
        name: string;
        /** Instance of the argument */
        instance: number;
        /** The updated state for the argument */
        state: ArgSelectorState;
      };
    }
  | {
      type: 'clearInputHistoryState';
      payload?: never;
    };

type PayloadValueOrFunction<T extends object = object, TCallbackArgs extends object = object> =
  | T
  | ((options: TCallbackArgs) => T);

export interface ConsoleStore {
  state: ConsoleDataState;
  dispatch: Dispatch<ConsoleDataAction>;
}

export type ConsoleStoreReducer<A extends ConsoleDataAction = ConsoleDataAction> = Reducer<
  ConsoleDataState,
  A
>;
