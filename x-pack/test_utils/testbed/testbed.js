/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import { MemoryRouter, Route } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Provider } from 'react-redux';
import { mountWithIntl } from '../enzyme_helpers';
import { findTestSubject as findTestSubjectHelper } from '../index';

const registerTestSubjExists = component => (testSubject, count = 1) => findTestSubjectHelper(component, testSubject).length === count;

const defaultOptions = {
  memoryRouter: {
    wrapRoute: true,
  },
};

const withRoute = (WrappedComponent, componentRoutePath = '/', onRouter = () => {}) => {
  return class extends Component {
      static contextTypes = {
        router: PropTypes.object
      };

      componentDidMount() {
        const { router } = this.context;
        onRouter(router);
      }

      render() {
        return (
          <Route
            path={componentRoutePath}
            render={(props) => <WrappedComponent {...props} {...this.props} />}
          />
        );
      }
  };
};


/**
 * Register a testBed for a React component to be tested inside a Redux provider
 *
 * @param {React.SFC} Component A react component to test
 * @param {object} defaultProps Props to initialize the component with
 * @param {object} store The Redux store to initialize the Redux Provider with
 *
 * @returns {object} with the following properties:
 *
 * - component The component wrapped by the Redux provider
 * - exists() Method to check if a test subject exists in the mounted component
 * - find() Method to find a test subject in the mounted componenet
 * - setProp() Method to update the props on the wrapped component
 * - getFormErrorsMessages() Method that will find all the "".euiFormErrorText" from eui and return their text
 * - getMetadataFromEuiTable() Method that will extract the table rows and column + their values from an Eui tablle component
 * - form.setInput() Method to update a form input value
 * - form.selectCheckBox() Method to select a form checkbox
 */
export const registerTestBed = (Component, defaultProps, store = {}) => (props, options = defaultOptions) => {
  const Comp = options.memoryRouter.wrapRoute === false
    ? Component
    : withRoute(Component, options.memoryRouter.componentRoutePath, options.memoryRouter.onRouter);

  const component = mountWithIntl(
    <Provider store={store}>
      <MemoryRouter
        initialEntries={options.memoryRouter.initialEntries || ['/']}
        initialIndex={options.memoryRouter.initialIndex || 0}
      >
        <Comp {...defaultProps} {...props} />
      </MemoryRouter>
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
    const table = find(tableTestSubject);

    if (!table.length) {
      throw new Error(`Eui Table "${tableTestSubject}" not found.`);
    }

    const rows = table
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
