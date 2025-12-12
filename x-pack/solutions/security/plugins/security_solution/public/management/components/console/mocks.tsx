/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable import/no-extraneous-dependencies */

import React, { memo, useEffect } from 'react';
import { EuiCode } from '@elastic/eui';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { act, fireEvent, waitFor, within } from '@testing-library/react';
import { convertToTestId } from './components/command_list';
import { Console } from './console';
import type {
  CommandArgumentValueSelectorProps,
  CommandDefinition,
  CommandExecutionComponent,
  ConsoleProps,
} from './types';
import type { AppContextTestRender } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';

interface ConsoleSelectorsAndActionsMock {
  getLeftOfCursorInputText: () => string;
  getRightOfCursorInputText: () => string;
  getInputText: () => string;
  openHelpPanel: () => void;
  closeHelpPanel: () => void;
  /** Clicks on the submit button on the far right of the console's input area */
  submitCommand: () => void;
  /** Enters a command into the console's input area */
  enterCommand(
    cmd: string,
    options?: Partial<{
      /** If true, the ENTER key will not be pressed */
      inputOnly: boolean;
      /**
       * if true, then the keyboard keys will be used to send the command.
       * Use this if wanting ot press keyboard keys other than letter/punctuation
       */
      useKeyboard: boolean;
    }>
  ): Promise<void>;
}

export interface ConsoleTestSetup
  extends Pick<
    AppContextTestRender,
    'startServices' | 'coreStart' | 'depsStart' | 'queryClient' | 'history'
  > {
  renderConsole(props?: Partial<ConsoleProps>): ReturnType<AppContextTestRender['render']>;

  commands: CommandDefinition[];

  enterCommand: ConsoleSelectorsAndActionsMock['enterCommand'];

  selectors: ConsoleSelectorsAndActionsMock;

  user: UserEvent;
}

/**
 * A set of jest selectors and actions for interacting with the console
 * @param dataTestSubj
 */
export const getConsoleSelectorsAndActionMock = (
  renderResult: ReturnType<AppContextTestRender['render']>,
  user: UserEvent,
  dataTestSubj: string = 'test'
): ConsoleTestSetup['selectors'] => {
  const getLeftOfCursorInputText: ConsoleSelectorsAndActionsMock['getLeftOfCursorInputText'] =
    getInputTextLeftOfCursor.bind(null, renderResult, dataTestSubj);

  const getRightOfCursorInputText: ConsoleSelectorsAndActionsMock['getRightOfCursorInputText'] =
    getInputTextRightOfCursor.bind(null, renderResult, dataTestSubj);

  const getInputText: ConsoleSelectorsAndActionsMock['getInputText'] = getInputTextFullValue.bind(
    null,
    renderResult,
    dataTestSubj
  );

  const isHelpPanelOpen = (): boolean => {
    return Boolean(renderResult.queryByTestId(`${dataTestSubj}-sidePanel-helpContent`));
  };

  const openHelpPanel: ConsoleSelectorsAndActionsMock['openHelpPanel'] = () => {
    if (!isHelpPanelOpen()) {
      act(() => {
        renderResult.getByTestId(`${dataTestSubj}-header-helpButton`).click();
      });
    }
  };

  const closeHelpPanel: ConsoleSelectorsAndActionsMock['closeHelpPanel'] = () => {
    if (isHelpPanelOpen()) {
      act(() => {
        renderResult.getByTestId(`${dataTestSubj}-sidePanel-headerCloseButton`).click();
      });
    }
  };

  const submitCommand: ConsoleSelectorsAndActionsMock['submitCommand'] = () => {
    act(() => {
      renderResult.getByTestId(`${dataTestSubj}-inputTextSubmitButton`).click();
    });
  };

  const enterCommand: ConsoleSelectorsAndActionsMock['enterCommand'] = async (
    cmd,
    options = {}
  ) => {
    await enterConsoleCommand(renderResult, user, cmd, options);
  };

  return {
    getInputText,
    getLeftOfCursorInputText,
    getRightOfCursorInputText,
    openHelpPanel,
    closeHelpPanel,
    submitCommand,
    enterCommand,
  };
};

/**
 * Get the text in the console's input area to the left of the cursor position
 * @param renderResult
 * @param dataTestSubj
 */
