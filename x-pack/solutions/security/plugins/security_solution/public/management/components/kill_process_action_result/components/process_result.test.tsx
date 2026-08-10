/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AppContextTestRender } from '../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../common/mock/endpoint';
import type { ProcessResultProps } from './process_result';
import { ProcessResult } from './process_result';

describe('ProcessResult', () => {
  const testPrefix = 'test';

  let appTestContext: AppContextTestRender;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let processResult: ProcessResultProps['processResult'];
  let render: (props?: Partial<ProcessResultProps>) => ReturnType<AppContextTestRender['render']>;

  beforeEach(() => {
    appTestContext = createAppRootMockRenderer();
    processResult = {
      pid: 1234,
      entity_id: 'entity-a',
      process_name: 'malware.exe',
      command: 'malware.exe --run',
      was_killed: true,
    };

    render = (props = {}) =>
      (renderResult = appTestContext.render(
        <ProcessResult
          command="kill-process"
          processResult={processResult}
          data-test-subj={testPrefix}
          {...props}
        />
      ));
  });

  it('should render all process fields when they are present', () => {
    const { getByTestId } = render();
    const output = getByTestId(testPrefix).textContent ?? '';

    expect(output).toContain('PID 1234');
    expect(output).toContain('Entity ID entity-a');
    expect(output).toContain('Name malware.exe');
    expect(output).toContain('Command malware.exe --run');
  });

  it('should only render the fields that are present', () => {
    processResult = { pid: 1234, was_killed: true };

    const { getByTestId } = render();
    const output = getByTestId(testPrefix).textContent ?? '';

    expect(output).toContain('PID 1234');
    expect(output).not.toContain('Entity ID');
    expect(output).not.toContain('Name');
    expect(output).not.toContain('Command');
  });

  it('should separate the fields with a data separator', () => {
    const { getByTestId } = render();
    const output = getByTestId(testPrefix).textContent ?? '';

    expect(output).toContain(' | ');
  });

  it('should render the killed success message for a kill-process command', () => {
    const { getByTestId } = render();

    expect(getByTestId(testPrefix).textContent).toContain('Killed');
  });

  it('should render the suspended success message for a suspend-process command', () => {
    const { getByTestId } = render({ command: 'suspend-process' });

    expect(getByTestId(testPrefix).textContent).toContain('Suspended');
  });

  it('should render the not-killed failure message when was_killed is false', () => {
    processResult = { pid: 1234, was_killed: false };

    const { getByTestId } = render();

    expect(getByTestId(testPrefix).textContent).toContain('Not killed');
  });

  it('should render the not-suspended failure message when was_killed is false', () => {
    processResult = { pid: 1234, was_killed: false };

    const { getByTestId } = render({ command: 'suspend-process' });

    expect(getByTestId(testPrefix).textContent).toContain('Not suspended');
  });

  it('should render the failure message when an error is present', () => {
    processResult = { pid: 1234, was_killed: true, error: 'process is protected' };

    const { getByTestId } = render();
    const output = getByTestId(testPrefix).textContent ?? '';

    expect(output).toContain('Not killed');
    expect(output).toContain('process is protected');
  });

  it('should render the success message when the process was killed and has no error', () => {
    const { getByTestId } = render();
    const output = getByTestId(testPrefix).textContent ?? '';

    expect(output).toContain('Killed');
    expect(output).not.toContain('Not killed');
  });

  it('should apply the provided data-test-subj', () => {
    render();

    expect(renderResult.getByTestId(testPrefix)).not.toBeNull();
  });
});
