/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { act, fireEvent } from '@testing-library/react';
import { EndpointScriptEditForm, type EndpointScriptEditFormProps } from './script_edit_form';
import {
  createAppRootMockRenderer,
  type AppContextTestRender,
} from '../../../../../../common/mock/endpoint';
import { EndpointScriptsGenerator } from '../../../../../../../common/endpoint/data_generators/endpoint_scripts_generator';

describe('EndpointScriptEditForm', () => {
  let render: (props?: EndpointScriptEditFormProps) => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;
  let scriptsGenerator: EndpointScriptsGenerator;
  let defaultProps: EndpointScriptEditFormProps;
  let onChangeMock: jest.Mock;

  beforeEach(() => {
    scriptsGenerator = new EndpointScriptsGenerator('scripts-library-tests');
    mockedContext = createAppRootMockRenderer();

    onChangeMock = jest.fn();
    defaultProps = {
      onChange: onChangeMock,
      'data-test-subj': 'test',
    };

    render = (props?: EndpointScriptEditFormProps) => {
      renderResult = mockedContext.render(<EndpointScriptEditForm {...(props ?? defaultProps)} />);
      return renderResult;
    };
  });

  it('renders renders form elements correctly', () => {
    render();

    const { getByTestId } = renderResult;

    expect(getByTestId('test')).toBeInTheDocument();
    const rows = renderResult.getAllByTestId(/test-.*-row/);
    expect(rows.length).toBe(9);

    // file and checkbox don't have labels
    expect(getByTestId('test-file-picker-row')).toBeInTheDocument();
    expect(getByTestId('test-requires-input-row')).toBeInTheDocument();

    const visibleRowLabels = rows
      .map((row) => row.querySelector('.euiFormLabel h5')?.textContent)
      .filter((label) => !!label);

    expect(visibleRowLabels).toEqual([
      'Name',
      'Operating systems',
      'Types',
      'Path to executable file (only for archive files)',
      'Description',
      'Instructions',
      'Examples',
    ]);
  });

  it('does not call onChange on initial render', () => {
    render();

    expect(onChangeMock).not.toHaveBeenCalled();
  });

  it('calls onChange when form values are changed', async () => {
    render();

    const { getByTestId } = renderResult;

    const nameInput = getByTestId('test-name-row').querySelector('input') as HTMLInputElement;
    await userEvent.click(nameInput);
    await userEvent.paste('New Script Name');

    expect(onChangeMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        script: expect.objectContaining({
          name: 'New Script Name',
        }),
        hasFormChanged: true,
      })
    );
  });

  describe('Creating/Editing', () => {
    beforeEach(() => {
      render();
    });

    it('shows file picker when no scriptItem is provided', () => {
      const { getByTestId } = renderResult;

      const fileInput = getByTestId('test-file-picker');
      expect(fileInput).toBeInTheDocument();
    });

    it('shows file name when file is uploaded', async () => {
      const { getByTestId, getByText } = renderResult;

      const fileInput = getByTestId('test-file-picker');
      await userEvent.upload(fileInput, [
        new File(['test'], 'test.sh', { type: 'application/txt' }),
      ]);
      expect(await getByText('test.sh')).toBeInTheDocument();
    });

    it('shows required validation error when `File` is not selected', async () => {
      const { getByTestId } = renderResult;

      const filePickerRow = getByTestId('test-file-picker-row');
      const fileInput = getByTestId('test-file-picker');
      await userEvent.click(fileInput);
      // Pressing Escape key to close the file picker dropdown that appears after clicking the file input
      // so no file is selected and the validation error is triggered
      await userEvent.keyboard('{Escape}');

      expect(fileInput).toHaveAttribute('aria-invalid', 'true');
      const euiFormErrorText = filePickerRow.querySelector('.euiFormErrorText');
      expect(euiFormErrorText?.textContent).toEqual('A script file is required.');
      // form has not changed yet, so onChange should not be called
      expect(onChangeMock).not.toHaveBeenCalled();
    });

    it('shows required validation error when `Name` input is blurred (with empty value)', async () => {
      const { getByTestId } = renderResult;

      const nameRow = getByTestId('test-name-row');
      const nameInput = getByTestId('test-name-input');
      await userEvent.type(nameInput, ' ');
      await userEvent.tab();

      expect(nameInput).toHaveAttribute('aria-invalid', 'true');
      const euiFormErrorText = nameRow.querySelector('.euiFormErrorText');
      expect(euiFormErrorText?.textContent).toEqual('Name is required.');
      expect(onChangeMock).toHaveBeenCalledWith(
        expect.objectContaining({
          script: expect.objectContaining({
            name: '',
          }),
          hasFormChanged: true,
        })
      );
    });

    it('shows required validation error when `Operating systems` input is blurred (with no selection)', async () => {
      const { getByTestId, container } = renderResult;

      const nameInput = getByTestId('test-name-input');
      const comboboxInput = container.querySelector(
        '[data-test-subj="comboBoxSearchInput"]'
      ) as HTMLInputElement;
      expect(comboboxInput.getAttribute('aria-autocomplete')).toEqual('list');
      // Click on the combobox to open it
      await userEvent.click(comboboxInput);
      // click on name input to trigger blur event on platforms input without selecting any option
      await userEvent.click(nameInput);

      expect(comboboxInput).toHaveAttribute('aria-invalid', 'true');
      const platformsRow = getByTestId('test-platforms-row');
      const errorInfoElement = platformsRow.querySelector('.euiFormErrorText');
      expect(errorInfoElement?.textContent).toEqual(
        'At least one operating system must be selected.'
      );
      expect(onChangeMock).not.toHaveBeenCalled();
    });

    it('should trigger form `isValid: true` when required fields are filled', async () => {
      const { getByTestId, container } = renderResult;

      const filePicker = getByTestId('test-file-picker');
      const nameInput = getByTestId('test-name-input');

      const testFile = new File(['--test--file--'], 'file.sh', { type: 'application/txt' });
      await userEvent.upload(filePicker, [testFile]);
      await userEvent.click(nameInput);
      await userEvent.paste('Test Script');

      // Select first option from platforms combobox dropdown
      const comboboxInput = container.querySelector(
        '[data-test-subj="comboBoxSearchInput"]'
      ) as HTMLInputElement;
      await userEvent.click(comboboxInput);
      await userEvent.keyboard('{ArrowDown}{Enter}');

      expect(onChangeMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          script: expect.objectContaining({
            fileName: 'file.sh',
            name: 'Test Script',
            platform: ['linux'],
          }),
          isValid: true,
          hasFormChanged: true,
        })
      );
    });

    it.each([
      ['description', "Provide a brief description of the script's functionality."],
      ['instructions', 'Provide step-by-step instructions on how to use or execute the script.'],
      ['example', 'Provide examples of how to use the script.'],
    ])('shows help text for `%s` field', (name, expectedText) => {
      const { getByTestId } = renderResult;

      expect(
        getByTestId(`test-${name}-row`).querySelector('.euiFormHelpText')?.textContent
      ).toEqual(expectedText);
    });

    it.each([
      ['tags', 'Types optional'],
      ['description', 'Description optional'],
      ['instructions', 'Instructions optional'],
      ['example', 'Examples optional'],
    ])('should show `optional` label for `%s` field', (name, expectedText) => {
      const { getByTestId } = renderResult;

      const label = getByTestId(`test-${name}-row`).querySelector('.euiFormRow__labelWrapper');
      expect(label?.textContent).toEqual(expectedText);
    });

    it('should show tooltip for requiresInput field', () => {
      const { getByTestId } = renderResult;

      const requiresInputDetailItem = getByTestId('test-requires-input-row');
      const tooltipIcon = requiresInputDetailItem.querySelector('.euiToolTipAnchor');
      expect(tooltipIcon).toBeInTheDocument();
    });

    it('should show tooltip for pathToExecutable field', () => {
      const { getByTestId } = renderResult;

      const pathToExecutableDetailItem = getByTestId('test-path-to-executable-row');
      const tooltipIcon = pathToExecutableDetailItem.querySelector('.euiToolTipAnchor');
      expect(tooltipIcon).toBeInTheDocument();
    });
  });

  describe('Editing', () => {
    beforeEach(() => {
      const scriptItem = scriptsGenerator.generate({
        name: 'Test Script',
        id: 'test-script-id',
        fileName: 'test_script.sh',
        description: 'Test description',
        instructions: 'Test instructions',
        example: 'Test example',
      });
      render({ ...defaultProps, scriptItem });
    });

    it('shows fake file picker when scriptItem is defined', () => {
      const { getByTestId } = renderResult;

      const filePicker = getByTestId('test-fake-file-picker');
      expect(filePicker).toBeInTheDocument();
      expect(filePicker.querySelector('.euiText')?.textContent).toEqual('test_script.sh');
    });

    it('allows removing fake file picker when editing a script', async () => {
      const { getByTestId, queryByTestId } = renderResult;

      const filePicker = getByTestId('test-fake-file-picker');
      expect(filePicker).toBeInTheDocument();

      const removeFileButton = getByTestId('test-remove-file-button');
      await userEvent.click(removeFileButton);

      expect(queryByTestId('test-fake-file-picker')).not.toBeInTheDocument();
      expect(onChangeMock).toHaveBeenCalledWith(
        expect.objectContaining({
          script: expect.objectContaining({
            file: undefined,
          }),
          hasFormChanged: true,
        })
      );
      // shows real file picker after removing fake file picker
      expect(getByTestId('test-file-picker')).toBeInTheDocument();
      expect(filePicker.querySelector('.euiText')?.textContent).toEqual('test_script.sh');
    });

    it('should show file required validation error when fake file picker is removed (and no file is uploaded)', () => {
      const { getByTestId } = renderResult;

      const removeFileButton = getByTestId('test-remove-file-button');
      act(() => {
        fireEvent.click(removeFileButton);
      });

      const fileInput = getByTestId('test-file-picker');
      expect(fileInput).toHaveAttribute('aria-invalid', 'true');
      const filePickerRow = getByTestId('test-file-picker-row');
      const euiFormErrorText = filePickerRow.querySelector('.euiFormErrorText');
      expect(euiFormErrorText?.textContent).toEqual('A script file is required.');
      expect(onChangeMock).toHaveBeenCalledWith(
        expect.objectContaining({
          script: expect.objectContaining({
            file: undefined,
          }),
          hasFormChanged: true,
        })
      );
    });

    it.each([
      ['description', "Provide a brief description of the script's functionality."],
      ['instructions', 'Provide step-by-step instructions on how to use or execute the script.'],
      ['example', 'Provide examples of how to use the script.'],
    ])(
      'shows help text for `%s` field when the field is changed to empty',
      async (name, expectedText) => {
        const { getByTestId } = renderResult;

        const input = getByTestId(`test-${name}-input`);
        await userEvent.clear(input);

        expect(
          getByTestId(`test-${name}-row`).querySelector('.euiFormHelpText')?.textContent
        ).toEqual(expectedText);
      }
    );
  });
});
