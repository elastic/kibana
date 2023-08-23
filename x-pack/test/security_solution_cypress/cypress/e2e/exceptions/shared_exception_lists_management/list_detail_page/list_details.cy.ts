/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { tag } from '../../../../tags';

import { getExceptionList } from '../../../../objects/exception';
import { getNewRule } from '../../../../objects/rule';

import { login, visitWithoutDateRange } from '../../../../tasks/login';
import { createRule } from '../../../../tasks/api_calls/rules';
import { EXCEPTIONS_URL, exceptionsListDetailsUrl } from '../../../../urls/navigation';
import {
  createSharedExceptionList,
  editExceptionLisDetails,
  linkSharedListToRulesFromListDetails,
  saveLinkedRules,
  validateSharedListLinkedRules,
  waitForExceptionListDetailToBeLoaded,
} from '../../../../tasks/exceptions_table';
import { createExceptionList } from '../../../../tasks/api_calls/exceptions';
import {
  EXCEPTIONS_LIST_MANAGEMENT_NAME,
  EXCEPTIONS_LIST_MANAGEMENT_DESCRIPTION,
  EXCEPTION_LIST_DETAILS_LINK_RULES_BTN,
} from '../../../../screens/exceptions';

const LIST_NAME = 'My exception list';
const UPDATED_LIST_NAME = 'Updated exception list';
const LIST_DESCRIPTION = 'This is the exception list description.';
const UPDATED_LIST_DESCRIPTION = 'This is an updated version of the exception list description.';

const getExceptionList1 = () => ({
  ...getExceptionList(),
  name: LIST_NAME,
  description: LIST_DESCRIPTION,
  list_id: 'exception_list_test',
});

const EXCEPTION_LIST_NAME = 'Newly created list';

describe('Exception list detail page', { tags: [tag.ESS, tag.SERVERLESS] }, () => {
  before(() => {
    cy.task('esArchiverResetKibana');
    login();

    // Create exception list associated with a rule
    createExceptionList(getExceptionList1(), getExceptionList1().list_id).then((response) =>
      createRule(
        getNewRule({
          exceptions_list: [
            {
              id: response.body.id,
              list_id: getExceptionList1().list_id,
              type: getExceptionList1().type,
              namespace_type: getExceptionList1().namespace_type,
            },
          ],
        })
      )
    );
    createRule(getNewRule({ name: 'Rule to link to shared list' }));
  });

  beforeEach(() => {
    login();
    visitWithoutDateRange(EXCEPTIONS_URL);
  });

  it('Should edit list details', () => {
    visitWithoutDateRange(exceptionsListDetailsUrl(getExceptionList1().list_id));
    waitForExceptionListDetailToBeLoaded();
    // Check list details are loaded
    cy.get(EXCEPTIONS_LIST_MANAGEMENT_NAME).should('have.text', LIST_NAME);
    cy.get(EXCEPTIONS_LIST_MANAGEMENT_DESCRIPTION).should('have.text', LIST_DESCRIPTION);

    // Update list details in edit modal
    editExceptionLisDetails({
      name: { original: LIST_NAME, updated: UPDATED_LIST_NAME },
      description: { original: LIST_DESCRIPTION, updated: UPDATED_LIST_DESCRIPTION },
    });

    // Ensure that list details were updated
    cy.get(EXCEPTIONS_LIST_MANAGEMENT_NAME).should('have.text', UPDATED_LIST_NAME);
    cy.get(EXCEPTIONS_LIST_MANAGEMENT_DESCRIPTION).should('have.text', UPDATED_LIST_DESCRIPTION);

    // Ensure that list details changes persisted
    visitWithoutDateRange(exceptionsListDetailsUrl(getExceptionList1().list_id));
    cy.get(EXCEPTIONS_LIST_MANAGEMENT_NAME).should('have.text', UPDATED_LIST_NAME);
    cy.get(EXCEPTIONS_LIST_MANAGEMENT_DESCRIPTION).should('have.text', UPDATED_LIST_DESCRIPTION);

    // Remove description
    editExceptionLisDetails({
      description: { original: UPDATED_LIST_DESCRIPTION, updated: null },
    });
    cy.get(EXCEPTIONS_LIST_MANAGEMENT_DESCRIPTION).should('have.text', 'Add a description');

    // Ensure description removal persisted
    visitWithoutDateRange(exceptionsListDetailsUrl(getExceptionList1().list_id));
    cy.get(EXCEPTIONS_LIST_MANAGEMENT_DESCRIPTION).should('have.text', 'Add a description');
  });

  it('Should create a new list and link it to two rules', () => {
    createSharedExceptionList(
      { name: 'Newly created list', description: 'This is my list.' },
      true
    );

    // After creation - directed to list detail page
    cy.get(EXCEPTIONS_LIST_MANAGEMENT_NAME).should('have.text', EXCEPTION_LIST_NAME);

    // Open Link rules flyout
    cy.get(EXCEPTION_LIST_DETAILS_LINK_RULES_BTN).click();

    // Link the first two Rules
    linkSharedListToRulesFromListDetails(2);

    // Save the 2 linked Rules
    saveLinkedRules();

    const linkedRulesNames = ['Rule to link to shared list', 'New Rule Test'];

    // Validate the number of linked rules as well as the Rules' names
    validateSharedListLinkedRules(2, linkedRulesNames);
  });
});