const getInputTextLeftOfCursor = (
  renderResult: ReturnType<AppContextTestRender['render']>,
  dataTestSubj: string = 'test'
): string => {
  return renderResult.getByTestId(`${dataTestSubj}-cmdInput-leftOfCursor`).textContent ?? '';
};

/**
 * Get the text in the console's input ara to the right of the cusror position
 * @param renderResult
 * @param dataTestSubj
 */
const getInputTextRightOfCursor = (
  renderResult: ReturnType<AppContextTestRender['render']>,
  dataTestSubj: string = 'test'
): string => {
  return renderResult.getByTestId(`${dataTestSubj}-cmdInput-rightOfCursor`).textContent ?? '';
};

/**
 * Get the full text in the console's input area'
 * @param renderResult
 * @param dataTestSubj
 */
const getInputTextFullValue = (
  renderResult: ReturnType<AppContextTestRender['render']>,
  dataTestSubj: string = 'test'
): string => {
  return (
    getInputTextLeftOfCursor(renderResult, dataTestSubj) +
    getInputTextRightOfCursor(renderResult, dataTestSubj)
  );
};

/**
 * Finds the console in the Render Result and enters the command provided
 * @param renderResult
 * @param cmd
 * @param inputOnly
 * @param useKeyboard
 * @param dataTestSubj
 */
export const enterConsoleCommand = async (
  renderResult: ReturnType<AppContextTestRender['render']>,
  user: UserEvent,
  cmd: string,
  {
    inputOnly = false,
    useKeyboard = false,
    dataTestSubj = 'test',
  }: Partial<{
    inputOnly: boolean;
    useKeyboard: boolean;
    dataTestSubj: string;
  }> = {}
): Promise<void> => {
  const inputTextPriorToKeyboardInput = getInputTextFullValue(renderResult, dataTestSubj);
  const keyCaptureInput = renderResult.getByTestId(`${dataTestSubj}-keyCapture-input`);

  if (keyCaptureInput === null) {
    throw new Error(`No input found with test-subj: ${dataTestSubj}-keyCapture`);
  }

  if (useKeyboard) {
    await user.keyboard(cmd);
  } else {
    await user.type(keyCaptureInput, cmd);
  }

  if (!inputOnly) {
    // user-event v14 has a problem with [Enter] not working on certain inputs
    // so this uses fireEvent instead for the time being.
    // See here for a related discussion: https://github.com/testing-library/user-event/discussions/1164
    // await user.keyboard('[Enter]');
    fireEvent.keyDown(keyCaptureInput, { key: 'enter', keyCode: 13, code: 'Enter' });
  }

  await waitFor(
    () => {
      expect(getInputTextFullValue(renderResult, dataTestSubj)).not.toEqual(
        inputTextPriorToKeyboardInput
      );
    },
    { interval: 1, timeout: 3 }
  ).catch(() => {
    // Ignore errors. We just needed for the console to process state, which can be done async
  });
};

/**
 * Triggers a keyboard event on the console command input for testing purposes. Used mostly
 * when needing to test combination of keys - like `CTRL+a`, etc.
 *
 * @param renderResult - The result from rendering the component using testing-library
 * @param event - The keyboard event object to trigger
 * @param options
 * @param options.dataTestSubj - Optional test subject identifier prefix, defaults to 'test'
 */
export const triggerConsoleCommandInputEvent = async (
  renderResult: ReturnType<AppContextTestRender['render']>,
  event: object,
  { dataTestSubj = 'test' }: Partial<{ dataTestSubj: string }> = {}
): Promise<void> => {
  const keyCaptureInputTestId = `${dataTestSubj}-keyCapture-input`;
  const keyCaptureInput = renderResult.getByTestId(keyCaptureInputTestId);

  if (keyCaptureInput === null) {
    throw new Error(`No input found with test-subj: ${keyCaptureInputTestId}`);
  }

  fireEvent.keyDown(keyCaptureInput, event);
};

