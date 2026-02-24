/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor } from '@testing-library/react';
import { EndpointScriptEditForm, type EndpointScriptEditFormProps } from './script_edit_form';
import {
  createAppRootMockRenderer,
  type AppContextTestRender,
} from '../../../../../../common/mock/endpoint';
import { EndpointScriptsGenerator } from '../../../../../../../common/endpoint/data_generators/endpoint_scripts_generator';
import userEvent from '@testing-library/user-event';

// Failing: See https://github.com/elastic/kibana/issues/254680
describe.skip('EndpointScriptEditForm', () => {
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

  it('calls onChange when form values are changed', () => {
    render();

    const { getByTestId } = renderResult;

    const nameInput = getByTestId('test-name-row').querySelector('input') as HTMLInputElement;
    userEvent.type(nameInput, 'New Script Name');
    userEvent.tab();

    waitFor(() => {
      expect(onChangeMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          script: expect.objectContaining({
            name: 'New Script Name',
          }),
          hasFormChanged: true,
        })
      );
    });
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

    it('shows file picker when file is uploaded', () => {
      const { getByTestId } = renderResult;

      const fileInputRow = getByTestId('test-file-picker-row');
      const fileInput = getByTestId('test-file-picker');
      userEvent.upload(fileInput, [new File(['test'], 'test.sh', { type: 'application/txt' })]);
      userEvent.tab();

      waitFor(() => {
        expect(fileInputRow.querySelector('.euiFilePicker__promptText')).toHaveValue('test.sh');
      });
    });

    it('shows required validation error when `file` is not selected', () => {
      const { getByTestId } = renderResult;

      const filePickerRow = getByTestId('test-file-picker-row');
      const fileInput = getByTestId('test-file-picker');
      userEvent.click(fileInput);
      userEvent.tab();

      waitFor(() => {
        expect(fileInput).toHaveAttribute('aria-invalid', 'true');
        const euiFormErrorText = filePickerRow.querySelector('.euiFormErrorText');
        expect(euiFormErrorText?.textContent).toEqual('A script file is required.');
        expect(onChangeMock).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            script: expect.objectContaining({
              file: undefined,
            }),
            hasFormChanged: true,
          })
        );
      });
    });

    it('shows required validation error when `name` input is blurred (with empty value)', () => {
      const { getByTestId } = renderResult;

      const nameRow = getByTestId('test-name-row');
      const nameInput = getByTestId('test-name-input');
      userEvent.type(nameInput, ' ');
      userEvent.tab();

      waitFor(() => {
        expect(nameInput).toHaveAttribute('aria-invalid', 'true');
        const euiFormErrorText = nameRow.querySelector('.euiFormErrorText');
        expect(euiFormErrorText?.textContent).toEqual('Name is required.');
        expect(onChangeMock).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            script: expect.objectContaining({
              name: undefined,
            }),
            hasFormChanged: true,
          })
        );
      });
    });

    it('shows required validation error when `platforms` input is blurred (with empty value)', () => {
      const { getByTestId } = renderResult;

      const platformsRow = getByTestId('test-platforms-row');
      const platformsInput = getByTestId('test-platforms-input');
      userEvent.type(platformsInput, ' ');
      userEvent.tab();

      waitFor(() => {
        expect(platformsInput).toHaveAttribute('aria-invalid', 'true');
        const euiFormErrorText = platformsRow.querySelector('.euiFormErrorText');
        expect(euiFormErrorText?.textContent).toEqual(
          'At least one operating system must be selected.'
        );
        expect(onChangeMock).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            script: expect.objectContaining({
              platform: undefined,
            }),
            hasFormChanged: true,
          })
        );
      });
    });

    it('should trigger form `isValid: true` when required fields are filled', () => {
      const { getByTestId } = renderResult;

      const filePicker = getByTestId('test-file-picker');
      const testFile = new File(['--test--file--'], 'file.sh', { type: 'application/txt' });
      userEvent.upload(filePicker, [testFile]);
      userEvent.tab();

      const nameInput = getByTestId('test-name-input');
      userEvent.type(nameInput, 'Test Script');
      userEvent.tab();

      const platformsInput = getByTestId('test-platforms-input');
      userEvent.type(platformsInput, 'windows');
      userEvent.tab();

      waitFor(() => {
        expect(onChangeMock).toHaveBeenNthCalledWith(
          2,
          expect.objectContaining({
            script: expect.objectContaining({
              fileName: 'file.sh',
              name: 'Test Script',
              platform: ['windows'],
            }),
            isValid: true,
            hasFormChanged: true,
          })
        );
      });
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

    it('allows removing fake file picker when editing a script', () => {
      const { getByTestId, queryByTestId } = renderResult;

      const filePicker = getByTestId('test-fake-file-picker');
      expect(filePicker).toBeInTheDocument();

      const removeFileButton = getByTestId('test-remove-file-button');
      userEvent.click(removeFileButton);

      waitFor(() => {
        expect(queryByTestId('test-fake-file-picker')).not.toBeInTheDocument();
        expect(onChangeMock).toHaveBeenNthCalledWith(
          2,
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
    });

    it('should show file required validation error when fake file picker is removed (and no file is uploaded)', async () => {
      const { getByTestId } = renderResult;

      const removeFileButton = getByTestId('test-remove-file-button');
      await userEvent.click(removeFileButton); // just click and no blur

      const fileInput = getByTestId('test-file-picker');
      expect(fileInput).toHaveAttribute('aria-invalid', 'true');
      const filePickerRow = getByTestId('test-file-picker-row');
      const euiFormErrorText = filePickerRow.querySelector('.euiFormErrorText');
      expect(euiFormErrorText?.textContent).toEqual('A script file is required.');
      expect(onChangeMock).toHaveBeenNthCalledWith(
        1,
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
      (name, expectedText) => {
        const { getByTestId } = renderResult;

        const input = getByTestId(`test-${name}-input`);
        userEvent.clear(input);

        expect(
          getByTestId(`test-${name}-row`).querySelector('.euiFormHelpText')?.textContent
        ).toEqual(expectedText);
      }
    );
  });
});
