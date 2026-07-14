/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EndpointActionGenerator } from '../../../../common/endpoint/data_generators/endpoint_action_generator';
import type { AppContextTestRender } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import type {
  ActionDetails,
  ResponseActionRunScriptOutputContent,
} from '../../../../common/endpoint/types';
import { CrowdstrikeRunscriptOutput } from './crowdstrike_runscript_output';

describe('CrowdstrikeRunscriptOutput component', () => {
  let appTestContext: AppContextTestRender;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let render: () => ReturnType<AppContextTestRender['render']>;
  let action: ActionDetails<ResponseActionRunScriptOutputContent>;

  beforeEach(() => {
    action = new EndpointActionGenerator('seed').generateActionDetails({
      agents: ['agent-a'],
      agentType: 'crowdstrike',
      command: 'runscript',
    });

    appTestContext = createAppRootMockRenderer();

    render = () => {
      renderResult = appTestContext.render(
        <CrowdstrikeRunscriptOutput action={action} agentId={'agent-a'} data-test-subj="test" />
      );

      return renderResult;
    };
  });

  it('should display stdout output when present', () => {
    action.outputs = {
      'agent-a': {
        content: {
          code: '200',
          stdout: 'script output here',
          stderr: '',
        },
        type: 'text',
      },
    };

    render();

    expect(renderResult.getByTestId('test-stdout')).toBeInTheDocument();
    expect(renderResult.getByTestId('test-stdout-title')).toHaveTextContent('Runscript output');
    expect(renderResult.queryByTestId('test-stderr')).toBeNull();
  });

  it('should display stderr output when present', () => {
    action.outputs = {
      'agent-a': {
        content: {
          code: '200',
          stdout: '',
          stderr: 'error output here',
        },
        type: 'text',
      },
    };

    render();

    expect(renderResult.getByTestId('test-stderr')).toBeInTheDocument();
    expect(renderResult.getByTestId('test-stderr-title')).toHaveTextContent('Runscript error');
    expect(renderResult.queryByTestId('test-stdout')).toBeNull();
  });

  it('should display both stdout and stderr when both are present', () => {
    action.outputs = {
      'agent-a': {
        content: {
          code: '200',
          stdout: 'standard output',
          stderr: 'error output',
        },
        type: 'text',
      },
    };

    render();

    expect(renderResult.getByTestId('test-stderr')).toBeInTheDocument();
    expect(renderResult.getByTestId('test-stdout')).toBeInTheDocument();
  });

  it('should display no-output message when output content is missing', () => {
    action.outputs = {};
    render();

    const noOutput = renderResult.getByTestId('test-no-output');
    expect(noOutput).toBeInTheDocument();
    expect(noOutput).toHaveTextContent('No output was returned for this runscript action.');
  });

  it('should not reference file download in no-output message', () => {
    action.outputs = {};
    render();

    const noOutput = renderResult.getByTestId('test-no-output');
    expect(noOutput.textContent).not.toContain('download');
  });

  it('should render nothing visible when stdout and stderr are both empty', () => {
    action.outputs = {
      'agent-a': {
        content: {
          code: '200',
          stdout: '',
          stderr: '',
        },
        type: 'text',
      },
    };

    render();

    expect(renderResult.queryByTestId('test-stdout')).toBeNull();
    expect(renderResult.queryByTestId('test-stderr')).toBeNull();
    expect(renderResult.queryByTestId('test-no-output')).toBeNull();
  });
});
