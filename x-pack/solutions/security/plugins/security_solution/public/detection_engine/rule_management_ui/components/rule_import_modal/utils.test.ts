/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IToasts } from '@kbn/core/public';
import { getFailedConnectorsCount, showToast } from './utils';
import { mockImportResponse } from './test_utils';

describe('showToast', () => {
  const toastsMock = {
    addError: jest.fn(),
    addSuccess: jest.fn(),
  } as unknown as jest.Mocked<IToasts>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays success toast if rule import is successful', () => {
    showToast({
      importResponse: mockImportResponse({
        success: true,
        success_count: 1,
      }),
      toasts: toastsMock,
    });

    expect(toastsMock.addSuccess).toHaveBeenCalledWith('Successfully imported 1 rule');
    expect(toastsMock.addError).not.toHaveBeenCalled();
  });

  it('displays three success toasts if rules, action connectors and exception imports succeed', () => {
    showToast({
      importResponse: mockImportResponse({
        success: true,
        success_count: 1,
        exceptions_success: true,
        exceptions_success_count: 1,
        action_connectors_success: true,
        action_connectors_success_count: 1,
      }),
      toasts: toastsMock,
    });

    expect(toastsMock.addSuccess).toHaveBeenCalledTimes(3);
    expect(toastsMock.addSuccess).toHaveBeenNthCalledWith(1, 'Successfully imported 1 rule');
    expect(toastsMock.addSuccess).toHaveBeenNthCalledWith(2, 'Successfully imported 1 exception');
    expect(toastsMock.addSuccess).toHaveBeenNthCalledWith(3, 'Successfully imported 1 connector');
    expect(toastsMock.addError).not.toHaveBeenCalled();
  });

  //

  it('displays error toast if import of a single rule fails', () => {
    showToast({
      importResponse: mockImportResponse({
        success: false,
        success_count: 0,
        rules_count: 1,
        errors: [
          {
            rule_id: 'rule_id',
            error: {
              status_code: 400,
              message: 'rule import error message',
            },
          },
        ],
      }),
      toasts: toastsMock,
    });

    expect(toastsMock.addError).toHaveBeenCalledTimes(1);
    expect(toastsMock.addError).toHaveBeenNthCalledWith(1, new Error('Error details'), {
      title: 'Failed to import 1 rule',
      toastMessage: 'rule import error message',
    });
    expect(toastsMock.addSuccess).not.toHaveBeenCalled();
  });

  it('displays error toast if import of multiple rules fails with the same error', () => {
    showToast({
      importResponse: mockImportResponse({
        success: false,
        success_count: 0,
        rules_count: 2,
        errors: [
          {
            rule_id: 'rule_id',
            error: {
              status_code: 400,
              message: 'rule import error message',
            },
          },
          {
            rule_id: 'another_rule_id',
            error: {
              status_code: 400,
              message: 'rule import error message',
            },
          },
        ],
      }),
      toasts: toastsMock,
    });

    expect(toastsMock.addError).toHaveBeenCalledTimes(1);
    expect(toastsMock.addError).toHaveBeenNthCalledWith(1, new Error('Error details'), {
      title: 'Failed to import 2 rules',
      toastMessage: 'rule import error message',
    });
    expect(toastsMock.addSuccess).not.toHaveBeenCalled();
  });

  it('displays error toast if import of multiple rules fails with different errors', () => {
    showToast({
      importResponse: mockImportResponse({
        success: false,
        success_count: 0,
        rules_count: 2,
        errors: [
          {
            rule_id: 'rule_id',
            error: {
              status_code: 400,
              message: 'rule import error message',
            },
          },
          {
            rule_id: 'another_rule_id',
            error: {
              status_code: 400,
              message: 'another rule import error message',
            },
          },
        ],
      }),
      toasts: toastsMock,
    });
    expect(toastsMock.addError).toHaveBeenCalledTimes(1);
    expect(toastsMock.addError).toHaveBeenNthCalledWith(1, new Error('Error details'), {
      title: 'Failed to import 2 rules',
      toastMessage: 'Multiple issues. See the full error for details.',
    });
    expect(toastsMock.addSuccess).not.toHaveBeenCalled();
  });

  it('displays error toast if import of a single exception fails', () => {
    showToast({
      importResponse: mockImportResponse({
        success: true,
        success_count: 0,
        rules_count: 1,
        exceptions_errors: [
          {
            list_id: 'list_id',
            error: {
              status_code: 400,
              message: 'exception import error message',
            },
          },
        ],
      }),
      toasts: toastsMock,
    });

    expect(toastsMock.addError).toHaveBeenCalledTimes(1);
    expect(toastsMock.addError).toHaveBeenNthCalledWith(1, new Error('Error details'), {
      title: 'Failed to import 1 exception',
      toastMessage: 'exception import error message',
    });
    expect(toastsMock.addSuccess).not.toHaveBeenCalled();
  });

  it('displays error toast if import of multiple exceptions fails with the same error', () => {
    showToast({
      importResponse: mockImportResponse({
        success: true,
        success_count: 0,
        rules_count: 1,
        exceptions_errors: [
          {
            list_id: 'list_id',
            error: {
              status_code: 400,
              message: 'exception import error message',
            },
          },
          {
            list_id: 'another_list_id',
            error: {
              status_code: 400,
              message: 'exception import error message',
            },
          },
        ],
      }),
      toasts: toastsMock,
    });

    expect(toastsMock.addError).toHaveBeenCalledTimes(1);
    expect(toastsMock.addError).toHaveBeenNthCalledWith(1, new Error('Error details'), {
      title: 'Failed to import 2 exceptions',
      toastMessage: 'exception import error message',
    });
    expect(toastsMock.addSuccess).not.toHaveBeenCalled();
  });

  it('displays error toast if import of multiple exceptions fails with different errors', () => {
    showToast({
      importResponse: mockImportResponse({
        success: true,
        success_count: 0,
        rules_count: 1,
        exceptions_errors: [
          {
            list_id: 'list_id',
            error: {
              status_code: 400,
              message: 'exception import error message',
            },
            rule_id: 'rule_id',
          },
          {
            list_id: 'another_list_id',
            error: {
              status_code: 400,
              message: 'another exception import error message',
            },
            rule_id: 'another_rule_id',
          },
        ],
      }),
      toasts: toastsMock,
    });

    expect(toastsMock.addError).toHaveBeenCalledTimes(1);
    expect(toastsMock.addError).toHaveBeenNthCalledWith(1, new Error('Error details'), {
      title: 'Failed to import 2 exceptions',
      toastMessage: 'Multiple issues. See the full error for details.',
    });
    expect(toastsMock.addSuccess).not.toHaveBeenCalled();
  });

  it('displays error toast if import of a single action connector fails', () => {
    showToast({
      importResponse: mockImportResponse({
        success: true,
        success_count: 0,
        rules_count: 1,
        action_connectors_errors: [
          {
            id: 'connector_id',
            error: {
              status_code: 400,
              message: 'action connector import error message',
            },
          },
        ],
      }),
      toasts: toastsMock,
    });

    expect(toastsMock.addError).toHaveBeenCalledTimes(1);
    expect(toastsMock.addError).toHaveBeenNthCalledWith(1, new Error('Error details'), {
      title: 'Failed to import 1 connector',
      toastMessage: 'action connector import error message',
    });
    expect(toastsMock.addSuccess).not.toHaveBeenCalled();
  });

  it('displays error toast if import of a single action connector fails with a 403', () => {
    showToast({
      importResponse: mockImportResponse({
        success: true,
        success_count: 0,
        rules_count: 1,
        action_connectors_errors: [
          {
            id: 'connector_id',
            error: {
              status_code: 403,
              message: 'action connector import error message',
            },
          },
        ],
      }),
      toasts: toastsMock,
    });

    expect(toastsMock.addError).toHaveBeenCalledTimes(1);
    expect(toastsMock.addError).toHaveBeenNthCalledWith(1, new Error('Error details'), {
      title: 'Failed to import 1 connector',
      toastMessage: 'You need additional privileges to import rules with actions.',
    });
    expect(toastsMock.addSuccess).not.toHaveBeenCalled();
  });

  it('displays error toast if import of multiple action connectors fails with the same error', () => {
    showToast({
      importResponse: mockImportResponse({
        success: true,
        success_count: 0,
        rules_count: 1,
        action_connectors_errors: [
          {
            id: 'connector_id',
            error: {
              status_code: 400,
              message: 'action connector import error message',
            },
          },
          {
            id: 'another_connector_id',
            error: {
              status_code: 400,
              message: 'action connector import error message',
            },
          },
        ],
      }),
      toasts: toastsMock,
    });

    expect(toastsMock.addError).toHaveBeenCalledTimes(1);
    expect(toastsMock.addError).toHaveBeenNthCalledWith(1, new Error('Error details'), {
      title: 'Failed to import 2 connectors',
      toastMessage: 'action connector import error message',
    });
  });

  it('displays error toast if import of multiple action connectors fails with different errors', () => {
    showToast({
      importResponse: mockImportResponse({
        success: true,
        success_count: 0,
        rules_count: 1,
        action_connectors_errors: [
          {
            id: 'connector_id',
            error: {
              status_code: 400,
              message: 'action connector import error message',
            },
          },
          {
            id: 'another_connector_id',
            error: {
              status_code: 400,
              message: 'another action connector import error message',
            },
          },
        ],
      }),
      toasts: toastsMock,
    });

    expect(toastsMock.addError).toHaveBeenCalledTimes(1);
    expect(toastsMock.addError).toHaveBeenNthCalledWith(1, new Error('Error details'), {
      title: 'Failed to import 2 connectors',
      toastMessage: 'Multiple issues. See the full error for details.',
    });
    expect(toastsMock.addSuccess).not.toHaveBeenCalled();
  });

  it('displays error toast if connector import error does not specify connector ID', () => {
    showToast({
      importResponse: mockImportResponse({
        success: true,
        success_count: 0,
        rules_count: 1,
        action_connectors_errors: [
          {
            error: {
              status_code: 400,
              message: 'Some connector import error message',
            },
          },
        ],
      }),
      toasts: toastsMock,
    });

    expect(toastsMock.addError).toHaveBeenCalledTimes(1);
    expect(toastsMock.addError).toHaveBeenNthCalledWith(1, new Error('Error details'), {
      title: 'Failed to import connectors',
      toastMessage: 'Some connector import error message',
    });
    expect(toastsMock.addSuccess).not.toHaveBeenCalled();
  });

  it('displays three error toasts if importing rules, action connectors and exceptions fail', () => {
    showToast({
      importResponse: mockImportResponse({
        success: false,
        success_count: 0,
        rules_count: 1,
        errors: [
          {
            rule_id: 'rule_id',
            error: {
              status_code: 400,
              message: 'rule import error message',
            },
          },
        ],
        exceptions_errors: [
          {
            list_id: 'list_id',
            error: {
              status_code: 400,
              message: 'exception import error message',
            },
          },
        ],
        action_connectors_errors: [
          {
            id: 'connector_id',
            error: {
              status_code: 400,
              message: 'action connector import error message',
            },
          },
        ],
      }),
      toasts: toastsMock,
    });

    expect(toastsMock.addError).toHaveBeenCalledTimes(3);
    expect(toastsMock.addError).toHaveBeenNthCalledWith(1, new Error('Error details'), {
      title: 'Failed to import 1 connector',
      toastMessage: 'action connector import error message',
    });
    expect(toastsMock.addError).toHaveBeenNthCalledWith(2, new Error('Error details'), {
      title: 'Failed to import 1 rule',
      toastMessage: 'rule import error message',
    });
    expect(toastsMock.addError).toHaveBeenNthCalledWith(3, new Error('Error details'), {
      title: 'Failed to import 1 exception',
      toastMessage: 'exception import error message',
    });
    expect(toastsMock.addSuccess).not.toHaveBeenCalled();
  });

  it('displays error toast if connector error specifies multiple connector IDs within the "id" field', () => {
    showToast({
      importResponse: mockImportResponse({
        success: true,
        success_count: 1,
        rules_count: 1,
        action_connectors_success: false,
        errors: [],
        action_connectors_errors: [
          {
            rule_id: 'rule_id',
            id: 'connector1,connector2',
            error: {
              status_code: 400,
              message: 'action connector import error message',
            },
          },
          {
            rule_id: 'rule_id',
            id: 'connector3',
            error: {
              status_code: 400,
              message: 'action connector import error message',
            },
          },
        ],
        exceptions_success: true,
        exceptions_success_count: 0,
      }),
      toasts: toastsMock,
    });

    expect(toastsMock.addError).toHaveBeenCalledTimes(1);
    expect(toastsMock.addError).toHaveBeenCalledWith(new Error('Error details'), {
      title: 'Failed to import 3 connectors',
      toastMessage: 'action connector import error message',
    });
  });

  it('displays error toast if connector error specifies a single connector ID within the "id" field', () => {
    showToast({
      importResponse: mockImportResponse({
        success: true,
        success_count: 1,
        rules_count: 1,
        action_connectors_success: false,
        errors: [],
        action_connectors_errors: [
          {
            rule_id: 'rule_id',
            id: 'connector1',
            error: {
              status_code: 400,
              message: 'action connector import error message',
            },
          },
        ],
        exceptions_success: true,
        exceptions_success_count: 0,
      }),
      toasts: toastsMock,
    });

    expect(toastsMock.addError).toHaveBeenCalledTimes(1);
    expect(toastsMock.addError).toHaveBeenCalledWith(new Error('Error details'), {
      title: 'Failed to import 1 connector',
      toastMessage: 'action connector import error message',
    });
  });
});

