/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Store } from 'redux';
import { ReactWrapper } from 'enzyme';

export type SetupFunc<T> = (props?: any) => TestBed<T> | Promise<TestBed<T>>;

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

export interface TestBed<T = string> {
  /** The comonent under test */
  component: ReactWrapper;
  /**
   * Pass it a `data-test-subj` and it will return true if it exists or false if it does not exist.
   *
   * @param testSubject The data test subject to look for (can be a nested path. e.g. "detailPanel.mySection").
   * @param count The number of times the subject needs to appear in order to return "true"
   */
  exists: (testSubject: T, count?: number) => boolean;
  /**
   * Pass it a `data-test-subj` and it will return an Enzyme reactWrapper of the node.
   * You can target a nested test subject by separating it with a dot ('.');
   *
   * @param testSubject The data test subject to look for
   *
   * @example
   *
    ```ts
    find('nameInput');
    // or more specific,
    // "nameInput" is a child of "myForm"
    find('myForm.nameInput');
    ```
   */
  find: (testSubject: T) => ReactWrapper<any>;
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
     * @param input The form input. Can either be a data-test-subj or a reactWrapper (can be a nested path. e.g. "myForm.myInput").
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
     * @param dataTestSubject The test subject of the checkbox (can be a nested path. e.g. "myForm.mySelect").
     * @param isChecked Defines if the checkobx is active or not
     */
    selectCheckBox: (checkboxTestSubject: T, isChecked?: boolean) => void;
    /**
     * Toggle the EuiSwitch
     *
     * @param switchTestSubject The test subject of the EuiSwitch (can be a nested path. e.g. "myForm.mySwitch").
     */
    toggleEuiSwitch: (switchTestSubject: T) => void;
    /**
     * The EUI ComboBox is a special input as it needs the ENTER key to be pressed
     * in order to register the value set. This helpers automatically does that.
     *
     * @param comboBoxTestSubject The data test subject of the EuiComboBox (can be a nested path. e.g. "myForm.myComboBox").
     * @param value The value to set
     */
    setComboBoxValue: (comboBoxTestSubject: T, value: string) => void;
    /**
     * Get a list of the form error messages that are visible in the DOM.
     */
    getErrorsMessages: () => string[];
  };
  table: {
    getMetaData: (tableTestSubject: T) => EuiTableMetaData;
  };
  router: {
    /**
     * Navigate to another React router <Route />
     */
    navigateTo: (url: string) => void;
  };
}

export interface TestBedConfig {
  /** The default props to pass to the mounted component. */
  defaultProps?: Record<string, any>;
  /** Configuration object for the react-router `MemoryRouter. */
  memoryRouter?: MemoryRouterConfig;
  /** An optional redux store. You can also provide a function that returns a store. */
  store?: (() => Store) | Store | null;
  /* Mount the component asynchronously. When using "hooked" components with _useEffect()_ calls, you need to set this to "true". */
  doMountAsync?: boolean;
}

export interface MemoryRouterConfig {
  /** Flag to add or not the `MemoryRouter`. If set to `false`, there won't be any router and the component won't be wrapped on a `<Route />`. */
  wrapComponent?: boolean;
  /** The React Router **initial entries** setting ([see documentation](https://github.com/ReactTraining/react-router/blob/master/packages/react-router/docs/api/MemoryRouter.md)) */
  initialEntries?: string[];
  /** The React Router **initial index** setting ([see documentation](https://github.com/ReactTraining/react-router/blob/master/packages/react-router/docs/api/MemoryRouter.md)) */
  initialIndex?: number;
  /** The route **path** for the mounted component (defaults to `"/"`) */
  componentRoutePath?: string;
  /** A callBack that will be called with the React Router instance once mounted  */
  onRouter?: (router: any) => void;
}
