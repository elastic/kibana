/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { recurse } from 'cypress-recurse';
import { KIBANA_LOADING_ICON } from '../screens/security_header';
import { EUI_BASIC_TABLE_LOADING } from '../screens/common/controls';

const primaryButton = 0;

/**
 * To overcome the React Beautiful DND sloppy click detection threshold:
 * https://github.com/atlassian/react-beautiful-dnd/blob/67b96c8d04f64af6b63ae1315f74fc02b5db032b/docs/sensors/mouse.md#sloppy-clicks-and-click-prevention-
 */
const dndSloppyClickDetectionThreshold = 5;

/** Starts dragging the subject */
export const drag = (subject: JQuery<HTMLElement>) => {
  const subjectLocation = subject[0].getBoundingClientRect();

  // Use cypress-real-events
  // eslint-disable-next-line cypress/no-unnecessary-waiting,cypress/unsafe-to-chain-command
  cy.wrap(subject)
    .trigger('mousedown', {
      button: primaryButton,
      clientX: subjectLocation.left,
      clientY: subjectLocation.top,
      force: true,
    })
    .wait(300)
    .trigger('mousemove', {
      button: primaryButton,
      clientX: subjectLocation.left + dndSloppyClickDetectionThreshold,
      clientY: subjectLocation.top,
      force: true,
    })
    .wait(300);
};

/** "Drops" the subject being dragged on the specified drop target  */
export const drop = (dropTarget: JQuery<HTMLElement>) => {
  const targetLocation = dropTarget[0].getBoundingClientRect();
  // eslint-disable-next-line cypress/no-unnecessary-waiting,cypress/unsafe-to-chain-command
  cy.wrap(dropTarget)
    .trigger('mousemove', {
      button: primaryButton,
      clientX: targetLocation.left,
      clientY: targetLocation.top,
      force: true,
    })
    .wait(300)
    .trigger('mouseup', { force: true })
    .wait(300);
};

export const reload = () => {
  cy.reload();
  cy.contains('a', 'Security');
};

const clearSessionStorage = () => {
  cy.window().then((win) => {
    win.sessionStorage.clear();
  });
};

export const resetRulesTableState = () => {
  clearSessionStorage();
};

export const scrollToBottom = () => cy.scrollTo('bottom');

export const waitForWelcomePanelToBeLoaded = () => {
  cy.get(KIBANA_LOADING_ICON).should('exist');
  cy.get(KIBANA_LOADING_ICON).should('not.exist');
};

export const waitForTableToLoad = () => {
  cy.get(EUI_BASIC_TABLE_LOADING).should('exist');
  cy.get(EUI_BASIC_TABLE_LOADING).should('not.exist');
};

export const waitForTabToBeLoaded = (tabId: string) => {
  recurse(
    () => cy.get(tabId).click(),
    ($el) => expect($el).to.have.class('euiTab-isSelected'),
    {
      delay: 500,
    }
  );
};
