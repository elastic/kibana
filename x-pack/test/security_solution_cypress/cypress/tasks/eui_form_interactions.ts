/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getComboBoxInputSelector,
  getComboBoxSelectionsSelector,
  getComboBoxSelector,
} from '../screens/eui_form_interactions';

/**
 * Fills an EuiComboBox in a robust way. Ensures that the component is ready to
 * be interacted with, and also that each option was successfully chosen.
 *
 * @param parentSelector CSS Selector targeting the parent EuiComboBox component
 * @param options A string (or strings) to be chosen from the EuiComboBox
 */
export const fillComboBox = ({
  parentSelector,
  options,
}: {
  parentSelector?: string;
  options: string | string[];
}) => {
  const _options = options instanceof Array ? options : [options];

  const comboBoxSelector = getComboBoxSelector(parentSelector);
  const comboBoxInputSelector = getComboBoxInputSelector(parentSelector);
  const comboBoxSelectionsSelector = getComboBoxSelectionsSelector(parentSelector);

  cy.get(comboBoxInputSelector).should('not.be.disabled');

  _options.forEach((option, index) => {
    cy.get(comboBoxSelector).type(`${option}{downArrow}{enter}`);

    if (index === 0) {
      // If we're filling a combobox that only allows a single value, there will be no "selections" to assert upon
      cy.get(comboBoxSelector).should('contain', option);
    } else {
      cy.get(comboBoxSelectionsSelector).eq(index).should('have.text', option);
    }
  });
};
