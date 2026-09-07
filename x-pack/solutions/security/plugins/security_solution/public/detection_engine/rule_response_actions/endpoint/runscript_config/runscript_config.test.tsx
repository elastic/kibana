/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppContextTestRender } from '../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../common/mock/endpoint';
import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import React from 'react';
import { RunscriptConfig } from './runscript_config';
import { useUserPrivileges as _useUserPrivileges } from '../../../../common/components/user_privileges';

jest.mock('../../../../common/components/user_privileges');

const useUserPrivilegesMock = _useUserPrivileges as jest.Mock;

describe('Automated Response actions - Runscript Configuration', () => {
  let testContext: AppContextTestRender;
  let render: () => ReturnType<AppContextTestRender['render']>;

  beforeEach(() => {
    testContext = createAppRootMockRenderer();
    testContext.setExperimentalFlag({ responseActionsEndpointAutomatedRunScript: true });
    testContext.setExperimentalFlag({ responseActionsScriptLibraryManagement: true });
    testContext.getUserPrivilegesMockSetter(useUserPrivilegesMock).set({
      canWriteExecuteOperations: true,
    });

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
    expect(getByTestId('runscript-config-field-macos')).toBeInTheDocument();
    expect(getByTestId('runscript-config-field-windows')).toBeInTheDocument();
  });
});
