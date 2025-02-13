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
  ActionDetails,
  DeepMutable,
} from '../../../../common/endpoint/types';
import React from 'react';
import { EndpointActionGenerator } from '../../../../common/endpoint/data_generators/endpoint_action_generator';
import {
  ExecuteActionHostResponse,
  type ExecuteActionHostResponseProps,
} from './execute_action_host_response';
import { getEmptyValue } from '@kbn/cases-plugin/public/components/empty_value';
import { EXECUTE_OUTPUT_FILE_TRUNCATED_MESSAGE } from './execute_action_host_response_output';

describe('When using the `ExecuteActionHostResponse` component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let renderProps: DeepMutable<ExecuteActionHostResponseProps>;
  let action: DeepMutable<ExecuteActionHostResponseProps>['action'];

  beforeEach(() => {
    const appTestContext = createAppRootMockRenderer();

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

  const outputSuffix = 'output';

  it('should show shell info and shell code', async () => {
    render();
    const { queryByTestId } = renderResult;
    expect(queryByTestId(`test-executeResponseOutput-context`)).toBeInTheDocument();
    expect(queryByTestId(`test-executeResponseOutput-shell`)).toBeInTheDocument();
    expect(queryByTestId(`test-executeResponseOutput-cwd`)).toBeInTheDocument();
  });

  it('should show execute context accordion as `closed`', async () => {
    render();
    expect(renderResult.getByTestId('test-executeResponseOutput-context').className).not.toContain(
      'euiAccordion-isOpen'
    );
  });

  it('should show execute from directory', async () => {
    render();
    const { queryByTestId } = renderResult;
    expect(queryByTestId(`test-executeResponseOutput-context`)).toBeInTheDocument();
    expect(queryByTestId(`test-executeResponseOutput-cwd`)).toBeInTheDocument();
  });

  it('should show execute output and execute errors', async () => {
    render();
    const { queryByTestId } = renderResult;
    expect(queryByTestId(`test-executeResponseOutput-${outputSuffix}`)).toBeInTheDocument();
    expect(queryByTestId(`test-executeResponseOutput-error`)).toBeInTheDocument();
  });

  it('should show execute output accordion as `open`', async () => {
    render();
    expect(
      renderResult.getByTestId(`test-executeResponseOutput-${outputSuffix}`).className
    ).toContain('isOpen');
  });

  it('should show execute error output accordion as `open`', async () => {
    render();
    expect(renderResult.getByTestId('test-executeResponseOutput-error').className).toContain(
      'isOpen'
    );
  });

  it('should show `-` in output accordion when no output content', async () => {
    renderProps.action.outputs = {
      'agent-a': {
        type: 'json',
        content: {
          ...renderProps.action.outputs![action.agents[0]].content,
          stdout: '',
        },
      },
    };

    render();
    expect(
      renderResult.getByTestId(`test-executeResponseOutput-${outputSuffix}`).textContent
    ).toContain(`Execution output (truncated)${getEmptyValue()}`);
  });

  it('should NOT show the error accordion when no error content', async () => {
    renderProps.action.outputs = {
      'agent-a': {
        type: 'json',
        content: {
          ...renderProps.action.outputs![action.agents[0]].content,
          stderr: '',
        },
      },
    };

    render();
    expect(renderResult.queryByTestId('test-executeResponseOutput-error')).not.toBeInTheDocument();
  });

  it('should not show execute output accordions when no output in action details', () => {
    (renderProps.action as ActionDetails).outputs = undefined;

    render();
    const { queryByTestId } = renderResult;
    expect(queryByTestId(`test-executeResponseOutput-context`)).not.toBeInTheDocument();
    expect(queryByTestId(`test-executeResponseOutput-${outputSuffix}`)).not.toBeInTheDocument();
  });

  it('should show file truncate messages for STDOUT and STDERR', () => {
    (renderProps.action as ActionDetails<ResponseActionExecuteOutputContent>).outputs = {
      'agent-a': {
        type: 'json',
        content: {
          ...(renderProps.action as ActionDetails<ResponseActionExecuteOutputContent>).outputs?.[
            action.agents[0]
          ].content!,
          output_file_stdout_truncated: true,
          output_file_stderr_truncated: true,
        },
      },
    };
    const { getByTestId } = render();

    expect(getByTestId('test-executeResponseOutput-output-fileTruncatedMsg')).toHaveTextContent(
      EXECUTE_OUTPUT_FILE_TRUNCATED_MESSAGE
    );
    expect(getByTestId('test-executeResponseOutput-error-fileTruncatedMsg')).toHaveTextContent(
      EXECUTE_OUTPUT_FILE_TRUNCATED_MESSAGE
    );
  });
});
