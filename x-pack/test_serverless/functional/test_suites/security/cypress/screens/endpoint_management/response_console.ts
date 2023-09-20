/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConsoleResponseActionCommands } from '@kbn/security-solution-plugin/common/endpoint/service/response_actions/constants';

export const getConsoleHelpPanelResponseActionTestSubj = (): Record<
  ConsoleResponseActionCommands,
  string
> => {
  return {
    isolate: 'endpointResponseActionsConsole-commandList-Responseactions-isolate',
    release: 'endpointResponseActionsConsole-commandList-Responseactions-release',
    processes: 'endpointResponseActionsConsole-commandList-Responseactions-processes',
    ['kill-process']: 'endpointResponseActionsConsole-commandList-Responseactions-kill-process',
    ['suspend-process']:
      'endpointResponseActionsConsole-commandList-Responseactions-suspend-process',
    ['get-file']: 'endpointResponseActionsConsole-commandList-Responseactions-get-file',
    execute: 'endpointResponseActionsConsole-commandList-Responseactions-execute',
    upload: 'endpointResponseActionsConsole-commandList-Responseactions-upload',
  };
};

export const ensureResponseConsoleIsOpen = (): Cypress.Chainable => {
  return cy.getByTestSubj('consolePageOverlay').should('exist');
};

export const openConsoleHelpPanel = (): Cypress.Chainable => {
  ensureResponseConsoleIsOpen();
  return cy.getByTestSubj('endpointResponseActionsConsole-header-helpButton').click();
};
