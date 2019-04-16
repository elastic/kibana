/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Store } from 'redux';

import { ComponentType, ReactWrapper } from 'enzyme';
import { findTestSubject } from '../find_test_subject';
import { mountComponent, getJSXComponentWithProps } from './mount_component';
import { TestBedOptions, TestBed, SetupFunc } from './types';

const defaultOptions = {
  memoryRouter: {
    wrapComponent: true,
  },
};

export const registerTestBed = <T extends string = string>(
  Component: ComponentType<any>,
  defaultProps: any = {},
  options: TestBedOptions = defaultOptions,
  store: Store | null = null
): SetupFunc<T> => props => {
  const component = mountComponent(Component, options, store, { ...defaultProps, ...props });

  /**
   * ----------------------------------------------------------------
   * Utils
   * ----------------------------------------------------------------
   */

  /**
   * Look for a data test subject in the component and return it.
   * It is possible to target a nested test subject by separating it with a dot ('.');
   *
   * @param testSubject The data test subject to look for
   *
   * @example
   * find('nameInput'); // if there is only 1 form, this is enough
   * find('myForm.nameInput'); // if there are multiple forms, specify the test subject of the form
   */
  const find: TestBed<T>['find'] = (testSubject: T) => {
    const testSubjectToArray = testSubject.split('.');

    return testSubjectToArray.reduce((reactWrapper, subject, i) => {
      const target = findTestSubject(reactWrapper, subject);
      if (!target.length && i < testSubjectToArray.length - 1) {
        throw new Error(`Can't access nested test subject of unknown node "${subject}"`);
      }
      return target;
    }, component);
  };

  /**
   * Look in the component if a data test subject exists, and return true or false
   *
   * @param testSubject The data test subject to look for
   * @param count The number of times the subject needs to appear
   */
  const exists: TestBed<T>['exists'] = (testSubject, count = 1) =>
    find(testSubject).length === count;

  /**
   * Update the props of the mounted component
   *
   * @param updatedProps The updated prop object
   */
  const setProps: TestBed<T>['setProps'] = updatedProps => {
    if (options.memoryRouter.wrapComponent !== false) {
      throw new Error(
        'setProps() can only be called on a component **not** wrapped by a router route.'
      );
    }
    if (store === null) {
      return component.setProps({ ...defaultProps, ...updatedProps });
    }
    // Update the props on the Redux Provider children
    return component.setProps({
      children: getJSXComponentWithProps(Component, { ...defaultProps, ...updatedProps }),
    });
  };

  /**
   * ----------------------------------------------------------------
   * Forms
   * ----------------------------------------------------------------
   */

  /**
   * Set the value of a form text input.
   *
   * In some cases, changing an input value triggers an HTTP request to validate
   * the field. Even if we return immediately the response on the mock server we
   * still need to wait until the next tick before the DOM updates.
   * Setting isAsync to "true" takes care of that.
   *
   * @param input The form input. Can either be a data-test-subj or a reactWrapper
   * @param value The value to set
   * @param isAsync If set to true will return a Promise that resolves on the next "tick"
   */
  const setInputValue: TestBed<T>['form']['setInputValue'] = (input, value, isAsync = false) => {
    const formInput = typeof input === 'string' ? find(input) : (input as ReactWrapper);

    formInput.simulate('change', { target: { value } });
    component.update();

    if (!isAsync) {
      return;
    }
    return new Promise(resolve => setTimeout(resolve));
  };

  /**
   * Select or unselect a form checkbox.
   *
   * @param dataTestSubject The test subject of the checkbox
   * @param isChecked Defines if the checkobx is active or not
   */
  const selectCheckBox: TestBed<T>['form']['selectCheckBox'] = (
    dataTestSubject,
    isChecked = true
  ) => {
    find(dataTestSubject).simulate('change', { target: { checked: isChecked } });
  };

  /**
   * Toggle the EuiSwitch
   */
  const toggleEuiSwitch: TestBed<T>['form']['toggleEuiSwitch'] = selectCheckBox; // Same API as "selectCheckBox"

  /**
   * The EUI ComboBox is a special input as it needs the ENTER key to be pressed
   * in order to register the value set. This helpers automatically does that.
   *
   * @param comboBoxTestSubject The data test subject of the EuiComboBox
   * @param value The value to set
   */
  const setComboBoxValue: TestBed<T>['form']['setComboBoxValue'] = (comboBoxTestSubject, value) => {
    const comboBox = find(comboBoxTestSubject);
    const formInput = findTestSubject(comboBox, 'comboBoxSearchInput');
    setInputValue(formInput, value);

    // keyCode 13 === ENTER
    comboBox.simulate('keydown', { keyCode: 13 });
    component.update();
  };

  /**
   * Get a list of the form error messages that are visible in the DOM of the component
   */
  const getErrorsMessages: TestBed<T>['form']['getErrorsMessages'] = () => {
    const errorMessagesWrappers = component.find('.euiFormErrorText');
    return errorMessagesWrappers.map(err => err.text());
  };

  /**
   * ----------------------------------------------------------------
   * Tables
   * ----------------------------------------------------------------
   */

  /**
   * Parse an EUI table and return meta data information about its rows and colum content
   *
   * @param tableTestSubject The data test subject of the EUI table
   */
  const getMetaData: TestBed<T>['table']['getMetaData'] = tableTestSubject => {
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
