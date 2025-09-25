/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MouseEventHandler } from 'react';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CommonProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiButtonIcon, EuiResizeObserver } from '@elastic/eui';
import styled from 'styled-components';
import classNames from 'classnames';
import type { EuiResizeObserverProps } from '@elastic/eui/src/components/observer/resize_observer/resize_observer';
import { InputDisplay } from './components/input_display';
import type { ExecuteCommandPayload, ConsoleDataState } from '../console_state/types';
import { useWithInputShowPopover } from '../../hooks/state_selectors/use_with_input_show_popover';
import { EnteredInput } from './lib/entered_input';
import type { InputCaptureProps } from './components/input_capture';
import { InputCapture } from './components/input_capture';
import { useWithInputVisibleState } from '../../hooks/state_selectors/use_with_input_visible_state';
import { useInputHints } from './hooks/use_input_hints';
import { InputPlaceholder } from './components/input_placeholder';
import { useWithInputTextEntered } from '../../hooks/state_selectors/use_with_input_text_entered';
import { InputAreaPopover } from './components/input_area_popover';
import { useConsoleStateDispatch } from '../../hooks/state_selectors/use_console_state_dispatch';
import { useTestIdGenerator } from '../../../../hooks/use_test_id_generator';
import { useDataTestSubj } from '../../hooks/state_selectors/use_data_test_subj';
import { useWithCommandList } from '../../hooks/state_selectors/use_with_command_list';
import { detectAndPreProcessPastedCommand } from './lib/utils';
const CommandInputContainer = styled.div`
  background-color: ${({ theme: { eui } }) => eui.euiFormBackgroundColor};
  border-radius: ${({ theme: { eui } }) => eui.euiBorderRadius};
  padding: ${({ theme: { eui } }) => eui.euiSizeS};
  outline: ${({ theme: { eui } }) => eui.euiBorderThin};

  &:focus-within {
    border-bottom: ${({ theme: { eui } }) => eui.euiBorderThick};
    border-bottom-color: ${({ theme: { eui } }) => eui.euiColorPrimary};
  }

  &.error {
    border-bottom-color: ${({ theme: { eui } }) => eui.euiColorDanger};
  }

  .textEntered {
    white-space: break-spaces;
  }

  .prompt {
    padding-right: 1ch;
  }

  &.withPopover {
    border-top-left-radius: 0;
    border-top-right-radius: 0;
  }

  &.hasFocus {
    // Cursor is defined in '<InputDisplay>' component
    .cursor {
      background-color: ${({ theme: { eui } }) => eui.euiTextColor};
      animation: cursor-blink-animation 1s steps(5, start) infinite;
      -webkit-animation: cursor-blink-animation 1s steps(5, start) infinite;

      @keyframes cursor-blink-animation {
        to {
          visibility: hidden;
        }
      }
      @-webkit-keyframes cursor-blink-animation {
        to {
          visibility: hidden;
        }
      }
    }
  }
`;

export interface CommandInputProps extends CommonProps {
  prompt?: string;
  isWaiting?: boolean;
  focusRef?: InputCaptureProps['focusRef'];
}

