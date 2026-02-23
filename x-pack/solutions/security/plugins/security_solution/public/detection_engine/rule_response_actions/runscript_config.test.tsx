/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppContextTestRender } from '../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../common/mock/endpoint';
import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import React from 'react';
import { RunscriptConfig } from './endpoint/runscript_config';
import { useUserPrivileges as _useUserPrivileges } from '../../common/components/user_privileges';
import { responseActionsHttpMocks } from '../../management/mocks/response_actions_http_mocks';
import { EndpointScriptsGenerator } from '../../../common/endpoint/data_generators/endpoint_scripts_generator';
import type {
  EndpointScript,
  ResponseActionScriptsApiResponse,
} from '../../../common/endpoint/types';
import { waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

jest.mock('../../common/components/user_privileges');

const useUserPrivilegesMock = _useUserPrivileges as jest.Mock;

describe('Automated Response actions - Runscript Configuration', () => {
  let testContext: AppContextTestRender;
  let render: () => ReturnType<AppContextTestRender['render']>;
  let apiMocks: ReturnType<typeof responseActionsHttpMocks>;

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

        waitFor(() => {
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

    it.todo('should display help text under arguments when script requires input');
  });
});
