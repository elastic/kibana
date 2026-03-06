/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppContextTestRender } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import React from 'react';
import {
  RUNSCRIPT_CONFIG_REQUIRES_ONE_OS,
  RunscriptConfig,
  SCRIPT_ARGUMENTS_REQUIRED_HELP_TEXT,
  TIMEOUT_VALUE_MUST_BE_GREATER_THAN_ZERO,
  TIMEOUT_VALUE_MUST_BE_NUMBER,
} from './runscript_config';
import { useUserPrivileges as _useUserPrivileges } from '../../../common/components/user_privileges';
import { responseActionsHttpMocks } from '../../../management/mocks/response_actions_http_mocks';
import { EndpointScriptsGenerator } from '../../../../common/endpoint/data_generators/endpoint_scripts_generator';
import type {
  EndpointScript,
  ResponseActionScriptsApiResponse,
} from '../../../../common/endpoint/types';
import { waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

jest.mock('../../../common/components/user_privileges');

const useUserPrivilegesMock = _useUserPrivileges as jest.Mock;

describe('Automated Response actions - Runscript Configuration', () => {
  let testContext: AppContextTestRender;
  let render: () => ReturnType<AppContextTestRender['render']>;
  let apiMocks: ReturnType<typeof responseActionsHttpMocks>;
  let formMock: ReturnType<typeof useForm>['form'];

  beforeEach(() => {
    testContext = createAppRootMockRenderer();
    testContext.setExperimentalFlag({ responseActionsEndpointAutomatedRunScript: true });
    testContext.setExperimentalFlag({ responseActionsScriptLibraryManagement: true });
    testContext.getUserPrivilegesMockSetter(useUserPrivilegesMock).set({
      canWriteExecuteOperations: true,
    });
    apiMocks = responseActionsHttpMocks(testContext.coreStart.http);

    const FormContext = () => {
      const { form } = useForm({
        defaultValue: {
          responseActions: [
            {
              actionTypeId: '.endpoint',
              params: {
                command: 'runscript',
              },
            },
          ],
        },
      });
      formMock = form;
      return (
        <Form form={form}>
          <RunscriptConfig
            basePath="responseActions[0].params"
            disabled={false}
            readDefaultValueOnForm={true}
          />
        </Form>
      );
    };

    render = () => {
      return testContext.render(<FormContext />);
    };
  });

  it('should render nothing if feature flag is disabled', () => {
    testContext.setExperimentalFlag({ responseActionsEndpointAutomatedRunScript: false });
    const { queryByTestId } = render();

    expect(queryByTestId('runscript-config-field')).toBeNull();
  });

  it('should render nothing if user does not have authz to runscript', () => {
    testContext.getUserPrivilegesMockSetter(useUserPrivilegesMock).set({
      canWriteExecuteOperations: false,
    });
    const { queryByTestId } = render();

    expect(queryByTestId('runscript-config-field')).toBeNull();
  });

  it('should render expected UI elements', () => {
    const { getByTestId } = render();

    expect(getByTestId('runscript-config-field')).toBeInTheDocument();

    expect(getByTestId('runscript-config-field-linux')).toBeInTheDocument();
    expect(getByTestId('runscript-config-field-linux-scriptSelector')).toBeInTheDocument();
    expect(getByTestId('runscript-config-field-linux-scriptParams')).toBeInTheDocument();
    expect(getByTestId('runscript-config-field-linux-timeout')).toBeInTheDocument();

    expect(getByTestId('runscript-config-field-macos')).toBeInTheDocument();
    expect(getByTestId('runscript-config-field-macos-scriptSelector')).toBeInTheDocument();
    expect(getByTestId('runscript-config-field-macos-scriptParams')).toBeInTheDocument();
    expect(getByTestId('runscript-config-field-macos-timeout')).toBeInTheDocument();

    expect(getByTestId('runscript-config-field-windows')).toBeInTheDocument();
    expect(getByTestId('runscript-config-field-windows-scriptSelector')).toBeInTheDocument();
    expect(getByTestId('runscript-config-field-windows-scriptParams')).toBeInTheDocument();
    expect(getByTestId('runscript-config-field-windows-timeout')).toBeInTheDocument();
  });

  it('should display arguments and timeout fields disabled if no script selected', () => {
    const { getByTestId } = render();

    expect(getByTestId('runscript-config-field-linux-scriptParams')).toBeDisabled();
    expect(getByTestId('runscript-config-field-linux-timeout')).toBeDisabled();

    expect(getByTestId('runscript-config-field-macos-scriptParams')).toBeDisabled();
    expect(getByTestId('runscript-config-field-macos-timeout')).toBeDisabled();

    expect(getByTestId('runscript-config-field-windows-scriptParams')).toBeDisabled();
    expect(getByTestId('runscript-config-field-windows-timeout')).toBeDisabled();
  });

  describe('and a script is selected', () => {
    let scriptListApiResponse: ResponseActionScriptsApiResponse<EndpointScript>;
    let renderAndSelectScript: () => Promise<ReturnType<AppContextTestRender['render']>>;

    beforeEach(() => {
      scriptListApiResponse = {
        data: [
          {
            id: '1',
            name: 'Script 1',
            description: 'Test script 1',
            meta: new EndpointScriptsGenerator('seed').generate({
              id: '1',
              name: 'Script 1',
              description: 'Test script 1',
              platform: ['linux'],
              requiresInput: false,
            }),
          },
        ],
      };
      apiMocks.responseProvider.fetchScriptList.mockImplementation(() => {
        return scriptListApiResponse;
      });
      renderAndSelectScript = async () => {
        const renderResult = render();

        await waitFor(() => {
          expect(apiMocks.responseProvider.fetchScriptList).toHaveBeenCalled();

          expect(
            renderResult
              .getByTestId('runscript-config-field-linux-scriptSelector')
              .querySelector('.euiLoadingSpinner')
          ).not.toBeTruthy();
        });

        await userEvent.click(
          renderResult.getByTestId('runscript-config-field-linux-scriptSelector')
        );

        await userEvent.click(
          renderResult.queryAllByTestId('runscript-config-field-linux-scriptSelector-option')[0]
        );

        return renderResult;
      };
    });

    it('should enable arguments and timeout fields', async () => {
      const { getByTestId } = await renderAndSelectScript();

      expect(
        getByTestId('runscript-config-field-linux-scriptSelector-selectedScript')
      ).toHaveTextContent('Script 1');
      expect(getByTestId('runscript-config-field-linux-scriptParams')).not.toBeDisabled();
      expect(getByTestId('runscript-config-field-linux-timeout')).not.toBeDisabled();
    });

    it('should not display help text under argumnents when script does not require input', async () => {
      const { getByTestId } = await renderAndSelectScript();

      expect(
        getByTestId('runscript-config-field-linux-scriptParamsContainer')
      ).not.toHaveTextContent(SCRIPT_ARGUMENTS_REQUIRED_HELP_TEXT);
    });

    it('should display help text under arguments when script requires input', async () => {
      scriptListApiResponse.data[0].meta!.requiresInput = true;
      const { getByTestId } = await renderAndSelectScript();

      expect(getByTestId('runscript-config-field-linux-scriptParamsContainer')).toHaveTextContent(
        SCRIPT_ARGUMENTS_REQUIRED_HELP_TEXT
      );
      expect(formMock.isValid).toBe(false);
      expect(formMock.getErrors()).toEqual([
        'Run script: Linux: Arguments: Selected script requires arguments to be provided',
      ]);
    });

    it('should validate timeout for valid value', async () => {
      const { getByTestId } = await renderAndSelectScript();
      await userEvent.type(getByTestId('runscript-config-field-linux-timeout'), '10');

      expect(
        getByTestId('runscript-config-field-linux-timeoutContainer').querySelector(
          '.euiFormErrorText'
        )
      ).toBeNull();
    });

    it('should validate timeout for invalid value - not a number', async () => {
      const { getByTestId } = await renderAndSelectScript();
      await userEvent.type(getByTestId('runscript-config-field-linux-timeout'), 'abc');

      await waitFor(() => {
        expect(
          getByTestId('runscript-config-field-linux-timeoutContainer').querySelector(
            '.euiFormErrorText'
          )
        ).toHaveTextContent(TIMEOUT_VALUE_MUST_BE_NUMBER);
      });
      expect(formMock.isValid).toBe(false);
      expect(formMock.getErrors()).toEqual(['Run script: Linux: Timeout: Value must be a number']);
    });

    it('should validate timeout for invalid value - number less than 1', async () => {
      const { getByTestId } = await renderAndSelectScript();
      await userEvent.type(getByTestId('runscript-config-field-linux-timeout'), '0');

      await waitFor(() => {
        expect(
          getByTestId('runscript-config-field-linux-timeoutContainer').querySelector(
            '.euiFormErrorText'
          )
        ).toHaveTextContent(TIMEOUT_VALUE_MUST_BE_GREATER_THAN_ZERO);
      });
    });

    it('should clear arguments and timeout fields when script is unselected', async () => {
      const { getByTestId } = await renderAndSelectScript();
      await userEvent.click(
        getByTestId('runscript-config-field-linux-scriptSelector-clearSelection')
      );

      expect(getByTestId('runscript-config-field-linux-scriptParams')).toBeDisabled();
      expect(getByTestId('runscript-config-field-linux-scriptParams')).toHaveValue('');

      expect(getByTestId('runscript-config-field-linux-timeout')).toBeDisabled();
      expect(getByTestId('runscript-config-field-linux-timeout')).toHaveValue('');

      expect(formMock.isValid).toBe(false);
      expect(formMock.getErrors()).toEqual([RUNSCRIPT_CONFIG_REQUIRES_ONE_OS]);
    });
  });
});
