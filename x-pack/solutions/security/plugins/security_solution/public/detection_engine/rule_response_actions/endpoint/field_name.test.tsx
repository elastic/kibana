/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppContextTestRender } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import { Form, useForm, UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import React, { useState } from 'react';
import type { JSX } from 'react';
import { FieldNameField } from './field_name';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/react';

const BASE_PATH = 'responseActions[0].params';
const FIELD_PATH = `${BASE_PATH}.config.field`;
const OVERWRITE_PATH = `${BASE_PATH}.config.overwrite`;

describe('FieldNameField', () => {
  let testContext: AppContextTestRender;
  let FormContext: () => JSX.Element;
  let render: () => ReturnType<AppContextTestRender['render']>;

  interface FormContextProps {
    disabled?: boolean;
    isRequired?: boolean;
    initialFieldValue?: string;
    initialOverwrite?: boolean;
  }

  const buildFormContext = ({
    disabled = false,
    isRequired = true,
    initialFieldValue = '',
    initialOverwrite = false,
  }: FormContextProps = {}) => {
    const FormContextComponent = () => {
      const { form } = useForm({
        defaultValue: {
          responseActions: [
            {
              actionTypeId: '.endpoint',
              params: {
                command: 'kill-process',
                config: {
                  field: initialFieldValue,
                  overwrite: initialOverwrite,
                },
              },
            },
          ],
        },
      });

      return (
        <Form form={form}>
          {/* Register the overwrite field so FieldNameField can access it via getFields() */}
          <UseField path={OVERWRITE_PATH}>{() => null}</UseField>
          <FieldNameField
            basePath={BASE_PATH}
            path={FIELD_PATH}
            disabled={disabled}
            readDefaultValueOnForm={true}
            isRequired={isRequired}
          />
        </Form>
      );
    };

    return FormContextComponent;
  };

  beforeEach(() => {
    testContext = createAppRootMockRenderer();
    FormContext = buildFormContext();
    render = () => testContext.render(<FormContext />);
  });

  describe('rendering', () => {
    it('should render the combo box field', () => {
      const { getByTestId } = render();

      expect(getByTestId('config-custom-field-name')).toBeInTheDocument();
    });

    it('should render with the "Custom field name" label', () => {
      const { getByText } = render();

      expect(getByText('Custom field name')).toBeInTheDocument();
    });

    it('should render default help text when no value is set', () => {
      const { getByText } = render();

      expect(
        getByText('Choose a different alert field to identify the process to terminate.')
      ).toBeInTheDocument();
    });

    it('should render entity_id help text when field value contains "entity_id"', () => {
      FormContext = buildFormContext({ initialFieldValue: 'process.entity_id' });
      const { getByText } = render();

      expect(
        getByText(
          'Entity_id is an Elastic Defend agent specific field, if the alert does not come from Elastic Defend agent we will not be able to send the action.'
        )
      ).toBeInTheDocument();
    });
  });

  describe('disabled state', () => {
    it('should be disabled when `disabled` prop is true', () => {
      FormContext = buildFormContext({ disabled: true });
      const { getByTestId } = render();

      const input = getByTestId('config-custom-field-name').querySelector('input');
      expect(input).toBeDisabled();
    });

    it('should be disabled when `isRequired` is false', () => {
      FormContext = buildFormContext({ isRequired: false });
      const { getByTestId } = render();

      const input = getByTestId('config-custom-field-name').querySelector('input');
      expect(input).toBeDisabled();
    });

    it('should be enabled when `disabled` is false and `isRequired` is true', () => {
      FormContext = buildFormContext({ disabled: false, isRequired: true });
      const { getByTestId } = render();

      const input = getByTestId('config-custom-field-name').querySelector('input');
      expect(input).not.toBeDisabled();
    });
  });

  describe('field value behavior', () => {
    it('should display a pre-selected value when initialFieldValue is set', () => {
      FormContext = buildFormContext({ initialFieldValue: 'process.pid' });
      const { getByDisplayValue } = render();

      expect(getByDisplayValue('process.pid')).toBeInTheDocument();
    });

    it('should clear field value when overwrite is toggled on', async () => {
      const FormContextWithToggle = () => {
        const [overwrite, setOverwrite] = useState(false);
        const { form } = useForm({
          defaultValue: {
            responseActions: [
              {
                actionTypeId: '.endpoint',
                params: {
                  command: 'kill-process',
                  config: {
                    field: 'process.pid',
                    overwrite: false,
                  },
                },
              },
            ],
          },
        });

        return (
          <Form form={form}>
            <UseField path={OVERWRITE_PATH}>{() => null}</UseField>
            <FieldNameField
              basePath={BASE_PATH}
              path={FIELD_PATH}
              disabled={false}
              readDefaultValueOnForm={true}
              isRequired={!overwrite}
            />
            <button
              type="button"
              data-test-subj="toggle-overwrite"
              onClick={() => {
                form.setFieldValue(OVERWRITE_PATH, true);
                setOverwrite(true);
              }}
            >
              {'Toggle Overwrite'}
            </button>
          </Form>
        );
      };

      const { getByTestId, queryByDisplayValue } = testContext.render(<FormContextWithToggle />);

      // Initially the field should show 'process.pid'
      expect(queryByDisplayValue('process.pid')).toBeInTheDocument();

      // Toggle overwrite on
      await userEvent.click(getByTestId('toggle-overwrite'));

      await waitFor(() => {
        expect(queryByDisplayValue('process.pid')).not.toBeInTheDocument();
      });
    });
  });

  describe('user interaction', () => {
    it('should allow selecting an option from the dropdown', async () => {
      const { getByTestId, findAllByRole } = render();

      const comboBox = getByTestId('config-custom-field-name');
      const input = comboBox.querySelector('input') as HTMLInputElement;

      // Open the dropdown and type to filter options
      await userEvent.click(input);
      await userEvent.type(input, 'process.pid');

      const options = await findAllByRole('option');
      expect(options.length).toBeGreaterThan(0);

      await userEvent.click(options[0]);

      await waitFor(() => {
        expect(input.value).toBe('process.pid');
      });
    });

    it('should clear the selected value when the clear button is clicked', async () => {
      FormContext = buildFormContext({ initialFieldValue: 'process.pid' });
      const { getByTestId, queryByDisplayValue } = render();

      expect(queryByDisplayValue('process.pid')).toBeInTheDocument();

      // In singleSelection asPlainText mode, EuiComboBox renders a "Clear input" button
      const clearButton = getByTestId('comboBoxClearButton');
      await userEvent.click(clearButton);

      await waitFor(() => {
        expect(queryByDisplayValue('process.pid')).not.toBeInTheDocument();
      });

      const input = getByTestId('config-custom-field-name').querySelector(
        'input'
      ) as HTMLInputElement;
      expect(input.value).toBe('');
    });
  });
});
