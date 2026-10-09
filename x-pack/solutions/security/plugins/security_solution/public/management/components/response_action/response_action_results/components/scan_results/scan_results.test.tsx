/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ActionDetails, MaybeImmutable } from '../../../../../../../common/endpoint/types';
import type { AppContextTestRender } from '../../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../../common/mock/endpoint';
import { EndpointActionGenerator } from '../../../../../../../common/endpoint/data_generators/endpoint_action_generator';
import { ScanResults } from './scan_results';
import type { ScanResultsProps } from './scan_results';

jest.mock('../action_failure_message', () => ({
  EndpointActionFailureMessage: jest.fn((props: { 'data-test-subj'?: string }) => (
    <div data-test-subj={props['data-test-subj']} />
  )),
}));

describe('ScanResults component', () => {
  const testPrefix = 'test';

  let appTestContext: AppContextTestRender;
  let render: (props?: Partial<ScanResultsProps>) => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let action: MaybeImmutable<ActionDetails>;

  beforeEach(() => {
    appTestContext = createAppRootMockRenderer();
    action = new EndpointActionGenerator('test').generateActionDetails({
      command: 'scan',
      agents: ['agent-a'],
    });

    render = (props = {}) =>
      (renderResult = appTestContext.render(
        <ScanResults action={action} agentId="agent-a" data-test-subj={testPrefix} {...props} />
      ));
  });

  it('should render nothing when the agent action is not completed', () => {
    action = {
      ...action,
      agentState: {
        'agent-a': {
          isCompleted: false,
          wasSuccessful: false,
          wasCanceled: false,
          completedAt: undefined,
          errors: undefined,
        },
      },
    };

    render();

    expect(renderResult.queryByTestId(testPrefix)).toBeNull();
  });

  it('should render an empty container and no failure message when the agent action was successful', () => {
    action = {
      ...action,
      agentState: {
        'agent-a': {
          isCompleted: true,
          wasSuccessful: true,
          wasCanceled: false,
          completedAt: new Date().toISOString(),
          errors: undefined,
        },
      },
    };

    render();

    expect(renderResult.getByTestId(testPrefix)).not.toBeNull();
    expect(renderResult.queryByTestId(`${testPrefix}-failure`)).toBeNull();
  });

  it('should render the failure message when the agent action was not successful', () => {
    action = {
      ...action,
      agentState: {
        'agent-a': {
          isCompleted: true,
          wasSuccessful: false,
          wasCanceled: false,
          completedAt: new Date().toISOString(),
          errors: ['some error'],
        },
      },
    };

    render();

    expect(renderResult.getByTestId(`${testPrefix}-failure`)).not.toBeNull();
  });

  it('should look up the agent state for the provided agentId, not just the first agent', () => {
    action = new EndpointActionGenerator('test').generateActionDetails({
      command: 'scan',
      agents: ['agent-a', 'agent-b'],
    });
    action = {
      ...action,
      agentState: {
        'agent-a': {
          isCompleted: true,
          wasSuccessful: true,
          wasCanceled: false,
          completedAt: new Date().toISOString(),
          errors: undefined,
        },
        'agent-b': {
          isCompleted: true,
          wasSuccessful: false,
          wasCanceled: false,
          completedAt: new Date().toISOString(),
          errors: ['some error'],
        },
      },
    };

    render({ agentId: 'agent-b' });

    expect(renderResult.getByTestId(`${testPrefix}-failure`)).not.toBeNull();
  });
});
