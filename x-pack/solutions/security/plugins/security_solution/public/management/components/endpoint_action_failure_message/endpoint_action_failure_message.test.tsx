/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ActionDetails, MaybeImmutable } from '../../../../common/endpoint/types';
import type { AppContextTestRender } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import { EndpointActionGenerator } from '../../../../common/endpoint/data_generators/endpoint_action_generator';
import { EndpointActionFailureMessage } from './endpoint_action_failure_message';

describe('EndpointActionFailureMessage', () => {
  const testPrefix = 'test';
  const testId = `${testPrefix}-response-action-failure-info`;

  let appTestContext: AppContextTestRender;
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let action: MaybeImmutable<ActionDetails>;

  beforeEach(() => {
    appTestContext = createAppRootMockRenderer();
    action = new EndpointActionGenerator('seed').generateActionDetails({});

    render = () =>
      (renderResult = appTestContext.render(
        <EndpointActionFailureMessage action={action} data-test-subj={testPrefix} />
      ));
  });

  it('should not render when action is not completed', () => {
    action = { ...action, agents: ['agent-fails-a-lot'], isCompleted: false };
    render();
    expect(renderResult.queryByTestId(testId)).toBeNull();
  });

  it('should not render when action is successful', () => {
    action = { ...action, agents: ['agent-fails-a-lot'], wasSuccessful: true };
    render();
    expect(renderResult.queryByTestId(testId)).toBeNull();
  });

  it('should render `unknown error` when no errors/outputs', () => {
    action = {
      ...action,
      agents: ['agent-fails-a-lot'],
      command: 'scan',
      isCompleted: true,
      wasSuccessful: false,
      hosts: {
        'agent-fails-a-lot': {
          name: 'Fails-a-lot',
        },
      },
      errors: undefined,
      agentState: {
        'agent-fails-a-lot': {
          isCompleted: true,
          wasSuccessful: false,
          completedAt: new Date().toISOString(),
          errors: undefined,
        },
      },
      outputs: undefined,
    };
    render();
    const { getByTestId } = renderResult;
    const unknownErrorMessage = getByTestId(testId);

    expect(unknownErrorMessage).not.toBeNull();
    expect(unknownErrorMessage.textContent).toEqual(
      'The following errors were encountered:An unknown error occurred'
    );
  });

  describe('when there is a single agent for the action', () => {
    it('should show errors and outputs for an agent', () => {
      action = {
        ...action,
        agents: ['agent-fails-a-lot'],
        command: 'scan',
        isCompleted: true,
        wasSuccessful: false,
        hosts: {
          'agent-fails-a-lot': {
            name: 'Fails-a-lot',
          },
        },
        errors: ['Error info A', 'Error info B', 'Error info C'],
        agentState: {
          'agent-fails-a-lot': {
            isCompleted: true,
            wasSuccessful: false,
            completedAt: new Date().toISOString(),
            errors: ['Error info A', 'Error info B', 'Error info C'],
          },
        },
        outputs: {
          'agent-fails-a-lot': {
            type: 'json',
            content: {
              code: 'ra_scan_error_queue-quota',
            },
          },
        },
      };
      render();
      const { getByTestId } = renderResult;

      const errorMessages = getByTestId(testId);
      expect(errorMessages).not.toBeNull();
      expect(errorMessages.textContent).toContain(
        'The following errors were encountered:Too many scans are queued | Error info A | Error info B | Error info C'
      );
    });

    it('should show errors for an agent when unknown output code', () => {
      action = {
        ...action,
        agents: ['agent-fails-a-lot'],
        command: 'scan',
        isCompleted: true,
        wasSuccessful: false,
        hosts: {
          'agent-fails-a-lot': {
            name: 'Fails-a-lot',
          },
        },
        errors: ['Error info A', 'Error info B', 'Error info C'],
        agentState: {
          'agent-fails-a-lot': {
            isCompleted: true,
            wasSuccessful: false,
            completedAt: new Date().toISOString(),
            errors: ['Error info A', 'Error info B', 'Error info C'],
          },
        },
        outputs: {
          'agent-fails-a-lot': {
            type: 'json',
            content: {
              code: 'non_existent_code',
            },
          },
        },
      };
      render();
      const { getByTestId } = renderResult;

      const errorMessages = getByTestId(testId);
      expect(errorMessages).not.toBeNull();
      expect(errorMessages.textContent).toContain(
        'The following errors were encountered:Error info A | Error info B | Error info C'
      );
    });

    it('should show single error for an agent when unknown output code', () => {
      action = {
        ...action,
        agents: ['agent-fails-a-lot'],
        command: 'scan',
        isCompleted: true,
        wasSuccessful: false,
        hosts: {
          'agent-fails-a-lot': {
            name: 'Fails-a-lot',
          },
        },
        errors: ['Error info A'],
        agentState: {
          'agent-fails-a-lot': {
            isCompleted: true,
            wasSuccessful: false,
            completedAt: new Date().toISOString(),
            errors: ['Error info A'],
          },
        },
        outputs: {
          'agent-fails-a-lot': {
            type: 'json',
            content: {
              code: 'non_existent_code',
            },
          },
        },
      };
      render();
      const { getByTestId } = renderResult;

      const errorMessages = getByTestId(testId);
      expect(errorMessages).not.toBeNull();
      expect(errorMessages.textContent).toContain(
        'The following error was encountered:Error info A'
      );
    });
  });

  describe('when there are multiple agents for the action', () => {
    it('should show errors and outputs for each agent grouped by Host/Errors', () => {
      action = {
        ...action,
        agents: ['agent-fails-a-lot', 'agent-errs-a-lot'],
        command: 'scan',
        isCompleted: true,
        wasSuccessful: false,
        hosts: {
          'agent-fails-a-lot': {
            name: 'Fails-a-lot',
          },
          'agent-errs-a-lot': {
            name: 'Errs-a-lot',
          },
        },
        errors: ['Error info A', 'Error info B', 'Error info C'],
        agentState: {
          'agent-fails-a-lot': {
            isCompleted: true,
            wasSuccessful: false,
            completedAt: new Date().toISOString(),
            errors: ['Error info A', 'Error info B', 'Error info C'],
          },
          'agent-errs-a-lot': {
            isCompleted: true,
            wasSuccessful: false,
            completedAt: new Date().toISOString(),
            errors: ['Error info P', 'Error info Q', 'Error info R'],
          },
        },
        outputs: {
          'agent-fails-a-lot': {
            type: 'json',
            content: {
              code: 'ra_scan_error_queue-quota',
            },
          },
          'agent-errs-a-lot': {
            type: 'json',
            content: {
              code: 'ra_scan_error_not-found',
            },
          },
        },
      };
      render();
      const { getByTestId } = renderResult;

      const errorMessages = getByTestId(testId);
      expect(errorMessages).not.toBeNull();
      expect(errorMessages.textContent).toContain(
        'The following errors were encountered:Host: Fails-a-lotErrors: Too many scans are queued | Error info A | Error info B | Error info CHost: Errs-a-lotErrors: File path or folder was not found (404) | Error info P | Error info Q | Error info R'
      );
    });

    it('should show errors for each agent grouped by Host/Errors, when unknown output codes', () => {
      action = {
        ...action,
        agents: ['agent-fails-a-lot', 'agent-errs-a-lot'],
        command: 'scan',
        isCompleted: true,
        wasSuccessful: false,
        hosts: {
          'agent-fails-a-lot': {
            name: 'Fails-a-lot',
          },
          'agent-errs-a-lot': {
            name: 'Errs-a-lot',
          },
        },
        errors: [
          'Error info A',
          'Error info B',
          'Error info C',
          'Error info P',
          'Error info Q',
          'Error info R',
        ],
        agentState: {
          'agent-fails-a-lot': {
            isCompleted: true,
            wasSuccessful: false,
            completedAt: new Date().toISOString(),
            errors: ['Error info A', 'Error info B', 'Error info C'],
          },
          'agent-errs-a-lot': {
            isCompleted: true,
            wasSuccessful: false,
            completedAt: new Date().toISOString(),
            errors: ['Error info P', 'Error info Q', 'Error info R'],
          },
        },
        outputs: {
          'agent-fails-a-lot': {
            type: 'json',
            content: {
              code: 'non_existent_code',
            },
          },
          'agent-errs-a-lot': {
            type: 'json',
            content: {
              code: 'non_existent_code',
            },
          },
        },
      };
      render();
      const { getByTestId } = renderResult;

      const errorMessages = getByTestId(testId);
      expect(errorMessages).not.toBeNull();
      expect(errorMessages.textContent).toContain(
        'The following errors were encountered:Host: Fails-a-lotErrors: Error info A | Error info B | Error info CHost: Errs-a-lotErrors: Error info P | Error info Q | Error info R'
      );
    });

    it('should show errors and outputs for each agent grouped by Host/Errors for agents that have errors', () => {
      action = {
        ...action,
        agents: ['agent-runs-a-lot', 'agent-errs-a-lot'],
        command: 'scan',
        isCompleted: true,
        wasSuccessful: false,
        hosts: {
          'agent-runs-a-lot': {
            name: 'runs-a-lot',
          },
          'agent-errs-a-lot': {
            name: 'Errs-a-lot',
          },
        },
        errors: ['Error info P', 'Error info Q', 'Error info R'],
        agentState: {
          'agent-runs-a-lot': {
            isCompleted: true,
            wasSuccessful: true,
            completedAt: new Date().toISOString(),
            errors: undefined,
          },
          'agent-errs-a-lot': {
            isCompleted: true,
            wasSuccessful: false,
            completedAt: new Date().toISOString(),
            errors: ['Error info P', 'Error info Q', 'Error info R'],
          },
        },
        outputs: {
          'agent-runs-a-lot': {
            type: 'json',
            content: {
              code: 'non_existent_code',
            },
          },
          'agent-errs-a-lot': {
            type: 'json',
            content: {
              code: 'ra_scan_error_not-found',
            },
          },
        },
      };
      render();
      const { getByTestId } = renderResult;

      const errorMessages = getByTestId(testId);
      expect(errorMessages).not.toBeNull();
      expect(errorMessages.textContent).toContain(
        'The following errors were encountered:Host: Errs-a-lotErrors: File path or folder was not found (404) | Error info P | Error info Q | Error info R'
      );
    });

    it('should show errors and outputs for each agent grouped by Host/Errors for agents that have a single error/output code', () => {
      action = {
        ...action,
        agents: ['agent-runs-a-lot', 'agent-errs-a-lot'],
        command: 'scan',
        isCompleted: true,
        wasSuccessful: false,
        hosts: {
          'agent-runs-a-lot': {
            name: 'runs-a-lot',
          },
          'agent-errs-a-lot': {
            name: 'Errs-a-lot',
          },
        },
        errors: [],
        agentState: {
          'agent-runs-a-lot': {
            isCompleted: true,
            wasSuccessful: true,
            completedAt: new Date().toISOString(),
            errors: undefined,
          },
          'agent-errs-a-lot': {
            isCompleted: true,
            wasSuccessful: false,
            completedAt: new Date().toISOString(),
            errors: [],
          },
        },
        outputs: {
          'agent-runs-a-lot': {
            type: 'json',
            content: {
              code: 'non_existent_code',
            },
          },
          'agent-errs-a-lot': {
            type: 'json',
            content: {
              code: 'ra_scan_error_not-found',
            },
          },
        },
      };
      render();
      const { getByTestId } = renderResult;

      const errorMessages = getByTestId(testId);
      expect(errorMessages).not.toBeNull();
      expect(errorMessages.textContent).toContain(
        'The following error was encountered:Host: Errs-a-lotErrors: File path or folder was not found (404)'
      );
    });
  });
});
