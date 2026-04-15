/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AppContextTestRender } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import type {
  ResponseActionExecuteOutputContent,
  ResponseActionsExecuteParameters,
  DeepMutable,
} from '../../../../common/endpoint/types';
import React from 'react';
import { EndpointActionGenerator } from '../../../../common/endpoint/data_generators/endpoint_action_generator';
import {
  ExecuteActionHostResponse,
  type ExecuteActionHostResponseProps,
} from './execute_action_host_response';
import { responseActionsHttpMocks } from '../../mocks/response_actions_http_mocks';
import { waitFor } from '@testing-library/react';

describe('When using the `ExecuteActionHostResponse` component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let renderProps: DeepMutable<ExecuteActionHostResponseProps>;
  let action: DeepMutable<ExecuteActionHostResponseProps>['action'];

  beforeEach(() => {
    const appTestContext = createAppRootMockRenderer();

    responseActionsHttpMocks(appTestContext.coreStart.http);

    action = new EndpointActionGenerator('seed').generateActionDetails<
      ResponseActionExecuteOutputContent,
      ResponseActionsExecuteParameters
    >({
      command: 'execute',
      agents: ['agent-a'],
    });

    renderProps = {
      action,
      canAccessFileDownloadLink: true,
      'data-test-subj': 'test',
    };

    render = () => {
      renderResult = appTestContext.render(<ExecuteActionHostResponse {...renderProps} />);
      return renderResult;
    };
  });

  it('should display results file download', async () => {
    render();
    await waitFor(() => {
      expect(renderResult.queryByTestId('test-getExecuteLink-loading')).toBeNull();
    });

    expect(renderResult.getByTestId('test-getExecuteLink')).toBeInTheDocument();
    expect(renderResult.getByTestId('test-getExecuteLink-passcodeMessage')).toBeInTheDocument();
  });

  it('should display the output content', () => {
    render();

    expect(renderResult.getByTestId('test-executeResponseOutput')).toBeInTheDocument();
  });
});
