/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Store } from 'redux';
import { ReactWrapper } from 'enzyme';

export type SetupFunc<T> = (props?: any) => TestBed<T>;

export interface EuiTableMetaData {
  /** Array of rows of the table. Each row exposes its reactWrapper and its columns */
  rows: Array<{
    reactWrapper: ReactWrapper;
    columns: Array<{
      reactWrapper: ReactWrapper;
      value: string;
    }>;
  }>;
  /** A 2 dimensional array of rows & columns containing
   * the text content of each cell of the table */
  tableCellsValues: string[][];
}

export interface TestBed<T> {
  /** The comonent under test */
  component: ReactWrapper;
  /**
   * Look in the component if a data test subject exists, and return true or false
   *
   * @param testSubject The data test subject to look for
   * @param count The number of times the subject needs to appear in order to return "true"
   */
  exists: (testSubject: T, count?: number) => boolean;
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
  find: (testSubject: T) => ReactWrapper;
  /**
   * Update the props of the mounted component
   *
   * @param updatedProps The updated prop object
   */
  setProps: (updatedProps: any) => void;
  form: {
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
    setInputValue: (
      input: T | ReactWrapper,
      value: string,
      isAsync?: boolean
    ) => Promise<void> | void;
    /**
     * Select or unselect a form checkbox.
     *
     * @param dataTestSubject The test subject of the checkbox
     * @param isChecked Defines if the checkobx is active or not
     */
    selectCheckBox: (checkboxTestSubject: T, isChecked?: boolean) => void;
    /**
     * Toggle the EuiSwitch
     *
     * @param switchTestSubject The test subject of the EuiSwitch
     */
    toggleEuiSwitch: (switchTestSubject: T) => void;
    /**
     * The EUI ComboBox is a special input as it needs the ENTER key to be pressed
     * in order to register the value set. This helpers automatically does that.
     *
     * @param comboBoxTestSubject The data test subject of the EuiComboBox
     * @param value The value to set
     */
    setComboBoxValue: (comboBoxTestSubject: T, value: string) => void;
    /**
     * Get a list of the form error messages that are visible in the DOM of the component
     */
    getErrorsMessages: () => string[];
  };
  table: {
    getMetaData: (tableTestSubject: T) => EuiTableMetaData;
  };
}

export interface TestBedConfig {
  defaultProps: Record<string, any>;
  options: TestBedOptions;
  store: (() => Store) | Store | null;
}

export interface TestBedOptions {
  memoryRouter: {
    wrapComponent: boolean;
    initialEntries?: string[];
    initialIndex?: number;
    componentRoutePath?: string;
    onRouter?: (router: any) => void;
  };
}
