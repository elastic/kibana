/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { showToasterMessage } from './utils';

describe('showToasterMessage', () => {
  describe('exceptionsIncluded is false', () => {
    it('should display main success message if import was successful', () => {
      const addError = jest.fn();
      const addSuccess = jest.fn();

      showToasterMessage({
        importResponse: {
          success: true,
          success_count: 1,
          errors: [],
        },
        exceptionsIncluded: false,
        actionConnectorsIncluded: false,
        successMessage: (msg) => `success: ${msg}`,
        errorMessage: (msg) => `error: ${msg}`,
        errorMessageDetailed: (msg) => `errorDetailed: ${msg}`,
        addError,
        addSuccess,
      });

      expect(addSuccess).toHaveBeenCalledTimes(1);
      expect(addSuccess).toHaveBeenCalledWith('success: 1');
      expect(addError).not.toHaveBeenCalled();
    });

    it('should display main error message if import was not successful', () => {
      const addError = jest.fn();
      const addSuccess = jest.fn();

      showToasterMessage({
        importResponse: {
          success: false,
          success_count: 0,
          errors: [
            {
              rule_id: 'rule_id',
              error: {
                status_code: 400,
                message: 'an error message',
              },
            },
          ],
        },
        exceptionsIncluded: false,
        actionConnectorsIncluded: false,
        successMessage: (msg) => `success: ${msg}`,
        errorMessage: (msg) => `error: ${msg}`,
        errorMessageDetailed: (msg) => `errorDetailed: ${msg}`,
        addError,
        addSuccess,
      });

      expect(addError).toHaveBeenCalledTimes(1);
      expect(addError).toHaveBeenCalledWith(new Error('errorDetailed: an error message'), {
        title: 'error: 1',
      });
      expect(addSuccess).not.toHaveBeenCalled();
    });
  });

  describe('exceptionsIncluded is true', () => {
    it('should display success message for rules and exceptions if both succeed', () => {
      const addError = jest.fn();
      const addSuccess = jest.fn();

      showToasterMessage({
        importResponse: {
          success: true,
          success_count: 1,
          rules_count: 1,
          errors: [],
          exceptions_errors: [],
          exceptions_success: true,
          exceptions_success_count: 1,
        },
        exceptionsIncluded: true,
        actionConnectorsIncluded: false,
        successMessage: (msg) => `success: ${msg}`,
        errorMessage: (msg) => `error: ${msg}`,
        errorMessageDetailed: (msg) => `errorDetailed: ${msg}`,
        addError,
        addSuccess,
      });

      expect(addSuccess).toHaveBeenCalledTimes(2);
      expect(addSuccess).toHaveBeenNthCalledWith(1, 'success: 1');
      expect(addSuccess).toHaveBeenNthCalledWith(2, 'Successfully imported 1 exception.');
      expect(addError).not.toHaveBeenCalled();
    });

    it('should display error message for rules and exceptions if both fail', () => {
      const addError = jest.fn();
      const addSuccess = jest.fn();

      showToasterMessage({
        importResponse: {
          success: false,
          success_count: 1,
          rules_count: 2,
          errors: [
            {
              rule_id: 'rule_id',
              error: {
                status_code: 400,
                message: 'an error message',
              },
            },
          ],
          exceptions_errors: [
            {
              list_id: 'list_id_1',
              error: {
                status_code: 400,
                message: 'an error message',
              },
            },
            {
              list_id: 'list_id',
              error: {
                status_code: 400,
                message: 'another error message',
              },
            },
          ],
          exceptions_success: false,
          exceptions_success_count: 0,
        },
        exceptionsIncluded: true,
        actionConnectorsIncluded: false,
        successMessage: (msg) => `success: ${msg}`,
        errorMessage: (msg) => `error: ${msg}`,
        errorMessageDetailed: (msg) => `errorDetailed: ${msg}`,
        addError,
        addSuccess,
      });

      expect(addError).toHaveBeenCalledTimes(2);
      expect(addError).toHaveBeenNthCalledWith(1, new Error('errorDetailed: an error message'), {
        title: 'error: 1',
      });
      expect(addError).toHaveBeenNthCalledWith(
        2,
        new Error('errorDetailed: an error message. errorDetailed: another error message'),
        {
          title: 'Failed to import 2 exceptions',
        }
      );
      expect(addSuccess).not.toHaveBeenCalled();
    });

    it('should display only a rule toaster if no exceptions were imported', () => {
      const addError = jest.fn();
      const addSuccess = jest.fn();

      showToasterMessage({
        importResponse: {
          success: true,
          success_count: 1,
          rules_count: 1,
          errors: [],
          exceptions_errors: [],
          exceptions_success: true,
          exceptions_success_count: 0,
        },
        exceptionsIncluded: true,
        actionConnectorsIncluded: false,
        successMessage: (msg) => `success: ${msg}`,
        errorMessage: (msg) => `error: ${msg}`,
        errorMessageDetailed: (msg) => `errorDetailed: ${msg}`,
        addError,
        addSuccess,
      });

      expect(addSuccess).toHaveBeenCalledTimes(1);
      expect(addSuccess).toHaveBeenNthCalledWith(1, 'success: 1');
      expect(addError).not.toHaveBeenCalled();
    });

    it('should display only an exceptions toaster if no rules were imported', () => {
      const addError = jest.fn();
      const addSuccess = jest.fn();

      showToasterMessage({
        importResponse: {
          success: true,
          success_count: 0,
          rules_count: 0,
          errors: [],
          exceptions_errors: [],
          exceptions_success: true,
          exceptions_success_count: 1,
        },
        exceptionsIncluded: true,
        actionConnectorsIncluded: false,
        successMessage: (msg) => `success: ${msg}`,
        errorMessage: (msg) => `error: ${msg}`,
        errorMessageDetailed: (msg) => `errorDetailed: ${msg}`,
        addError,
        addSuccess,
      });

      expect(addSuccess).toHaveBeenCalledTimes(1);
      expect(addSuccess).toHaveBeenNthCalledWith(1, 'Successfully imported 1 exception.');
      expect(addError).not.toHaveBeenCalled();
    });
  });

  describe('actionConnectorsIncluded is false', () => {
    it('should display main success message if import was successful', () => {
      const addError = jest.fn();
      const addSuccess = jest.fn();

      showToasterMessage({
        importResponse: {
          success: true,
          success_count: 1,
          errors: [],
        },
        exceptionsIncluded: false,
        actionConnectorsIncluded: false,
        successMessage: (msg) => `success: ${msg}`,
        errorMessage: (msg) => `error: ${msg}`,
        errorMessageDetailed: (msg) => `errorDetailed: ${msg}`,
        addError,
        addSuccess,
      });

      expect(addSuccess).toHaveBeenCalledTimes(1);
      expect(addSuccess).toHaveBeenCalledWith('success: 1');
      expect(addError).not.toHaveBeenCalled();
    });

    it('should display main error message if import was not successful', () => {
      const addError = jest.fn();
      const addSuccess = jest.fn();

      showToasterMessage({
        importResponse: {
          success: false,
          success_count: 0,
          errors: [
            {
              rule_id: 'rule_id',
              error: {
                status_code: 400,
                message: 'an error message',
              },
            },
          ],
        },
        exceptionsIncluded: false,
        actionConnectorsIncluded: false,
        successMessage: (msg) => `success: ${msg}`,
        errorMessage: (msg) => `error: ${msg}`,
        errorMessageDetailed: (msg) => `errorDetailed: ${msg}`,
        addError,
        addSuccess,
      });

      expect(addError).toHaveBeenCalledTimes(1);
      expect(addError).toHaveBeenCalledWith(new Error('errorDetailed: an error message'), {
        title: 'error: 1',
      });
      expect(addSuccess).not.toHaveBeenCalled();
    });
  });
  describe('actionConnectorsIncluded is true', () => {
    it('should display success message for rules and connectors if both succeed', () => {
      const addError = jest.fn();
      const addSuccess = jest.fn();

      showToasterMessage({
        importResponse: {
          success: true,
          success_count: 1,
          rules_count: 1,
          errors: [],
          exceptions_errors: [],
          exceptions_success: true,
          exceptions_success_count: 0,
          action_connectors_success: true,
          action_connectors_errors: [],
          action_connectors_success_count: 1,
        },
        exceptionsIncluded: false,
        actionConnectorsIncluded: true,
        successMessage: (msg) => `success: ${msg}`,
        errorMessage: (msg) => `error: ${msg}`,
        errorMessageDetailed: (msg) => `errorDetailed: ${msg}`,
        addError,
        addSuccess,
      });

      expect(addSuccess).toHaveBeenCalledTimes(2);
      expect(addSuccess).toHaveBeenNthCalledWith(1, 'success: 1');
      expect(addSuccess).toHaveBeenNthCalledWith(2, 'Successfully imported 1 connector.');
      expect(addError).not.toHaveBeenCalled();
    });
    it('should display 1 error message has 2 invalid connectors in the title even when error array has one message but "id" field', () => {
      const addError = jest.fn();
      const addSuccess = jest.fn();

      showToasterMessage({
        importResponse: {
          success: false,
          success_count: 1,
          rules_count: 2,
          action_connectors_success: false,
          errors: [
            {
              rule_id: 'rule_id',
              error: {
                status_code: 400,
                message: 'an error message',
              },
            },
          ],
          action_connectors_errors: [
            {
              rule_id: 'rule_id',
              id: 'connector1,connector2',
              error: {
                status_code: 400,
                message: 'an error message',
              },
            },
          ],
          exceptions_success: true,
          exceptions_success_count: 0,
        },
        exceptionsIncluded: false,
        actionConnectorsIncluded: true,
        successMessage: (msg) => `success: ${msg}`,
        errorMessage: (msg) => `error: ${msg}`,
        errorMessageDetailed: (msg) => `errorDetailed: ${msg}`,
        addError,
        addSuccess,
      });

      expect(addError).toHaveBeenCalledTimes(1);

      expect(addError).toHaveBeenCalledWith(new Error('errorDetailed: an error message'), {
        title: 'Failed to import 2 connectors',
      });
      expect(addSuccess).not.toHaveBeenCalled();
    });
    it('should display 1 error message has 1 invalid connectors in the title even when error array has one message but "id" field', () => {
      const addError = jest.fn();
      const addSuccess = jest.fn();

      showToasterMessage({
        importResponse: {
          success: false,
          success_count: 1,
          rules_count: 2,
          action_connectors_success: false,
          errors: [
            {
              rule_id: 'rule_id',
              error: {
                status_code: 400,
                message: 'an error message',
              },
            },
          ],
          action_connectors_errors: [
            {
              rule_id: 'rule_id',
              id: 'connector1',
              error: {
                status_code: 400,
                message: 'an error message',
              },
            },
          ],
          exceptions_success: true,
          exceptions_success_count: 0,
        },
        exceptionsIncluded: false,
        actionConnectorsIncluded: true,
        successMessage: (msg) => `success: ${msg}`,
        errorMessage: (msg) => `error: ${msg}`,
        errorMessageDetailed: (msg) => `errorDetailed: ${msg}`,
        addError,
        addSuccess,
      });

      expect(addError).toHaveBeenCalledTimes(1);

      expect(addError).toHaveBeenCalledWith(new Error('errorDetailed: an error message'), {
        title: 'Failed to import 1 connector',
      });
      expect(addSuccess).not.toHaveBeenCalled();
    });
    it('should display 1 error message for rules and connectors even when both fail', () => {
      const addError = jest.fn();
      const addSuccess = jest.fn();

      showToasterMessage({
        importResponse: {
          success: false,
          success_count: 1,
          rules_count: 2,
          action_connectors_success: false,
          errors: [
            {
              rule_id: 'rule_id',
              error: {
                status_code: 400,
                message: 'an error message',
              },
            },
          ],
          action_connectors_errors: [
            {
              rule_id: 'rule_id',
              error: {
                status_code: 400,
                message: 'an error message',
              },
            },
            {
              rule_id: 'rule_id_1',
              error: {
                status_code: 400,
                message: 'another error message',
              },
            },
          ],
          exceptions_success: true,
          exceptions_success_count: 0,
        },
        exceptionsIncluded: false,
        actionConnectorsIncluded: true,
        successMessage: (msg) => `success: ${msg}`,
        errorMessage: (msg) => `error: ${msg}`,
        errorMessageDetailed: (msg) => `errorDetailed: ${msg}`,
        addError,
        addSuccess,
      });

      expect(addError).toHaveBeenCalledTimes(1);

      expect(addError).toHaveBeenCalledWith(
        new Error('errorDetailed: an error message. errorDetailed: another error message'),
        {
          title: 'Failed to import 2 connectors',
        }
      );
      expect(addSuccess).not.toHaveBeenCalled();
    });

    it('should display only a rule toaster if no connectors were imported', () => {
      const addError = jest.fn();
      const addSuccess = jest.fn();

      showToasterMessage({
        importResponse: {
          success: true,
          success_count: 1,
          rules_count: 1,
          errors: [],
          exceptions_errors: [],
          exceptions_success: true,
          exceptions_success_count: 0,
          action_connectors_errors: [],
          action_connectors_success: true,
        },
        exceptionsIncluded: true,
        actionConnectorsIncluded: false,
        successMessage: (msg) => `success: ${msg}`,
        errorMessage: (msg) => `error: ${msg}`,
        errorMessageDetailed: (msg) => `errorDetailed: ${msg}`,
        addError,
        addSuccess,
      });

      expect(addSuccess).toHaveBeenCalledTimes(1);
      expect(addSuccess).toHaveBeenNthCalledWith(1, 'success: 1');
      expect(addError).not.toHaveBeenCalled();
    });

    it('should display only a connector toaster if no rules were imported', () => {
      const addError = jest.fn();
      const addSuccess = jest.fn();

      showToasterMessage({
        importResponse: {
          success: true,
          success_count: 0,
          rules_count: 0,
          errors: [],
          exceptions_errors: [],
          exceptions_success: true,
          exceptions_success_count: 0,
          action_connectors_success_count: 1,
          action_connectors_success: true,
        },
        exceptionsIncluded: true,
        actionConnectorsIncluded: true,
        successMessage: (msg) => `success: ${msg}`,
        errorMessage: (msg) => `error: ${msg}`,
        errorMessageDetailed: (msg) => `errorDetailed: ${msg}`,
        addError,
        addSuccess,
      });

      expect(addSuccess).toHaveBeenCalledTimes(1);
      expect(addSuccess).toHaveBeenNthCalledWith(1, 'Successfully imported 1 connector.');
      expect(addError).not.toHaveBeenCalled();
    });
    it('should display the user friendly message in case of additional privileges', () => {
      const addError = jest.fn();
      const addSuccess = jest.fn();

      showToasterMessage({
        importResponse: {
          success: false,
          success_count: 1,
          rules_count: 2,
          action_connectors_success: false,
          errors: [
            {
              rule_id: 'unknown',
              error: {
                status_code: 403,
                message:
                  'You may not have actions privileges required to import rules with actions',
              },
            },
          ],
          action_connectors_errors: [
            {
              rule_id: 'unknown',
              error: {
                status_code: 403,
                message:
                  'You may not have actions privileges required to import rules with actions',
              },
            },
            {
              rule_id: 'unknown',
              error: {
                status_code: 403,
                message:
                  'You may not have actions privileges required to import rules with actions',
              },
            },
          ],
          exceptions_success: true,
          exceptions_success_count: 0,
        },
        exceptionsIncluded: false,
        actionConnectorsIncluded: true,
        successMessage: (msg) => `success: ${msg}`,
        errorMessage: (msg) => `error: ${msg}`,
        errorMessageDetailed: (msg) => `errorDetailed: ${msg}`,
        addError,
        addSuccess,
      });

      expect(addError).toHaveBeenCalledTimes(1);

      expect(addError).toHaveBeenCalledWith(
        new Error(
          'errorDetailed: You need additional privileges to import rules with actions.. errorDetailed: You need additional privileges to import rules with actions.'
        ),
        {
          title: 'Failed to import 2 connectors',
        }
      );
      expect(addSuccess).not.toHaveBeenCalled();
    });
  });
});
