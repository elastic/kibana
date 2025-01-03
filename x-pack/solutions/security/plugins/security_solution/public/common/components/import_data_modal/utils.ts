/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ErrorToastOptions, Toast, ToastInput, ToastOptions } from '@kbn/core/public';

import * as i18n from './translations';

import type {
  ImportDataResponse,
  ImportResponseError,
  ImportRulesResponseError,
  ExceptionsImportError,
} from '../../../detection_engine/rule_management/logic';

export const formatError = (
  i18nFailedDetailedMessage: (message: string) => string,
  importResponse: ImportDataResponse,
  errors: Array<ImportRulesResponseError | ImportResponseError | ExceptionsImportError>
) => {
  const formattedErrors = errors.map((e) => i18nFailedDetailedMessage(e.error.message));
  const error: Error & { raw_network_error?: object } = new Error(formattedErrors.join('. '));
  error.stack = undefined;
  error.name = 'Network errors';
  error.raw_network_error = importResponse;

  return error;
};

const mapErrorMessageToUserMessage = (
  actionConnectorsErrors: Array<ImportRulesResponseError | ImportResponseError>
) => {
  let concatenatedActionIds: string = '';
  const mappedErrors = actionConnectorsErrors.map((connectorError) => {
    // Using "as ImportResponseError" because the "id" field belongs only to
    // "ImportResponseError" and if the connectorError has the id we use it to get the
    // number of failing connectors by spliting the unique the connectors ids.
    const { id, error } = connectorError as ImportResponseError;
    concatenatedActionIds =
      concatenatedActionIds && concatenatedActionIds !== id ? `${concatenatedActionIds},${id}` : id;
    const { status_code: statusCode, message: originalMessage } = error || {};
    let message;
    switch (statusCode) {
      case 403:
        message = i18n.ACTION_CONNECTORS_ADDITIONAL_PRIVILEGES;
        break;

      default:
        message = originalMessage;

        break;
    }
    return { ...connectorError, error: { ...error, message } };
  });
  const actionIds: Set<string> = new Set(
    concatenatedActionIds && [...concatenatedActionIds.split(',')]
  );
  return { mappedErrors, numberOfActions: actionIds.size };
};

export const showToasterMessage = ({
  importResponse,
  exceptionsIncluded,
  actionConnectorsIncluded,
  successMessage,
  errorMessage,
  errorMessageDetailed,
  addError,
  addSuccess,
}: {
  importResponse: ImportDataResponse;
  exceptionsIncluded: boolean;
  actionConnectorsIncluded: boolean;
  successMessage: (totalCount: number) => string;
  errorMessage: (totalCount: number) => string;
  errorMessageDetailed: (message: string) => string;
  addError: (error: unknown, options: ErrorToastOptions) => Toast;
  addSuccess: (toastOrTitle: ToastInput, options?: ToastOptions | undefined) => Toast;
}) => {
  if (importResponse.success) {
    if (importResponse.success_count > 0) addSuccess(successMessage(importResponse.success_count));
    if (
      exceptionsIncluded &&
      importResponse.exceptions_success &&
      importResponse.exceptions_success_count != null &&
      importResponse.exceptions_success_count > 0
    ) {
      addSuccess(i18n.SUCCESSFULLY_IMPORTED_EXCEPTIONS(importResponse.exceptions_success_count));
    }
    if (
      actionConnectorsIncluded &&
      importResponse.action_connectors_success &&
      importResponse.action_connectors_success_count != null &&
      importResponse.action_connectors_success_count > 0
    ) {
      addSuccess(
        i18n.SUCCESSFULLY_IMPORTED_CONNECTORS(importResponse.action_connectors_success_count)
      );
    }
    return;
  }

  if (importResponse.errors.length > 0) {
    if (
      actionConnectorsIncluded &&
      importResponse.action_connectors_errors != null &&
      importResponse.action_connectors_errors.length > 0
    ) {
      const { mappedErrors: userErrorMessages, numberOfActions } = mapErrorMessageToUserMessage(
        importResponse.action_connectors_errors
      );
      const connectorError = formatError(errorMessageDetailed, importResponse, userErrorMessages);

      return addError(connectorError, {
        title: i18n.IMPORT_CONNECTORS_FAILED(numberOfActions || userErrorMessages.length),
      });
    }
    const ruleError = formatError(errorMessageDetailed, importResponse, importResponse.errors);
    addError(ruleError, { title: errorMessage(importResponse.errors.length) });

    if (
      exceptionsIncluded &&
      importResponse.exceptions_errors != null &&
      importResponse.exceptions_errors.length > 0
    ) {
      const exceptionError = formatError(
        errorMessageDetailed,
        importResponse,
        importResponse.exceptions_errors
      );

      addError(exceptionError, {
        title: i18n.IMPORT_FAILED(importResponse.exceptions_errors.length),
      });
    }
  }
};
