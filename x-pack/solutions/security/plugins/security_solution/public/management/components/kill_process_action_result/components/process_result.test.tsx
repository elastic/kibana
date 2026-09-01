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
  });

  it('should not render entity id when `showEntityId` is false', () => {
    const { getByTestId } = render({ showEntityId: false });
    const output = getByTestId(testPrefix).textContent ?? '';

    expect(output).toContain('PID 1234');
    expect(output).not.toContain('Entity ID entity-a');
    expect(output).toContain('Name malware.exe');
  });

  it('should only render the fields that are present', () => {
    processResult = { pid: 1234 };

    const { getByTestId } = render();
    const output = getByTestId(testPrefix).textContent ?? '';

    expect(output).toContain('PID 1234');
    expect(output).not.toContain('Entity ID');
    expect(output).not.toContain('Name');
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

  it('should render the not-killed failure message when an error is present', () => {
    processResult = { pid: 1234, error: 'process failed to exit' };

    const { getByTestId } = render();

    expect(getByTestId(testPrefix).textContent).toContain('Not killed');
  });

  it('should render the not-suspended failure message an error is present', () => {
    processResult = { pid: 1234, error: 'process failed to exit' };

    const { getByTestId } = render({ command: 'suspend-process' });

    expect(getByTestId(testPrefix).textContent).toContain('Not suspended');
  });

  it('should render the failure message when an error is present', () => {
    processResult = { pid: 1234, error: 'process is protected' };

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

  describe('when `code` maps to a known response code message', () => {
    it('should display the response code message instead of the default success message', () => {
      processResult = { pid: 1234, code: 'ra_kill-process_success_partial-descendants' };

      const { getByTestId } = render();

      expect(getByTestId(testPrefix).textContent).toContain(
        'Action completed successfully, but some descendants were not killed'
      );
    });

    it('should display the response code message for descendant success code', () => {
      processResult = { pid: 1234, code: 'ra_kill-process_descendant_success_done' };

      const { getByTestId } = render();

      expect(getByTestId(testPrefix).textContent).toContain('Killed');
    });

    it('should display the response code message instead of the default failure message when an error is present', () => {
      processResult = {
        pid: 1234,
        error: 'process failed to exit',
        code: 'ra_kill-process_descendant_error_failure',
      };

      const { getByTestId } = render();

      expect(getByTestId(testPrefix).textContent).toContain('Failed to kill process');
      expect(getByTestId(testPrefix).textContent).not.toContain('Not killed');
    });

    it('should display the response code message for descendant not-permitted error', () => {
      processResult = {
        pid: 1234,
        error: 'permission denied',
        code: 'ra_kill-process_descendant_error_not-permitted',
      };

      const { getByTestId } = render();

      expect(getByTestId(testPrefix).textContent).toContain('Process cannot be killed');
      expect(getByTestId(testPrefix).textContent).not.toContain('Not killed');
    });
  });

  describe('when `code` indicates a "not-found" condition', () => {
    it('should treat `ra_kill-process_error_not-found` as success even when an error is present', () => {
      processResult = {
        pid: 1234,
        error: 'process not found',
        code: 'ra_kill-process_error_not-found',
      };

      const { getByTestId } = render();

      expect(getByTestId(testPrefix).textContent).toContain('The provided process was not found');
      expect(getByTestId(testPrefix).textContent).not.toContain('Not killed');
    });

    it('should treat `ra_kill-process_descendant_error_not-found` as success even when an error is present', () => {
      processResult = {
        pid: 1234,
        error: 'descendant process not found',
        code: 'ra_kill-process_descendant_error_not-found',
      };

      const { getByTestId } = render();

      expect(getByTestId(testPrefix).textContent).toContain(
        'Process was not found (may have terminated prior to action being taken)'
      );
      expect(getByTestId(testPrefix).textContent).not.toContain('Not killed');
    });
  });

  describe('when `code` is absent or unknown', () => {
    it('should fall back to the default success message when there is no error and no code', () => {
      processResult = { pid: 1234 };

      const { getByTestId } = render();

      expect(getByTestId(testPrefix).textContent).toContain('Killed');
    });

    it('should fall back to the default failure message including error text when code is absent', () => {
      processResult = { pid: 1234, error: 'something went wrong' };

      const { getByTestId } = render();

      expect(getByTestId(testPrefix).textContent).toContain('Not killed - something went wrong');
    });
  });
});
