/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Provider } from 'react-redux';
import { mountWithIntl } from '../enzyme_helpers';
import { findTestSubject as findTestSubjectHelper } from '@elastic/eui/lib/test';

const registerTestSubjExists = component => (testSubject, count = 1) => findTestSubjectHelper(component, testSubject).length === count;

export const registerTestBed = (Component, defaultProps, store = {}) => (props) => {
  const component = mountWithIntl(
    <Provider store={store}>
      <Component
        {...defaultProps}
        {...props}
      />
    </Provider>
  );

  const setProps = (props) => component.setProps({
    children: (
      <Component
        {...defaultProps}
        {...props}
      />
    )
  });

  const exists = registerTestSubjExists(component);
  const find = testSubject => findTestSubjectHelper(component, testSubject);

  const getFormErrorsMessages = () => {
    const errorMessagesWrappers = component.find('.euiFormErrorText');
    return errorMessagesWrappers.map(err => err.text());
  };

  const setInputValue = (inputTestSubject, value, isAsync = false) => {
    const formInput = find(inputTestSubject);
    formInput.simulate('change', { target: { value } });
    component.update();

    // In some cases, changing an input value triggers an http request to validate
    // it. Even by returning immediately the response on the mock server we need
    // to wait until the next tick before the DOM updates.
    // Setting isAsync to "true" solves that problem.
    if (!isAsync) {
      return;
    }
    return new Promise((resolve) => setTimeout(resolve));
  };

  const selectCheckBox = (checkboxTestSubject) => {
    find(checkboxTestSubject).simulate('change', { target: { checked: true } });
  };

  /**
   * Helper to parse an EUI table and return its rows and column reactWrapper
   *
   * @param {ReactWrapper} table enzyme react wrapper of the EuiBasicTable
   */
  const getMetadataFromEuiTable = (tableTestSubject) => {
    const rows = find(tableTestSubject)
      .find('tr')
      .slice(1) // we remove the first row as it is the table header
      .map(row => ({
        reactWrapper: row,
        columns: row.find('td').map(col => ({
          reactWrapper: col,
          // We can't access the td value with col.text() because
          // eui adds an extra div in td on mobile => (.euiTableRowCell__mobileHeader)
          value: col.find('.euiTableCellContent').text()
        }))
      }));

    // Also output the raw cell values, in the following format: [[td0, td1, td2], [td0, td1, td2]]
    const tableCellsValues = rows.map(({ columns }) => columns.map(col => col.value));
    return { rows, tableCellsValues };
  };

  return {
    component,
    exists,
    find,
    setProps,
    getFormErrorsMessages,
    getMetadataFromEuiTable,
    form: {
      setInputValue,
      selectCheckBox
    }
  };
};
