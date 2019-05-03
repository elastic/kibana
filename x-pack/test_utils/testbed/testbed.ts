/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ComponentType, ReactWrapper } from 'enzyme';
import { findTestSubject } from '../find_test_subject';
import { reactRouterMock } from '../router_helpers';
import { mountComponent, getJSXComponentWithProps } from './mount_component';
import { TestBedConfig, TestBedOptions, TestBed, SetupFunc } from './types';

const defaultOptions: TestBedOptions = {
  memoryRouter: {
    wrapComponent: true,
  },
};

/**
 * Register a new test bed to test a React Component.
 *
 * @param Component The component under test
 * @param defaultProps The default props to pass to the component on each mount
 * @param options An optional TestBedOptions object
 * @param store An optional Redux store. It accepts a store or a function that returns a store
 *
 * @example
 *
 * const setup = registerTestBed(MyComponent, {}, undefined, myReduxStore);
 * const { component } = setup(); // component is an Enzyme reactWrapper mounted and ready to be tested
 */
export const registerTestBed = <T extends string = string>(
  Component: ComponentType<any>,
  config?: TestBedConfig
): SetupFunc<T> => {
  const { defaultProps = {}, options = defaultOptions, store = null } = config || {};
  /**
   * In some cases, component have some logic that interacts with the react router
   * _before_ the component is mounted.(Class constructor() I'm looking at you :)
   *
   * By adding the following lines, we make sure there is always a router available
   * when instantiating the Component.
   */
  if (options.memoryRouter.onRouter) {
    options.memoryRouter.onRouter(reactRouterMock);
  }

  const setup: SetupFunc<T> = props => {
    // If a function was provided to create the store, execute it
    const storeToMount = typeof store === 'function' ? store() : store;

    const component = mountComponent(Component, options, storeToMount, {
      ...defaultProps,
      ...props,
    });

    /**
     * ----------------------------------------------------------------
     * Utils
     * ----------------------------------------------------------------
     */

    const find: TestBed<T>['find'] = (testSubject: T) => {
      const testSubjectToArray = testSubject.split('.');

      return testSubjectToArray.reduce((reactWrapper, subject, i) => {
        const target = findTestSubject(reactWrapper, subject);
        if (!target.length && i < testSubjectToArray.length - 1) {
          throw new Error(
            `Can't access nested test subject "${
              testSubjectToArray[i + 1]
            }" of unknown node "${subject}"`
          );
        }
        return target;
      }, component);
    };

    const exists: TestBed<T>['exists'] = (testSubject, count = 1) =>
      find(testSubject).length === count;

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

    const setInputValue: TestBed<T>['form']['setInputValue'] = (input, value, isAsync = false) => {
      const formInput = typeof input === 'string' ? find(input) : (input as ReactWrapper);

      formInput.simulate('change', { target: { value } });
      component.update();

      if (!isAsync) {
        return;
      }
      return new Promise(resolve => setTimeout(resolve));
    };

    const selectCheckBox: TestBed<T>['form']['selectCheckBox'] = (
      dataTestSubject,
      isChecked = true
    ) => {
      find(dataTestSubject).simulate('change', { target: { checked: isChecked } });
    };

    const toggleEuiSwitch: TestBed<T>['form']['toggleEuiSwitch'] = selectCheckBox; // Same API as "selectCheckBox"

    const setComboBoxValue: TestBed<T>['form']['setComboBoxValue'] = (
      comboBoxTestSubject,
      value
    ) => {
      const comboBox = find(comboBoxTestSubject);
      const formInput = findTestSubject(comboBox, 'comboBoxSearchInput');
      setInputValue(formInput, value);

      // keyCode 13 === ENTER
      comboBox.simulate('keydown', { keyCode: 13 });
      component.update();
    };

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

  return setup;
};
