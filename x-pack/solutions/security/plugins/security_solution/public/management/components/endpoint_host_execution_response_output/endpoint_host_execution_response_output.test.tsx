/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AppContextTestRender } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import type { DeepMutable } from '../../../../common/endpoint/types';
import React from 'react';
import { EndpointActionGenerator } from '../../../../common/endpoint/data_generators/endpoint_action_generator';
import { getEmptyValue } from '@kbn/cases-plugin/public/components/empty_value';
import type { EndpointHostExecutionResponseOutputProps } from './endpoint_host_execution_response_output';
import {
  EndpointHostExecutionResponseOutput,
  EXECUTE_OUTPUT_FILE_TRUNCATED_MESSAGE,
} from './endpoint_host_execution_response_output';

describe('When using the `EndpointHostExecutionResponseOutput` component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let renderProps: DeepMutable<EndpointHostExecutionResponseOutputProps>;
  let outputContent: DeepMutable<EndpointHostExecutionResponseOutputProps>['outputContent'];

  beforeEach(() => {
    const appTestContext = createAppRootMockRenderer();

    outputContent = new EndpointActionGenerator('seed').generateExecuteActionResponseOutput()
      .content;

    renderProps = {
      outputContent,
      'data-test-subj': 'test',
    };

    render = () => {
      renderResult = appTestContext.render(
        <EndpointHostExecutionResponseOutput {...renderProps} />
      );
      return renderResult;
    };
  });

  const outputSuffix = 'output';

  it('should show shell info and shell code', async () => {
    render();
    const { queryByTestId } = renderResult;
    expect(queryByTestId(`test-context`)).toBeInTheDocument();
    expect(queryByTestId(`test-shell`)).toBeInTheDocument();
    expect(queryByTestId(`test-cwd`)).toBeInTheDocument();
  });

  it('should show execution context accordion as `closed`', async () => {
    render();
    expect(renderResult.getByTestId('test-context').className).not.toContain('euiAccordion-isOpen');
  });

  it('should show execution from directory', async () => {
    render();
    const { queryByTestId } = renderResult;
    expect(queryByTestId(`test-context`)).toBeInTheDocument();
    expect(queryByTestId(`test-cwd`)).toBeInTheDocument();
  });

  it('should show execution output and errors', async () => {
    render();
    const { queryByTestId } = renderResult;
    expect(queryByTestId(`test-${outputSuffix}`)).toBeInTheDocument();
    expect(queryByTestId(`test-error`)).toBeInTheDocument();
  });

  it('should show execution output accordion as `open`', async () => {
    render();
    expect(renderResult.getByTestId(`test-${outputSuffix}`).className).toContain('isOpen');
  });

  it('should show execution error output accordion as `open`', async () => {
    render();
    expect(renderResult.getByTestId('test-error').className).toContain('isOpen');
  });

  it('should show `-` in output accordion when no output content', async () => {
    renderProps.outputContent.stdout = '';
    render();
    expect(renderResult.getByTestId(`test-${outputSuffix}`).textContent).toContain(
      `Execution output (truncated)${getEmptyValue()}`
    );
  });

  it('should NOT show the error accordion when no error content', async () => {
    renderProps.outputContent.stderr = '';
    render();
    expect(renderResult.queryByTestId('test-error')).not.toBeInTheDocument();
  });

  it('should show file truncate messages for STDOUT and STDERR', () => {
    Object.assign(renderProps.outputContent, {
      output_file_stdout_truncated: true,
      output_file_stderr_truncated: true,
    });
    const { getByTestId } = render();

    expect(getByTestId('test-output-fileTruncatedMsg')).toHaveTextContent(
      EXECUTE_OUTPUT_FILE_TRUNCATED_MESSAGE
    );
    expect(getByTestId('test-error-fileTruncatedMsg')).toHaveTextContent(
      EXECUTE_OUTPUT_FILE_TRUNCATED_MESSAGE
    );
  });
});
