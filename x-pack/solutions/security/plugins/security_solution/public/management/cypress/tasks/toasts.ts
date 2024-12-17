/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { subj as testSubjSelector } from '@kbn/test-subj-selector';
import pRetry from 'p-retry';

const toastCloseButtonSelector = testSubjSelector('toastCloseButton');

/**
 * Closes all currently displayed Toasts (if any)
 */
export const closeAllToasts = (): Cypress.Chainable<JQuery<HTMLBodyElement>> => {
  const noToastsFoundError = new Error('none found');

  return cy.get('body').then(($body) => {
    return pRetry(
      async () => {
        const toasts = $body.find(toastCloseButtonSelector);

        if (toasts.length) {
          return toasts;
        } else {
          throw noToastsFoundError;
        }
      },
      { retries: 3, forever: false }
    )
      .then(($toasts) => {
        $toasts.each((_, $toast) => $toast.click());
        return $body;
      })
      .catch((error) => {
        if (error !== noToastsFoundError) {
          throw error;
        }

        return $body;
      });
  });
};

export const expectAndCloseSuccessToast = () => {
  cy.contains('Success');
  cy.getByTestSubj('toastCloseButton').click();
  cy.contains('Success').should('not.exist');
};

/**
 * Checks to see if the Toast normally shown by the kibana stack, indicating
 * _"Your browser does not meet the security requirements for Kibana."_ and if so, it closes it
 */
export const closeKibanaBrowserSecurityToastIfNecessary = (): Cypress.Chainable<
  JQuery<HTMLElementTagNameMap['body']>
> => {
  const toastMessage = 'Your browser does not meet the security requirements for Kibana';
  const subjectSelector = `${testSubjSelector(
    'euiToastHeader__title'
  )}:contains('${toastMessage}')`;
  const notFound = new Error('notFound');

  return cy.get('body').then(($body) => {
    return pRetry(
      async () => {
        const toasts = $body.find(subjectSelector).closest('.euiToast');

        if (toasts.length) {
          cy.log(
            `Found ${toasts.length} toast(s) with "${toastMessage}" ----> Will close it/them.`
          );
          return toasts;
        } else {
          throw notFound;
        }
      },
      { retries: 3, forever: false }
    )
      .then(($toasts) => {
        $toasts.find(toastCloseButtonSelector).each((_, $toastCLoseButton) => {
          $toastCLoseButton.click();
        });
        return $body;
      })
      .catch((error) => {
        if (error !== notFound) {
          throw error;
        }

        return $body;
      });
  });
};
