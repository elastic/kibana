/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ComponentType } from 'react';
import { MemoryRouter } from 'react-router-dom';

import { ReactWrapper } from 'enzyme';
import { mountWithIntl } from '../enzyme_helpers';
import { WithMemoryRouter, WithRoute } from '../router_helpers';
import { WithStore } from '../redux_helpers';
import { findTestSubject as findTestSubjectHelper } from './temp_test_subject';

const registerTestSubjExists = (component: ReactWrapper) => (testSubject: string, count = 1) =>
  findTestSubjectHelper(component, testSubject).length === count;

interface TestBedOptions {
  memoryRouter: {
    wrapRoute: boolean;
    initialEntries?: string[];
    initialIndex?: number;
    componentRoutePath?: string;
    onRouter?: (router: MemoryRouter) => void;
  };
}

const defaultOptions: TestBedOptions = {
  memoryRouter: {
    wrapRoute: true,
  },
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
 * - getMetadataFromEuiTable() Method that will extract the table rows and column + their values from an Eui tablle component
 * - form.setInput() Method to update a form input value
 * - form.selectCheckBox() Method to select a form checkbox
 * - form.getErrorsMessages() Method that will find all the "".euiFormErrorText" from eui and return their text
 */
export const registerTestBed = (Component: ComponentType, defaultProps = {}, store = null) => (
  props: any,
  options = defaultOptions
) => {
  const wrapRoute = options.memoryRouter.wrapRoute !== false;

  /**
   * ----------------------------------------------------------------
   * Component mount
   * ----------------------------------------------------------------
   */
  let Comp;

  if (wrapRoute) {
    const { componentRoutePath, onRouter, initialEntries, initialIndex } = options.memoryRouter;

    // Wrap the componenet with a MemoryRouter and attach it to a <Route />
    Comp = WithMemoryRouter(initialEntries, initialIndex)(
      WithRoute(componentRoutePath, onRouter)(Component)
    );

    // Wrap the component with a Redux Provider
    if (store !== null) {
      Comp = WithStore(store)(Comp);
    }
  } else {
    Comp = store !== null ? WithStore(store)(Component) : Component;
  }

  const component = mountWithIntl(<Comp {...props} />);

  const setProps = (updatedProps: any) => {
    if (wrapRoute) {
      throw new Error(
        'setProps() can only be called on a component **not** wrapped by a router route.'
      );
    }
    if (store === null) {
      return component.setProps(updatedProps);
    }
    // Update the props on the Redux Provider children
    return component.setProps({
      children: <Component {...defaultProps} {...updatedProps} />,
    });
  };

  const exists = registerTestSubjExists(component);
  const find = (testSubject: string) => findTestSubjectHelper(component, testSubject);

  /**
   * ----------------------------------------------------------------
   * Forms
   * ----------------------------------------------------------------
   */
  const setInputValue = (input: string | ReactWrapper, value: string, isAsync = false) => {
    const formInput = typeof input === 'string' ? find(input) : input;

    formInput.simulate('change', { target: { value } });
    component.update();

    // In some cases, changing an input value triggers an http request to validate
    // it. Even by returning immediately the response on the mock server we need
    // to wait until the next tick before the DOM updates.
    // Setting isAsync to "true" solves that problem.
    if (!isAsync) {
      return;
    }
    return new Promise(resolve => setTimeout(resolve));
  };

  const selectCheckBox = (checkboxTestSubject: string) => {
    find(checkboxTestSubject).simulate('change', { target: { checked: true } });
  };

  // It works the exact same way :)
  const toggleEuiSwitch = selectCheckBox;

  /**
   * The EUI ComboBox is a special input as we need to press the ENTER key
   * in order for the EuiComboBox to register the value
   *
   * @param {string} value The value to add to the combobox
   */
  const setComboBoxValue = (comboBoxTestSubject: string, value: string) => {
    const comboBox = find(comboBoxTestSubject);
    const formInput = findTestSubjectHelper(comboBox, 'comboBoxSearchInput');
    setInputValue(formInput, value);

    // keyCode 13 === ENTER
    comboBox.simulate('keydown', { keyCode: 13 });
    component.update();
  };

  const getErrorsMessages = () => {
    const errorMessagesWrappers = component.find('.euiFormErrorText');
    return errorMessagesWrappers.map(err => err.text());
  };

  /**
   * ----------------------------------------------------------------
   * Tables
   * ----------------------------------------------------------------
   */

  /**
   * Helper to parse an EUI table and return its rows and column reactWrapper
   *
   * @param {ReactWrapper} table enzyme react wrapper of the EuiBasicTable
   */
  const getMetaData = (tableTestSubject: string) => {
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
          value: col.find('.euiTableCellContent').text(),
        })),
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
    table: {
      getMetaData,
    },
    form: {
      setInputValue,
      selectCheckBox,
      toggleEuiSwitch,
      setComboBoxValue,
      getErrorsMessages,
    },
  };
};
