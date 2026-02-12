/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EXECUTION_EVENTS_EVENT_TYPE_COLUMN,
  EXECUTION_EVENTS_EVENT_TYPE_FILTER,
  EXECUTION_EVENTS_EVENT_TYPE_FILTER_ITEM,
  EXECUTION_EVENTS_LOG_LEVEL_COLUMN,
  EXECUTION_EVENTS_LOG_LEVEL_FILTER,
  EXECUTION_EVENTS_LOG_LEVEL_FILTER_ITEM,
  EXECUTION_EVENTS_MESSAGE_SEARCH,
  EXECUTION_EVENTS_TAB,
  EXECUTION_EVENTS_TABLE,
  EXECUTION_EVENTS_TABLE_ROW,
  EXECUTION_EVENTS_TIMESTAMP_COLUMN,
} from '../screens/execution_events';

export const goToExecutionEventsTab = () => {
  cy.get(EXECUTION_EVENTS_TAB).click();
};

export const getExecutionEventsTableRows = () =>
  cy.get(EXECUTION_EVENTS_TABLE).find(EXECUTION_EVENTS_TABLE_ROW);

export const clearExecutionEventsMessageFilter = () => {
  cy.get(EXECUTION_EVENTS_MESSAGE_SEARCH).clear();
  cy.get(EXECUTION_EVENTS_MESSAGE_SEARCH).trigger('search', { waitForAnimations: true });
};

export const filterExecutionEventsByMessage = (searchTerm: string) => {
  cy.get(EXECUTION_EVENTS_MESSAGE_SEARCH).clear();
  cy.get(EXECUTION_EVENTS_MESSAGE_SEARCH).type(searchTerm, { force: true });
  cy.get(EXECUTION_EVENTS_MESSAGE_SEARCH).trigger('search', { waitForAnimations: true });
  cy.get(EXECUTION_EVENTS_TABLE).should('have.class', 'euiBasicTable-loading');
  cy.get(EXECUTION_EVENTS_TABLE).should('not.have.class', 'euiBasicTable-loading');
};

export const filterExecutionEventsByLogLevel = (logLevel: string) => {
  cy.get(EXECUTION_EVENTS_LOG_LEVEL_FILTER).click();
  cy.get(EXECUTION_EVENTS_LOG_LEVEL_FILTER_ITEM).contains(logLevel).click();
  // Close the popover
  cy.get(EXECUTION_EVENTS_LOG_LEVEL_FILTER).click();
};

export const filterExecutionEventsByEventType = (eventType: string) => {
  cy.get(EXECUTION_EVENTS_EVENT_TYPE_FILTER).click();
  cy.get(EXECUTION_EVENTS_EVENT_TYPE_FILTER_ITEM).contains(eventType).click();
  // Close the popover
  cy.get(EXECUTION_EVENTS_EVENT_TYPE_FILTER).click();
};

export const assertAllEventsHaveLogLevel = (logLevel: string) => {
  getExecutionEventsTableRows().should(($rows) => {
    expect($rows.length).to.be.at.least(1);
    $rows.each((_, row) => {
      const logLevelBadge = Cypress.$(row).find(EXECUTION_EVENTS_LOG_LEVEL_COLUMN);
      expect(logLevelBadge.text()).to.contain(logLevel);
    });
  });
};

export const assertAllEventsHaveType = (status: string) => {
  getExecutionEventsTableRows().should(($rows) => {
    expect($rows.length).to.be.at.least(1);
    $rows.each((_, row) => {
      const statusBadge = Cypress.$(row).find(EXECUTION_EVENTS_EVENT_TYPE_COLUMN);
      expect(statusBadge.text()).to.contain(status);
    });
  });
};

export const assertAllEventsHaveTimestamp = (timestamp: string) => {
  getExecutionEventsTableRows().should(($rows) => {
    expect($rows.length).to.be.at.least(1);
    $rows.each((_, row) => {
      const timestampBadge = Cypress.$(row).find(EXECUTION_EVENTS_TIMESTAMP_COLUMN);
      expect(timestampBadge.text()).to.contain(timestamp);
    });
  });
};

export const expandAllRows = () => {
  getExecutionEventsTableRows().should('have.length.at.least', 1);

  getExecutionEventsTableRows().each(($row) => {
    cy.wrap($row).find('[data-test-subj="executionEventsTable-expandButton"]').click();
  });
};

export const collapseAllRows = () => {
  getExecutionEventsTableRows().each(($row) => {
    cy.wrap($row).find('[data-test-subj="executionEventsTable-collapseButton"]').click();
  });
};

export const assertAllEventsHaveMessageContaining = (message: string) => {
  getExecutionEventsTableRows().should('have.length.at.least', 1);

  getExecutionEventsTableRows().each(($row, index) => {
    // Verify expanded content contains the message
    cy.wrap($row)
      .next('.euiTableRow-isExpandedRow')
      .find('[data-test-subj="executionEventsTable-eventDetails"]')
      .should('exist')
      .find('.euiCodeBlock')
      .first()
      .should('contain.text', message);
  });
};

export const assertEventsAreSortedByTimestamp = (direction: 'asc' | 'desc') => {
  getExecutionEventsTableRows().should(($rows) => {
    expect($rows.length).to.be.at.least(2);

    // Take timestamp strings from every row, convert to numbers
    const timestamps = $rows
      .map((_, row) =>
        new Date(Cypress.$(row).find(EXECUTION_EVENTS_TIMESTAMP_COLUMN).text()).getTime()
      )
      .get();

    const sorted = [...timestamps].sort((a, b) => (direction === 'asc' ? a - b : b - a));

    expect(timestamps).to.deep.equal(sorted);
  });
};
