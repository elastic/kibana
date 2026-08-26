/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { responseActionsHttpMocks } from '../../mocks/response_actions_http_mocks';
import type { AppContextTestRender } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import type { EndpointRunscriptScriptSelectorProps } from './endpoint_runscript_script_selector';
import {
  NO_SCRIPTS_FOUND_MESSAGE,
  EndpointRunscriptScriptSelector,
} from './endpoint_runscript_script_selector';
import { useUserPrivileges as _useUserPrivileges } from '../../../common/components/user_privileges';
import { waitFor } from '@testing-library/react';
import type {
  EndpointScript,
  ResponseActionScriptsApiResponse,
} from '../../../../common/endpoint/types';
import { EndpointScriptsGenerator } from '../../../../common/endpoint/data_generators/endpoint_scripts_generator';
import { userEvent } from '@testing-library/user-event/dist/cjs/index.js';
import { CUSTOM_SCRIPTS_ROUTE } from '../../../../common/endpoint/constants';

jest.mock('../../../common/components/user_privileges');

const useUserPrivilegesMock = _useUserPrivileges as jest.Mock;

describe('EndpointRunscriptScriptSelector', () => {
  let testContext: AppContextTestRender;
  let render: () => ReturnType<AppContextTestRender['render']>;
  let apiMocks: ReturnType<typeof responseActionsHttpMocks>;
  let props: EndpointRunscriptScriptSelectorProps;
  let scriptListApiResponse: ResponseActionScriptsApiResponse<EndpointScript>;

  beforeEach(() => {
    testContext = createAppRootMockRenderer();
    apiMocks = responseActionsHttpMocks(testContext.coreStart.http);
    testContext.getUserPrivilegesMockSetter(useUserPrivilegesMock).set({
      canWriteExecuteOperations: true,
    });
    props = {
      selectedScriptId: undefined,
      onChange: jest.fn(),
      'data-test-subj': 'test',
    };
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

    render = () => {
      return testContext.render(<EndpointRunscriptScriptSelector {...props} />);
    };
  });

  it('should render component if user has authz to runscript response action', async () => {
    const { getByTestId } = render();

    expect(getByTestId('test')).toBeDefined();

    await waitFor(() => {
      expect(apiMocks.responseProvider.fetchScriptList).toHaveBeenCalledWith({
        path: CUSTOM_SCRIPTS_ROUTE,
        query: { agentType: 'endpoint', osType: undefined },
        version: '1',
      });
    });
  });

  it('should not render component if user does not have authz to runscript response action', () => {
    testContext.getUserPrivilegesMockSetter(useUserPrivilegesMock).set({
      canWriteExecuteOperations: false,
    });
    const { queryByTestId } = render();

    expect(queryByTestId('test')).toBeNull();
  });

  it('should display list of scripts available and call onScriptsLoaded', async () => {
    props.onScriptsLoaded = jest.fn();
    const { getByTestId, getAllByTestId } = render();
    await waitFor(() => {
      expect(apiMocks.responseProvider.fetchScriptList).toHaveBeenCalled();
    });
    await userEvent.click(getByTestId('test'));

    expect(getAllByTestId('test-option')).toHaveLength(1);
    expect(props.onScriptsLoaded).toHaveBeenCalledWith(
      scriptListApiResponse.data.map((script) => script.meta)
    );
  });

  it('should display only scripts for for a given osType when one is defined', async () => {
    props.osType = 'windows';
    render();

    await waitFor(() => {
      expect(apiMocks.responseProvider.fetchScriptList).toHaveBeenCalledWith({
        path: CUSTOM_SCRIPTS_ROUTE,
        query: { agentType: 'endpoint', osType: 'windows' },
        version: '1',
      });
    });
  });

  it('should show selected script when selectedScriptId is defined on input', async () => {
    props.selectedScriptId = '1';
    const { getByTestId } = render();

    await waitFor(() => {
      expect(getByTestId('test-selectedScript')).toHaveTextContent(
        scriptListApiResponse.data[0].name
      );
    });
  });

  it('should display placeholder message when there are no scripts', async () => {
    scriptListApiResponse.data = [];
    const { getByTestId } = render();

    await waitFor(() => {
      expect(getByTestId('test')).toHaveTextContent(NO_SCRIPTS_FOUND_MESSAGE);
    });
  });

  it('should call onChange when a script is selected', async () => {
    const { getByTestId } = render();
    await waitFor(() => {
      expect(apiMocks.responseProvider.fetchScriptList).toHaveBeenCalled();
    });
    await userEvent.click(getByTestId('test'));
    await userEvent.click(getByTestId('test-option'), { pointerEventsCheck: 0 });

    expect(props.onChange).toHaveBeenCalledWith(scriptListApiResponse.data[0].meta);
  });

  it('should call onChange when current selected script is cleared', async () => {
    props.selectedScriptId = '1';
    const { getByTestId } = render();
    await waitFor(() => {
      expect(getByTestId('test')).toHaveTextContent(scriptListApiResponse.data[0].name);
    });
    await userEvent.click(getByTestId('test-clearSelection'));

    expect(props.onChange).toHaveBeenCalledWith(undefined);
  });
});
