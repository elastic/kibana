/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AppContextTestRender } from '../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../common/mock/endpoint';
import { EndpointActionGenerator } from '../../../../../common/endpoint/data_generators/endpoint_action_generator';
import type {
  KillProcessActionOutputContent,
  KilledProcessDescendant,
} from '../../../../../common/endpoint/types';
import type { ProcessTreeProps } from './process_tree';
import { ProcessTree } from './process_tree';

describe('ProcessTree', () => {
  const testPrefix = 'test';

  let appTestContext: AppContextTestRender;
  let generator: EndpointActionGenerator;
  let processList: KilledProcessDescendant[];
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let render: (props?: Partial<ProcessTreeProps>) => ReturnType<AppContextTestRender['render']>;

  beforeEach(() => {
    appTestContext = createAppRootMockRenderer();
    generator = new EndpointActionGenerator('test');

    const response = generator.generateResponse<KillProcessActionOutputContent>({
      EndpointActions: { data: { command: 'kill-process' } },
    });

    processList = response.EndpointActions.data.output?.content.descendants ?? [];

    render = (props = {}) =>
      (renderResult = appTestContext.render(
        <ProcessTree processList={processList} data-test-subj={testPrefix} {...props} />
      ));
  });

  it('should render the no-processes message when the list is empty', () => {
    const { getByTestId } = render({ processList: [] });

    expect(getByTestId(testPrefix).textContent).toContain(
      'No process descendants information available for display'
    );
  });

  it('should render a node for each process in the list', () => {
    const { getByTestId } = render();

    // Roots and their descendants (see EndpointActionGenerator kill-process output)
    [456, 567, 5671, 56711, 56712, 654].forEach((pid) => {
      expect(getByTestId(`${testPrefix}-${pid}`)).not.toBeNull();
    });
  });

  it('should render the details for each process node', () => {
    const { getAllByTestId } = render();

    expect(getAllByTestId(`${testPrefix}-456-details`)[0].textContent).toContain('456_command.exe');
    expect(getAllByTestId(`${testPrefix}-567-details`)[0].textContent).toContain('567_command.exe');
  });

  it('should nest a child process under its parent', () => {
    const { getByTestId } = render();

    // 567 is a child of 456
    const parentChildrenContainer = getByTestId(`${testPrefix}-456-children`);

    expect(
      parentChildrenContainer.querySelector(`[data-test-subj="${testPrefix}-567"]`)
    ).not.toBeNull();
  });

  it('should render the failure message for a process that was not killed', () => {
    const { getAllByTestId } = render();

    // pid 654 has `was_killed: false` and an error in the generated output
    const details = getAllByTestId(`${testPrefix}-654-details`)[0].textContent ?? '';

    expect(details).toContain('Not killed');
    expect(details).toContain('process is protected');
  });

  it('should render only root nodes at the top level', () => {
    render();

    // 456 and 654 are the roots (their parent_pid 234 is not in the list)
    expect(renderResult.getByTestId(`${testPrefix}-456`)).not.toBeNull();
    expect(renderResult.getByTestId(`${testPrefix}-654`)).not.toBeNull();
  });
});
