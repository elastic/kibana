/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConsoleResponseActionCommands } from '../../../../common/endpoint/service/response_actions/constants';

const RESPONDER_PAGE = 'consolePageOverlay';

export const getConsoleHelpPanelResponseActionTestSubj = (): Record<
  // TODO: currently runscript and cancel are not supported in Endpoint
  Exclude<ConsoleResponseActionCommands, 'runscript' | 'cancel' | 'memory-dump'>,
  string
> => {
  return {
    isolate: 'endpointResponseActionsConsole-commandList-Responseactions-isolate',
    release: 'endpointResponseActionsConsole-commandList-Responseactions-release',
    processes: 'endpointResponseActionsConsole-commandList-Responseactions-processes',
    'kill-process': 'endpointResponseActionsConsole-commandList-Responseactions-kill-process',
    'suspend-process': 'endpointResponseActionsConsole-commandList-Responseactions-suspend-process',
    'get-file': 'endpointResponseActionsConsole-commandList-Responseactions-get-file',
    execute: 'endpointResponseActionsConsole-commandList-Responseactions-execute',
    upload: 'endpointResponseActionsConsole-commandList-Responseactions-upload',
    scan: 'endpointResponseActionsConsole-commandList-Responseactions-scan',
    // Not implemented in Endpoint yet
    // cancel: 'endpointResponseActionsConsole-commandList-Responseactions-cancel',
    // runscript: 'endpointResponseActionsConsole-commandList-Responseactions-runscript',
  };
};

export const ensureOnResponder = (): Cypress.Chainable<JQuery<HTMLDivElement>> => {
  return cy.getByTestSubj<HTMLDivElement>(RESPONDER_PAGE).should('exist');
};

export const openConsoleHelpPanel = (): Cypress.Chainable => {
  ensureOnResponder();
  return cy.getByTestSubj('endpointResponseActionsConsole-header-helpButton').click();
};