export const CommandInput = memo<CommandInputProps>(({ prompt = '', focusRef, ...commonProps }) => {
  useInputHints();
  const getTestId = useTestIdGenerator(useDataTestSubj());
  const dispatch = useConsoleStateDispatch();
  const commands = useWithCommandList();
  const { rightOfCursorText, leftOfCursorText, fullTextEntered, enteredCommand, parsedInput } =
    useWithInputTextEntered();
  const visibleState = useWithInputVisibleState();
  const isPopoverOpen = !!useWithInputShowPopover();

  const [isKeyInputBeingCaptured, setIsKeyInputBeingCaptured] = useState(false);
  const [commandToExecute, setCommandToExecute] = useState<ExecuteCommandPayload | undefined>(
    undefined
  );
  const [popoverWidth, setPopoverWidth] = useState('94vw');

  const _focusRef: InputCaptureProps['focusRef'] = useRef(null);
  const keyCaptureFocusRef = focusRef || _focusRef;

  const inputContainerClassname = useMemo(() => {
    return classNames({
      cmdInput: true,
      hasFocus: isKeyInputBeingCaptured,
      error: visibleState === 'error',
      withPopover: isPopoverOpen,
    });
  }, [isKeyInputBeingCaptured, isPopoverOpen, visibleState]);

  const disableArrowButton = useMemo(() => fullTextEntered.trim().length === 0, [fullTextEntered]);

  const userInput = useMemo(() => {
    return new EnteredInput(leftOfCursorText, rightOfCursorText, parsedInput, enteredCommand);
  }, [enteredCommand, leftOfCursorText, parsedInput, rightOfCursorText]);

  const handleOnResize = useCallback<EuiResizeObserverProps['onResize']>(({ width }) => {
    if (width > 0) {
      setPopoverWidth(`${width}px`);
    }
  }, []);

  const handleSubmitButton = useCallback<MouseEventHandler>(() => {
    setCommandToExecute({
      input: userInput.getFullText(true),
      enteredCommand,
      parsedInput,
    });
  }, [enteredCommand, parsedInput, userInput]);

  const handleOnChangeFocus = useCallback<NonNullable<InputCaptureProps['onChangeFocus']>>(
    (hasFocus) => {
      setIsKeyInputBeingCaptured(hasFocus);
    },
    []
  );

  const handleTypingAreaClick = useCallback<MouseEventHandler>(
    (ev) => {
      if (keyCaptureFocusRef.current) {
        keyCaptureFocusRef.current.focus();
      }

      if (isPopoverOpen) {
        dispatch({ type: 'updateInputPopoverState', payload: { show: undefined } });
      }
    },
    [dispatch, isPopoverOpen, keyCaptureFocusRef]
  );

  const handleInputCapture = useCallback<InputCaptureProps['onCapture']>(
    ({ value, selection, eventDetails }) => {
      const key = eventDetails.code;

      // UP arrow key
      if (key === 'ArrowUp') {
        dispatch({ type: 'removeFocusFromKeyCapture' });
        dispatch({ type: 'updateInputPopoverState', payload: { show: 'input-history' } });

        return;
      }

      // Handle any input value by pre-processing selector arguments (paste, history, etc.)
      let processedValue = value;
      let extractedArgState: Record<string, Array<{ value: string; valueText: string }>> = {};

      if (value) {
        const preProcessResult = detectAndPreProcessPastedCommand(value, commands);
        if (preProcessResult.hasSelectorArguments) {
          processedValue = preProcessResult.cleanedCommand;
          extractedArgState = preProcessResult.extractedArgState;
        }
      }

      // Update the store with the updated text that was entered
      dispatch({
        type: 'updateInputTextEnteredState',
        payload: ({
          leftOfCursorText: prevLeftOfCursor,
          rightOfCursorText: prevRightOfCursor,
          enteredCommand: prevEnteredCommand,
          parsedInput: prevParsedInput,
        }) => {
          const inputText = new EnteredInput(
            prevLeftOfCursor,
            prevRightOfCursor,
            prevParsedInput,
            prevEnteredCommand
          );

          inputText.addValue(processedValue ?? '', selection);

          switch (key) {
            // BACKSPACE
            case 'Backspace':
              inputText.backspaceChar(selection);
              break;

            // DELETE
            case 'Delete':
              inputText.deleteChar(selection);
              break;

            // ENTER = Execute command and blank out the input area
            case 'Enter':
              setCommandToExecute({
                input: inputText.getFullText(true),
                enteredCommand: prevEnteredCommand as ConsoleDataState['input']['enteredCommand'],
                parsedInput: prevParsedInput as ConsoleDataState['input']['parsedInput'],
              });
              inputText.clear();
              break;

            // ARROW LEFT
            case 'ArrowLeft':
              inputText.moveCursorTo('left');
              break;

            // ARROW RIGHT
            case 'ArrowRight':
              inputText.moveCursorTo('right');
              break;

            // HOME
            case 'Home':
              inputText.moveCursorTo('home');
              break;

            // END
            case 'End':
              inputText.moveCursorTo('end');
              break;
          }

          return {
            leftOfCursorText: inputText.getLeftOfCursorText(),
            rightOfCursorText: inputText.getRightOfCursorText(),
            argState: {
              ...inputText.getArgState(),
              ...extractedArgState,
            },
          };
        },
      });
    },
    [commands, dispatch]
  );

  // Execute the command if one was ENTER'd.
  useEffect(() => {
    if (commandToExecute) {
      dispatch({ type: 'executeCommand', payload: commandToExecute });
      setCommandToExecute(undefined);

      // reset input
      dispatch({
        type: 'updateInputTextEnteredState',
        payload: {
          leftOfCursorText: '',
          rightOfCursorText: '',
        },
      });
    }
  }, [commandToExecute, dispatch]);

  return (
    <InputAreaPopover width={popoverWidth}>
      <EuiResizeObserver onResize={handleOnResize}>
        {(resizeRef) => {
          return (
            <CommandInputContainer
              {...commonProps}
              className={inputContainerClassname}
              onClick={handleTypingAreaClick}
              ref={resizeRef}
              data-test-subj={getTestId('cmdInput-container')}
            >
              <EuiFlexGroup responsive={false} alignItems="center" gutterSize="none">
                {prompt && (
                  <EuiFlexItem grow={false} data-test-subj={getTestId('cmdInput-prompt')}>
                    <span className="eui-displayInlineBlock prompt">{prompt}</span>
                  </EuiFlexItem>
                )}
                <EuiFlexItem className="textEntered">
                  <InputCapture
                    onCapture={handleInputCapture}
                    onChangeFocus={handleOnChangeFocus}
                    focusRef={focusRef}
                  >
                    <InputDisplay
                      leftOfCursor={userInput.getLeftOfCursorRenderingContent()}
                      rightOfCursor={userInput.getRightOfCursorRenderingContent()}
                    />
                  </InputCapture>
                  <InputPlaceholder />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    data-test-subj={getTestId('inputTextSubmitButton')}
                    aria-label="submit-command"
                    iconType="playFilled"
                    color="primary"
                    isDisabled={disableArrowButton}
                    onClick={handleSubmitButton}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </CommandInputContainer>
          );
        }}
      </EuiResizeObserver>
    </InputAreaPopover>
  );
});
CommandInput.displayName = 'CommandInput';
