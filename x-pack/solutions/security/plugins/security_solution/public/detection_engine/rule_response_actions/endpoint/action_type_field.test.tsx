/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Form, useForm, UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/react';
import type { AppContextTestRender } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import { useUserPrivileges as _useUserPrivileges } from '../../../common/components/user_privileges';
import { ENABLED_AUTOMATED_RESPONSE_ACTION_COMMANDS } from '../../../../common/endpoint/service/response_actions/constants';
import { ActionTypeField } from './action_type_field';

jest.mock('../../../common/components/user_privileges');

const useUserPrivilegesMock = _useUserPrivileges as jest.Mock;

const FULL_PRIVILEGES = {
  canIsolateHost: true,
  canKillProcess: true,
  canSuspendProcess: true,
  canWriteExecuteOperations: true,
};

describe('ActionTypeField', () => {
  let testContext: AppContextTestRender;

  const renderField = ({
    responseActions,
    fieldIndex = 0,
  }: {
    responseActions: Array<{ actionTypeId: string; params: { command?: string } }>;
    fieldIndex?: number;
  }) => {
    const FormContext = () => {
      const { form } = useForm({
        defaultValue: { responseActions },
      });

      return (
        <Form form={form}>
          {responseActions.map((_, index) =>
            index === fieldIndex ? (
              <ActionTypeField
                key={index}
                basePath={`responseActions[${index}].params`}
                disabled={false}
                readDefaultValueOnForm={true}
              />
            ) : (
              <UseField
                key={index}
                path={`responseActions[${index}].params.command`}
                readDefaultValueOnForm={true}
              >
                {() => null}
              </UseField>
            )
          )}
        </Form>
      );
    };

    return testContext.render(<FormContext />);
  };

  const openCommandDropdown = async (renderResult: ReturnType<AppContextTestRender['render']>) => {
    await userEvent.click(renderResult.getByTestId('commandTypeField'));
    await waitFor(() => {
      expect(renderResult.getByTestId('command-type-isolate')).toBeInTheDocument();
    });
  };

  beforeEach(() => {
    testContext = createAppRootMockRenderer();
    testContext.setExperimentalFlag({ responseActionsEndpointAutomatedRunScript: true });
    testContext.getUserPrivilegesMockSetter(useUserPrivilegesMock).set(FULL_PRIVILEGES);
  });

  it('should list the enabled automated response action commands', async () => {
    const renderResult = renderField({
      responseActions: [{ actionTypeId: '.endpoint', params: {} }],
    });

    await openCommandDropdown(renderResult);

    ENABLED_AUTOMATED_RESPONSE_ACTION_COMMANDS.forEach((command) => {
      expect(renderResult.getByTestId(`command-type-${command}`)).toBeInTheDocument();
    });
  });

  it('should disable a command that is already selected on another action', async () => {
    const renderResult = renderField({
      responseActions: [
        { actionTypeId: '.endpoint', params: { command: 'isolate' } },
        { actionTypeId: '.endpoint', params: {} },
      ],
      fieldIndex: 1,
    });

    await openCommandDropdown(renderResult);

    expect(renderResult.getByTestId('command-type-isolate')).toBeDisabled();
    expect(renderResult.getByTestId('command-type-kill-process')).toBeEnabled();
  });

  it('should enable isolate when it is not selected on any action', async () => {
    const renderResult = renderField({
      responseActions: [{ actionTypeId: '.endpoint', params: { command: 'kill-process' } }],
    });

    await openCommandDropdown(renderResult);

    expect(renderResult.getByTestId('command-type-isolate')).toBeEnabled();
  });
});
