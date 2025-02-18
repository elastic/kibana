/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const LOAD_CONNECTORS_ERROR_MESSAGE = i18n.translate(
  'xpack.securitySolution.connectors.useLoadConnectors.errorMessage',
  {
    defaultMessage: 'Error loading connectors. Please check your configuration and try again.',
  }
);

export const ENDPOINT_COMMANDS = Object.freeze({
  tried: (command: string) =>
    i18n.translate('xpack.securitySolution.eventDetails.responseActions.endpoint.tried', {
      values: { command },
      defaultMessage: 'tried to execute {command} command',
    }),
  executed: (command: string) =>
    i18n.translate('xpack.securitySolution.eventDetails.responseActions.endpoint.executed', {
      values: { command },
      defaultMessage: 'executed {command} command',
    }),
  pending: (command: string) =>
    i18n.translate('xpack.securitySolution.eventDetails.responseActions.endpoint.pending', {
      values: { command },
      defaultMessage: 'is executing {command} command',
    }),
  failed: (command: string) =>
    i18n.translate('xpack.securitySolution.eventDetails.responseActions.endpoint.failed', {
      values: { command },
      defaultMessage: 'failed to execute {command} command',
    }),
});
