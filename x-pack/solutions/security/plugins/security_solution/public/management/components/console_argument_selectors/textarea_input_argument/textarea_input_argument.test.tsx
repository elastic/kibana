/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { TextareaInputArgumentProps } from './textarea_input_argument';
import {
  HELP_ICON_LABEL,
  CLOSE_POPUP_BUTTON_LABEL,
  NO_INPUT_ENTERED_MESSAGE,
  TEXTAREA_PLACEHOLDER_TEXT,
  OPEN_INPUT,
  TextareaInputArgument,
} from './textarea_input_argument';
import { consoleArgumentValueSelectorMocks } from '../mocks';
import {
  type AppContextTestRender,
  createAppRootMockRenderer,
} from '../../../../common/mock/endpoint';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/react';

describe('TextareaInputArgument component', () => {
  let appTestContext: AppContextTestRender;
  let componentPropsMock: jest.Mocked<TextareaInputArgumentProps>;
  let renderResult: ReturnType<AppContextTestRender['render']>;

  const render = () =>
    (renderResult = appTestContext.render(<TextareaInputArgument {...componentPropsMock} />));

  beforeEach(() => {
    appTestContext = createAppRootMockRenderer();
    componentPropsMock =
      consoleArgumentValueSelectorMocks.buildCommandArgumentValueSelectorProps<TextareaInputArgumentProps>(
        {
          'data-test-subj': 'test',
        }
      );

    // Ensure that the component is re-rendered anytime the onChange callback is called
    const onChangeCallback = componentPropsMock.onChange.getMockImplementation()!;
    componentPropsMock.onChange.mockImplementation((value) => {
      onChangeCallback(value);
      if (renderResult) {
        renderResult.rerender(<TextareaInputArgument {...componentPropsMock} />);
      }
    });
  });

  afterEach(() => {
    // @ts-expect-error
    renderResult = undefined;
  });

  it('should render with default values', () => {
    componentPropsMock.helpContent = 'some content here';
    const { getByTestId } = render();

    expect(getByTestId('test-popoverPanel')).toBeTruthy();
    expect(getByTestId('test-openInputButton').title).toEqual(OPEN_INPUT);
    expect(getByTestId('test-selectionDisplay').textContent).toEqual(NO_INPUT_ENTERED_MESSAGE);
    expect(getByTestId('test-closeButton').textContent).toEqual(CLOSE_POPUP_BUTTON_LABEL);
    expect(getByTestId('test-helpButton').title).toEqual(HELP_ICON_LABEL);
    expect(getByTestId('test-title').textContent).toEqual('foo'); // << Default is the argument name
    expect((getByTestId('test-textarea') as HTMLTextAreaElement).placeholder).toEqual(
      TEXTAREA_PLACEHOLDER_TEXT
    );
  });

  it('should render with customized values', () => {
    componentPropsMock.helpContent = 'some content here';
    Object.assign(componentPropsMock, {
      openLabel: 'openLabel',
      noInputEnteredMessage: 'noInputEnteredMessage',
      textareaPlaceholderLabel: 'textareaPlaceholderLabel',
      helpIconLabel: 'helpIconLabel',
      closePopupButtonLabel: 'closePopupButtonLabel',
      textareaLabel: 'textareaLabel',
    });
    const { getByTestId } = render();

    expect(getByTestId('test-openInputButton').title).toEqual(componentPropsMock.openLabel);
    expect(getByTestId('test-selectionDisplay').textContent).toEqual(
      componentPropsMock.noInputEnteredMessage
    );
    expect(getByTestId('test-closeButton').textContent).toEqual(
      componentPropsMock.closePopupButtonLabel
    );
    expect(getByTestId('test-helpButton').title).toEqual(componentPropsMock.helpIconLabel);
    expect(getByTestId('test-title').textContent).toEqual(componentPropsMock.textareaLabel);
    expect((getByTestId('test-textarea') as HTMLTextAreaElement).placeholder).toEqual(
      componentPropsMock.textareaPlaceholderLabel
    );
  });

  it('should toggle popup open/close when selection area is clicked', async () => {
    const { queryByTestId, getByTestId } = render();

    // Default: popup is initially opened
    expect(queryByTestId('test-popoverPanel')).not.toBeNull();

    // Close by clicking the area that shows the selected/defined value for the arg
    await userEvent.click(getByTestId('test-selectionDisplay'));

    expect(componentPropsMock.onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        store: expect.objectContaining({ isPopoverOpen: false }),
      })
    );

    await waitFor(() => {
      expect(queryByTestId('test-popoverPanel')).toBeNull();
    });

    // Now, open it back up by using the pencil icon button
    await userEvent.click(getByTestId('test-openInputButton'));

    expect(componentPropsMock.onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        store: expect.objectContaining({ isPopoverOpen: true }),
      })
    );

    await waitFor(() => {
      expect(queryByTestId('test-popoverPanel')).not.toBeNull();
    });
  });

  it('should only send user input for display (valueText) to console when popup is closed', async () => {
    const { getByTestId } = render();

    await userEvent.type(getByTestId('test-textarea'), 'some user input');

    expect(componentPropsMock.onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        value: 'some user input', // << Value is always updated as the user types
        valueText: '',
      })
    );

    await userEvent.click(getByTestId('test-closeButton'));

    await waitFor(() => {
      expect(componentPropsMock.onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          valueText: 'some user input', // << but the display value (in the console's input area) is only updated once the popup is closed
        })
      );
    });
  });

  it('should render message when argument is not allowed to be used more than once', async () => {
    componentPropsMock.argIndex = 1;
    componentPropsMock.command.commandDefinition.args![componentPropsMock.argName].allowMultiples =
      false;

    const { getByTestId } = render();

    expect(getByTestId('test-noMultipleArgs')).toBeTruthy();
  });

  it('should show help content when help icon is clicked', async () => {
    componentPropsMock.helpContent = 'some content here';
    const { getByTestId } = render();

    await userEvent.click(getByTestId('test-helpButton'));

    expect(getByTestId('test-helpContent').textContent).toEqual(componentPropsMock.helpContent);
  });

  it('should show disabled help icon when showHelpIcon is false', async () => {
    componentPropsMock.showHelpIcon = false;
    const { getByTestId } = render();

    expect((getByTestId('test-helpButton') as HTMLButtonElement).disabled).toEqual(true);
  });
});
