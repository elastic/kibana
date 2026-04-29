/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash/fp';
import type { IToasts } from '@kbn/core/public';

import * as i18n from './translations';

import type { ErrorSchema, ImportRulesResponse } from '../../../../../common/api/detection_engine';
import { showErrorToast } from '../../../../common/components/utils';

export function getFailedConnectorsCount(actionConnectorsErrors: ErrorSchema[]) {
  const connectorIds = new Set(
    actionConnectorsErrors
      .filter((connectorError) => connectorError.id)
      .flatMap((connectorError) => (connectorError.id || '').split(','))
  );

  return connectorIds.size;
}

function getShortErrorMessage(errorMessages: string[]): string {
  if (errorMessages.length === 0) {
    return '';
  }

  if (errorMessages.length === 1) {
    return errorMessages[0];
  }

  return i18n.MULTIPLE_ISSUES;
}

function getUserFriendlyConnectorMessages(actionConnectorsErrors: ErrorSchema[]): string[] {
  const mappedErrors = actionConnectorsErrors.map(({ error }) => {
    if (error.status_code === 403) {
      return i18n.ACTION_CONNECTORS_ADDITIONAL_PRIVILEGES;
    }

    return error.message;
  });

  return mappedErrors;
}

export function showToast({
  importResponse,
  toasts,
}: {
  importResponse: ImportRulesResponse;
  toasts: IToasts;
}) {
  if (importResponse.success_count > 0) {
    toasts.addSuccess(i18n.SUCCESSFULLY_IMPORTED_RULES(importResponse.success_count));
  }

  if (importResponse.exceptions_success_count > 0) {
    toasts.addSuccess(
      i18n.SUCCESSFULLY_IMPORTED_EXCEPTIONS(importResponse.exceptions_success_count)
    );
  }

  if (importResponse.action_connectors_success_count > 0) {
    toasts.addSuccess(
      i18n.SUCCESSFULLY_IMPORTED_CONNECTORS(importResponse.action_connectors_success_count)
    );
  }

  const connectorMessages = getUserFriendlyConnectorMessages(
    importResponse.action_connectors_errors
  );
  const uniqueActionConnectorMessages = uniq(connectorMessages);
  if (uniqueActionConnectorMessages.length > 0) {
    showErrorToast({
      title: i18n.CONNECTOR_IMPORT_FAILED(
        getFailedConnectorsCount(importResponse.action_connectors_errors)
      ),
      shortMessage: getShortErrorMessage(uniqueActionConnectorMessages),
      fullMessage: JSON.stringify(importResponse.action_connectors_errors, null, 2),
      toasts,
    });
  }

  const uniqueRuleErrors = uniq(importResponse.errors.map((error) => error.error.message));
  if (uniqueRuleErrors.length > 0) {
    showErrorToast({
      title: i18n.RULE_IMPORT_FAILED(importResponse.errors.length),
      shortMessage: getShortErrorMessage(uniqueRuleErrors),
      fullMessage: JSON.stringify(importResponse.errors, null, 2),
      toasts,
    });
  }

  const uniqueExceptionErrors = uniq(
    importResponse.exceptions_errors.map((error) => error.error.message)
  );
  if (uniqueExceptionErrors.length > 0) {
    showErrorToast({
      title: i18n.EXCEPTION_IMPORT_FAILED(importResponse.exceptions_errors.length),
      shortMessage: getShortErrorMessage(uniqueExceptionErrors),
      fullMessage: JSON.stringify(importResponse.exceptions_errors, null, 2),
      toasts,
    });
  }
}