describe('getFailedConnectorsCount - calculates the number of failed connector imports', () => {
  it('if single connector ID is specified in the "id" field', () => {
    expect(
      getFailedConnectorsCount([
        {
          rule_id: 'rule_id',
          id: 'connector1',
          error: {
            status_code: 400,
            message: 'action connector import error message',
          },
        },
      ])
    ).toBe(1);
  });

  it('if multiple connector IDs are specified in the same "id" field', () => {
    expect(
      getFailedConnectorsCount([
        {
          rule_id: 'rule_id',
          id: 'connector1,connector2',
          error: {
            status_code: 400,
            message: 'action connector import error message',
          },
        },
      ])
    ).toBe(2);
  });

  it('if multiple connector IDs are specified in different "id" fields', () => {
    expect(
      getFailedConnectorsCount([
        {
          rule_id: 'rule_id',
          id: 'connector1,connector2',
          error: {
            status_code: 400,
            message: 'action connector import error message',
          },
        },
        {
          rule_id: 'rule_id',
          id: 'connector1',
          error: {
            status_code: 400,
            message: 'another action connector import error message',
          },
        },
        {
          rule_id: 'rule_id',
          id: 'connector2',
          error: {
            status_code: 400,
            message: 'yet another action connector import error message',
          },
        },
        {
          rule_id: 'rule_id',
          id: 'connector3',
          error: {
            status_code: 400,
            message: 'still a different action connector import error message',
          },
        },
      ])
    ).toBe(3);
  });

  it('if no connector IDs are specified', () => {
    expect(
      getFailedConnectorsCount([
        {
          rule_id: 'rule_id',
          error: {
            status_code: 400,
            message: 'action connector import error message',
          },
        },
      ])
    ).toBe(0);
  });
});
