/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppContextTestRender } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
// eslint-disable-next-line @kbn/eslint/no_deprecated_imports
import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import React from 'react';
import type { JSX } from 'react';
import { KillDescendantsField } from './kill_descendants_field';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/react';

const BASE_PATH = 'responseActions[0].params';
const KILL_DESCENDANTS_PATH = `${BASE_PATH}.config.kill_descendants`;
const TEST_SUBJ = 'config-kill-descendants-toggle';

describe('KillDescendantsField', () => {
  let testContext: AppContextTestRender;
  let FormContext: () => JSX.Element;
  let render: () => ReturnType<AppContextTestRender['render']>;

  interface FormContextProps {
    disabled?: boolean;
    initialKillDescendants?: boolean;
  }

  const buildFormContext = ({
    disabled = false,
    initialKillDescendants = false,
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
                  field: '',
                  overwrite: true,
                  kill_descendants: initialKillDescendants,
                },
              },
            },
          ],
        },
      });

      return (
        <Form form={form}>
          <KillDescendantsField
            path={KILL_DESCENDANTS_PATH}
            disabled={disabled}
            readDefaultValueOnForm={true}
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
    it('should render the toggle field', () => {
      const { getByTestId } = render();

      expect(getByTestId(TEST_SUBJ)).toBeInTheDocument();
    });

    it('should render with the "Kill descendants" label', () => {
      const { getByText } = render();

      expect(getByText('Kill descendant processes')).toBeInTheDocument();
    });

    it('should be unchecked by default', () => {
      const { getByTestId } = render();

      expect(getByTestId(TEST_SUBJ)).not.toBeChecked();
    });

    it('should be checked when the form value is `true`', () => {
      FormContext = buildFormContext({ initialKillDescendants: true });
      const { getByTestId } = render();

      expect(getByTestId(TEST_SUBJ)).toBeChecked();
    });
  });

  describe('disabled state', () => {
    it('should be disabled when the `disabled` prop is `true`', () => {
      FormContext = buildFormContext({ disabled: true });
      const { getByTestId } = render();

      expect(getByTestId(TEST_SUBJ)).toBeDisabled();
    });

    it('should be enabled when the `disabled` prop is `false`', () => {
      const { getByTestId } = render();

      expect(getByTestId(TEST_SUBJ)).not.toBeDisabled();
    });
  });

  describe('user interaction', () => {
    it('should toggle the value on when clicked', async () => {
      const { getByTestId } = render();
      const toggle = getByTestId(TEST_SUBJ);

      expect(toggle).not.toBeChecked();

      await userEvent.click(toggle);

      await waitFor(() => {
        expect(toggle).toBeChecked();
      });
    });

    it('should toggle the value off when clicked while checked', async () => {
      FormContext = buildFormContext({ initialKillDescendants: true });
      const { getByTestId } = render();
      const toggle = getByTestId(TEST_SUBJ);

      expect(toggle).toBeChecked();

      await userEvent.click(toggle);

      await waitFor(() => {
        expect(toggle).not.toBeChecked();
      });
    });

    it('should not toggle when disabled', async () => {
      FormContext = buildFormContext({ disabled: true });
      const { getByTestId } = render();
      const toggle = getByTestId(TEST_SUBJ);

      expect(toggle).not.toBeChecked();

      await userEvent.click(toggle);

      expect(toggle).not.toBeChecked();
    });
  });
});