export const getConsoleTestSetup = (): ConsoleTestSetup => {
  // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  const mockedContext = createAppRootMockRenderer();
  const { startServices, coreStart, depsStart, queryClient, history } = mockedContext;

  let renderResult: ReturnType<AppContextTestRender['render']>;

  const commandList = getCommandListMock();

  let testSubj: string;

  const renderConsole: ConsoleTestSetup['renderConsole'] = ({
    prompt = '$$>',
    commands = commandList,
    'data-test-subj': dataTestSubj = 'test',
    ...others
  } = {}) => {
    testSubj = dataTestSubj;

    return (renderResult = mockedContext.render(
      <Console prompt={prompt} commands={commands} data-test-subj={dataTestSubj} {...others} />
    ));
  };

  const enterCommand: ConsoleTestSetup['enterCommand'] = async (cmd, options = {}) => {
    await enterConsoleCommand(renderResult, user, cmd, options);
  };

  let selectors: ConsoleSelectorsAndActionsMock;
  const initSelectorsIfNeeded = () => {
    if (selectors) {
      return selectors;
    }

    if (!testSubj) {
      throw new Error(`no 'dataTestSubj' provided to 'render()'!`);
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    selectors = getConsoleSelectorsAndActionMock(renderResult, user, testSubj!);
  };

  return {
    startServices,
    coreStart,
    depsStart,
    queryClient,
    history,
    renderConsole,
    user,
    commands: commandList,
    enterCommand,
    selectors: {
      getInputText: () => {
        initSelectorsIfNeeded();
        return selectors.getInputText();
      },
      getLeftOfCursorInputText: () => {
        initSelectorsIfNeeded();
        return selectors.getLeftOfCursorInputText();
      },
      getRightOfCursorInputText: () => {
        initSelectorsIfNeeded();
        return selectors.getRightOfCursorInputText();
      },
      openHelpPanel: () => {
        initSelectorsIfNeeded();
        return selectors.openHelpPanel();
      },
      closeHelpPanel: () => {
        initSelectorsIfNeeded();
        return selectors.closeHelpPanel();
      },
      submitCommand: () => {
        initSelectorsIfNeeded();
        return selectors.submitCommand();
      },
      enterCommand: (
        cmd: string,
        options?: Partial<{ inputOnly: boolean; useKeyboard: boolean }>
      ) => {
        initSelectorsIfNeeded();
        return selectors.enterCommand(cmd, options);
      },
    },
  };
};

export const getCommandListMock = (): CommandDefinition[] => {
  const RenderComponent: CommandExecutionComponent = ({
    command,
    status,
    setStatus,
    setStore,
    store,
  }) => {
    useEffect(() => {
      if (status !== 'success') {
        new Promise((r) => setTimeout(r, 500)).then(() => {
          setStatus('success');
          setStore((prevState) => {
            return { foo: 'bar' };
          });
        });
      }
    }, [setStatus, setStore, status]);

    return (
      <div data-test-subj="exec-output">
        <div data-test-subj="exec-output-cmdName">{`${command.commandDefinition.name}`}</div>
        <div data-test-subj="exec-output-userInput">{`command input: ${command.input}`}</div>
        <EuiCode data-test-subj="exec-output-argsJson">
          {JSON.stringify(command.args, null, 2)}
        </EuiCode>
        <div>{'Command render state:'}</div>
        <div data-test-subj="exec-output-statusState">{`status: ${status}`}</div>
        <EuiCode data-test-subj="exec-output-storeStateJson">
          {JSON.stringify(store, null, 2)}
        </EuiCode>
      </div>
    );
  };

  const commands: CommandDefinition[] = [
    {
      name: 'cmd1',
      about: 'a command with no options',
      RenderComponent: jest.fn(RenderComponent),
      helpGroupLabel: 'group 1',
    },
    {
      name: 'cmd2',
      about: 'runs cmd 2',
      RenderComponent: jest.fn(RenderComponent),
      helpGroupLabel: 'group 2',
      args: {
        file: {
          about: 'Includes file in the run',
          required: true,
          allowMultiples: false,
          validate: () => {
            return true;
          },
        },
        ext: {
          about: 'optional argument',
          required: false,
          allowMultiples: false,
        },
        bad: {
          about: 'will fail validation',
          required: false,
          allowMultiples: false,
          validate: () => 'This is a bad value',
        },
      },
    },
    {
      name: 'cmd3',
      about: 'allows argument to be used multiple times',
      RenderComponent: jest.fn(RenderComponent),
      helpGroupPosition: 0,
      args: {
        foo: {
          about: 'foo stuff',
          required: true,
          allowMultiples: true,
        },
      },
    },
    {
      name: 'cmd4',
      about: 'all options optional, but at least one is required',
      RenderComponent: jest.fn(RenderComponent),
      mustHaveArgs: true,
      helpGroupPosition: 1,
      args: {
        foo: {
          about: 'foo stuff',
          required: false,
          allowMultiples: true,
        },
        bar: {
          about: 'bar stuff',
          required: false,
          allowMultiples: true,
        },
      },
    },
    {
      name: 'cmd5',
      about: 'has custom hint text',
      RenderComponent: jest.fn(RenderComponent),
      mustHaveArgs: true,
      exampleUsage: 'cmd5 --foo 123',
      exampleInstruction: 'Enter --foo to execute',
      args: {
        foo: {
          about: 'foo stuff',
          required: false,
          allowMultiples: true,
        },
        bar: {
          about: 'bar stuff',
          required: false,
          allowMultiples: true,
        },
      },
    },
    {
      name: 'cmd6',
      about: 'has custom hint text',
      RenderComponent: jest.fn(RenderComponent),
      mustHaveArgs: true,
      exampleUsage: 'cmd6 --foo 123',
      exampleInstruction: 'Enter --foo to execute',
      helpGroupLabel: 'group 1',
      helpGroupPosition: 0,
      helpCommandPosition: 0,
      args: {
        foo: {
          about: 'foo stuff',
          required: false,
          exclusiveOr: true,
          allowMultiples: false,
        },
        bar: {
          about: 'bar stuff',
          required: false,
          exclusiveOr: true,
          allowMultiples: false,
        },
      },
    },
    {
      name: 'cmd7',
      about: 'Command with argument selector',
      RenderComponent: jest.fn(RenderComponent),
      helpGroupLabel: 'group 2',
      args: {
        foo: {
          about: 'foo stuff',
          required: true,
          allowMultiples: true,
          SelectorComponent: ArgumentSelectorComponentMock,
        },
      },
    },
  ];

  return commands;
};

export const ArgumentSelectorComponentMock = memo<
  CommandArgumentValueSelectorProps<{ selection: string }>
>(({ value, valueText, onChange, argName, argIndex }) => {
  useEffect(() => {
    if (!value) {
      onChange({ valueText: 'foo selected', value: { selection: 'foo' } });
    }
  }, [onChange, value]);

  return (
    <span data-test-subj="argSelectorValueText">{`${argName}[${argIndex}]: ${valueText}`}</span>
  );
});
ArgumentSelectorComponentMock.displayName = 'ArgumentSelectorComponentMock';

export interface HelpSidePanelSelectorsAndActions {
  getHelpGroupLabels: () => string[];
  getHelpCommandNames: (forGroup?: string) => string[];
}

export const getHelpSidePanelSelectorsAndActionsMock = (
  renderResult: ReturnType<AppContextTestRender['render']>,
  dataTestSubj: string = 'test'
): HelpSidePanelSelectorsAndActions => {
  const getHelpGroupLabels: HelpSidePanelSelectorsAndActions['getHelpGroupLabels'] = () => {
    // FYI: we're collapsing the labels here because EUI includes mobile elements
    // in the DOM that have the same test ids
    return Array.from(
      new Set(
        renderResult
          .getAllByTestId(`${dataTestSubj}-commandList-group`)
          .map((element) => element.textContent ?? '')
      )
    );
  };

  const getHelpCommandNames: HelpSidePanelSelectorsAndActions['getHelpCommandNames'] = (
    forGroup
  ) => {
    let searchContainer = renderResult.container;

    if (forGroup) {
      searchContainer = renderResult.getByTestId(
        `${dataTestSubj}-commandList-${convertToTestId(forGroup)}`
      );
    }

    return within(searchContainer)
      .getAllByTestId(`${dataTestSubj}-commandList-commandName`)
      .map((commandEle) => commandEle.textContent ?? '');
  };

  return {
    getHelpGroupLabels,
    getHelpCommandNames,
  };
};
